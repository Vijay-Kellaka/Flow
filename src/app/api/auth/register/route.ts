import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/mail";

const schema = z.object({ name: z.string().min(1).max(80), email: z.string().email(), password: z.string().min(8).max(128) });
export async function POST(req:Request){
  const parsed = schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"Please check your name, email and password (8+ characters)."},{status:400});
  const body = parsed.data;
  const email=body.email.trim().toLowerCase();
  const exists=await prisma.user.findUnique({where:{email}});
  if(exists)return NextResponse.json({error:"An account already exists for this email."},{status:409});
  const hash=await bcrypt.hash(body.password,12);
  const user=await prisma.user.create({data:{name:body.name,email,passwordHash:hash,emailVerified:null}});
  const token=randomBytes(32).toString("hex");
  await prisma.verificationToken.create({data:{identifier:email,token,expires:new Date(Date.now()+1000*60*30)}});

  // The account is already usable for login at this point (Credentials.authorize
  // does not require emailVerified). Don't let a broken SMTP config turn a
  // successful signup into a 500 — just tell the user their email step failed.
  let emailSent = true;
  try {
    await sendVerificationEmail(email,token,"account");
  } catch (error) {
    emailSent = false;
    console.error("[register] verification email failed:", error);
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    emailSent,
    message: emailSent
      ? "Check your email to verify your Flow account."
      : "Account created. We couldn't send the verification email right now, but you can sign in with your email and password already.",
  });
}
