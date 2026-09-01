import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/mail";
import { cacheRateLimit } from "@/lib/cache";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const session = await auth();
  const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? "";
  const requestedEmail = body.email?.trim().toLowerCase() ?? "";
  const email = requestedEmail || sessionEmail;

  if (!email) {
    return NextResponse.json({ error: "Enter the email used for your Flow account." }, { status: 400 });
  }

  const allowed = await cacheRateLimit(`journal-recovery:${email}`, 3, 15 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many recovery requests. Try again later." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  // Avoid revealing whether an email is registered. If the account exists,
  // create a short-lived verification token and send it to that mailbox.
  if (!user) {
    return NextResponse.json({ ok: true, message: "If an account uses that email, a verification link has been sent. Check Inbox, Spam, or Promotions." });
  }

  await prisma.verificationToken.deleteMany({ where: { identifier: `journal:${email}` } });
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: `journal:${email}`, token, expires: new Date(Date.now() + 15 * 60 * 1000) },
  });

  try {
    await sendVerificationEmail(email, token, "journal");
  } catch (error) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    console.error("[journal recovery] email delivery failed", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "We could not send the recovery email. Check the SMTP settings and try again." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, message: "If an account uses that email, a verification link has been sent. Check Inbox, Spam, or Promotions." });
}
