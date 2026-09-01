import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cacheDelete, cacheGet, cacheSet } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache-keys";
import { logActivity } from "@/lib/activity";
const schema=z.object({title:z.string().min(1).max(200),url:z.string().trim().optional().transform(v=>v?(/^https?:\/\//i.test(v)?v:`https://${v}`):""),tags:z.array(z.string().max(40)).max(15).default([])});
async function userId(){const s=await auth();const email=s?.user?.email?.toLowerCase();if(!email)return null;const u=await prisma.user.findUnique({where:{email},select:{id:true}});return u?.id??null;}
export async function GET(){const id=await userId();if(!id)return NextResponse.json({error:"Unauthorized"},{status:401});const key=cacheKeys.bookmarks(id);const cached=await cacheGet(key);if(cached)return NextResponse.json(cached);const rows=await prisma.bookmark.findMany({where:{userId:id},orderBy:{createdAt:"desc"},take:100});await cacheSet(key,rows,120);return NextResponse.json(rows);}
export async function POST(req:Request){const id=await userId();if(!id)return NextResponse.json({error:"Unauthorized"},{status:401});const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"Invalid bookmark"},{status:400});const row=await prisma.bookmark.create({data:{userId:id,...parsed.data}});await cacheDelete(cacheKeys.bookmarks(id));await logActivity(id,"BOOKMARK_CREATED",`Saved bookmark · ${row.title}`);return NextResponse.json(row,{status:201});}
export async function DELETE(req:Request){const id=await userId();if(!id)return NextResponse.json({error:"Unauthorized"},{status:401});const item=new URL(req.url).searchParams.get("id");if(!item)return NextResponse.json({error:"Missing id"},{status:400});await prisma.bookmark.deleteMany({where:{id:item,userId:id}});await cacheDelete(cacheKeys.bookmarks(id));return NextResponse.json({ok:true});}
