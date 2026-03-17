import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { Adapter } from "next-auth/adapters";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Invalid username or password.");
        }
        const login = credentials.username.trim();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: login },
              { email: login },
            ],
          },
          include: { agency: true },
        });
        if (!user || !user.password) {
          throw new Error("Invalid username or password.");
        }
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) {
          throw new Error("Invalid username or password.");
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.username ?? user.email,
          image: user.avatarUrl,
          role: user.role,
          agencyId: user.agencyId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.agencyId = (user as { agencyId?: string }).agencyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { agencyId?: string }).agencyId = token.agencyId as string;
      }
      return session;
    },
  },
};
