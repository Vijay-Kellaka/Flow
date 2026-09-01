import { auth } from "./auth";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  return prisma.user.findUnique({ where: { email } });
}
