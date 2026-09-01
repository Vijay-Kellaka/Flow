import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { cacheDelete, cacheGet, cacheSet } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache-keys";
import { logActivity } from "@/lib/activity";

const iso = z.string().refine(value => !Number.isNaN(new Date(value).getTime()), "Invalid date");
const schema = z.object({ title: z.string().trim().min(1).max(160), dueDate: iso.nullable().optional(), priority: z.coerce.number().int().min(0).max(3).default(0) });
async function uid(){const s=await auth();const e=s?.user?.email?.toLowerCase();if(!e)return null;const u=await prisma.user.findUnique({where:{email:e},select:{id:true}});return u?.id??null;}

// Tasks reset every day: a task completed on a previous day flips back to
// open the first time it's fetched after midnight. Goals are long-term and
// are never touched here.
function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d;}

export async function GET(){
  const id=await uid();if(!id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const k=cacheKeys.tasks(id);const c=await cacheGet(k);if(c)return NextResponse.json(c);
  const today=startOfToday();
  const stale=await prisma.task.findMany({where:{userId:id,completed:true,completedAt:{lt:today}},select:{id:true}});
  if(stale.length){await prisma.task.updateMany({where:{id:{in:stale.map(t=>t.id)}},data:{completed:false,completedAt:null}});}
  const rows=await prisma.task.findMany({where:{userId:id},orderBy:[{completed:"asc"},{dueDate:"asc"},{priority:"desc"}]});
  await cacheSet(k,rows,45);return NextResponse.json(rows);
}

export async function POST(req:Request){
  const id=await uid();if(!id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:"Invalid task"},{status:400});
  const task=await prisma.task.create({data:{userId:id,title:p.data.title,priority:p.data.priority,dueDate:p.data.dueDate ? new Date(p.data.dueDate) : undefined}});
  await cacheDelete(cacheKeys.tasks(id));await cacheDelete(cacheKeys.dashboard(id));await logActivity(id,"TASK_CREATED",`Created task · ${task.title}`);return NextResponse.json(task,{status:201});
}

export async function PATCH(req:Request){
  const id=await uid();if(!id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const raw=await req.json();
  const parsed=z.object({id:z.string(),completed:z.boolean().optional(),title:z.string().trim().min(1).max(160).optional(),priority:z.number().int().min(0).max(3).optional(),dueDate:iso.nullable().optional()}).safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:"Invalid task update"},{status:400});
  const body=parsed.data;
  const result=await prisma.task.updateMany({where:{id:body.id,userId:id},data:{...(typeof body.completed==="boolean"?{completed:body.completed,completedAt:body.completed?new Date():null}:{}),...(body.title!==undefined?{title:body.title}:{}),...(typeof body.priority==="number"?{priority:body.priority}:{}),...(body.dueDate!==undefined?{dueDate:body.dueDate?new Date(body.dueDate):null}:{})}});
  if(!result.count)return NextResponse.json({error:"Task not found"},{status:404});
  await cacheDelete(cacheKeys.tasks(id));await cacheDelete(cacheKeys.dashboard(id));return NextResponse.json({ok:true});
}

export async function DELETE(req:Request){
  const id=await uid();if(!id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const taskId=new URL(req.url).searchParams.get("id");if(!taskId)return NextResponse.json({error:"Missing id"},{status:400});
  const result=await prisma.task.deleteMany({where:{id:taskId,userId:id}});if(!result.count)return NextResponse.json({error:"Task not found"},{status:404});
  await cacheDelete(cacheKeys.tasks(id));await cacheDelete(cacheKeys.dashboard(id));return NextResponse.json({ok:true});
}
