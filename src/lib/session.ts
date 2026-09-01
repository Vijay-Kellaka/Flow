import { auth } from "./auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

export async function requireUser() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/login");
  return user;
}
