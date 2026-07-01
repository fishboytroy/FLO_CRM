import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      organizationId: string;
      organizationRole: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    organizationId?: string;
    organizationRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    organizationId?: string;
    organizationRole?: string;
  }
}
