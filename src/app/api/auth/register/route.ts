import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/mail";

const schema = z.object({ name: z.string().min(1).max(80), email: z.string().email(), password: z.string().min(8).max(128) });
export async function POST(req:Request){
  const body=schema.parse(await req.json());
  const email=body.email.trim().toLowerCase();
  const exists=await prisma.user.findUnique({where:{email}});
  if(exists)return NextResponse.json({error:"An account already exists for this email."},{status:409});
  const hash=await bcrypt.hash(body.password,12);
  const user=await prisma.user.create({data:{name:body.name,email,passwordHash:hash,emailVerified:null}});
  const token=randomBytes(32).toString("hex");
  await prisma.verificationToken.create({data:{identifier:email,token,expires:new Date(Date.now()+1000*60*30)}});
  await sendVerificationEmail(email,token,"account");
  return NextResponse.json({ok:true,userId:user.id});
}
