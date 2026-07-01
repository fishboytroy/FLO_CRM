import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login"
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: { include: { organization: true }, orderBy: { createdAt: "asc" }, take: 1 } }
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const membership = user.memberships[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: membership?.organizationId,
          organizationRole: membership?.role
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as typeof user & { role?: string }).role;
        token.organizationId = (user as typeof user & { organizationId?: string }).organizationId;
        token.organizationRole = (user as typeof user & { organizationRole?: string }).organizationRole;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = String(token.role ?? "agent");
        session.user.organizationId = typeof token.organizationId === "string" ? token.organizationId : "";
        session.user.organizationRole = typeof token.organizationRole === "string" ? token.organizationRole : "";
      }
      return session;
    }
  }
});
