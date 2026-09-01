import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const googleClientId = process.env.AUTH_GOOGLE_ID?.trim();
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();

const providers = [
  Credentials({
    name: "Email",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash || !user.emailVerified) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      return ok ? { id: user.id, email: user.email, name: user.name, image: user.image } : null;
    },
  }),
  ...(googleClientId && googleClientSecret
    ? [Google({ clientId: googleClientId, clientSecret: googleClientSecret })]
    : []),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  providers,
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        await prisma.user.upsert({
          where: { email: user.email.toLowerCase() },
          create: { email: user.email.toLowerCase(), name: user.name, image: user.image, emailVerified: new Date() },
          update: { name: user.name ?? undefined, image: user.image ?? undefined, emailVerified: new Date() },
        });
      }
      return true;
    },
    async jwt({ token }) {
      if (token.email && !token.sub) {
        const user = await prisma.user.findUnique({ where: { email: token.email.toLowerCase() } });
        if (user) token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        const user = await prisma.user.findUnique({ where: { email: token.email.toLowerCase() }, select: { id: true, email: true, name: true, image: true } });
        if (user) Object.assign(session.user, user);
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
