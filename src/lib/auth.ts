import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verifySync } from "otplib";
import { db } from "@/lib/db";
import { audit, isLoginRateLimited, recordLoginAttempt } from "@/lib/security";
import type { UserRoleType } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: UserRoleType;
    } & DefaultSession["user"];
  }
  interface User {
    username?: string;
    role?: UserRoleType;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h session expiration
  pages: { signIn: "/administracija" },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or username" },
        password: { label: "Password", type: "password" },
        totp: { label: "2FA code", type: "text" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!identifier || !password) return null;

        if (await isLoginRateLimited(identifier)) {
          await recordLoginAttempt(identifier, false, "rate_limited");
          return null;
        }

        const user = await db.user.findFirst({
          where: {
            OR: [{ email: identifier }, { username: identifier }],
            isActive: true,
            deletedAt: null,
          },
        });
        if (!user) {
          await recordLoginAttempt(identifier, false, "unknown_user");
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await recordLoginAttempt(identifier, false, "wrong_password");
          await audit({ userId: user.id, action: "FAILED_LOGIN" });
          return null;
        }

        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const totp = String(credentials?.totp ?? "").replace(/\s/g, "");
          const totpValid =
            totp.length > 0 &&
            verifySync({ token: totp, secret: user.twoFactorSecret }).valid;
          if (!totpValid) {
            await recordLoginAttempt(identifier, false, "invalid_2fa");
            return null;
          }
        }

        await recordLoginAttempt(identifier, true);
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        const role = await db.role.findUnique({ where: { id: user.roleId } });
        await audit({ userId: user.id, action: "LOGIN" });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          username: user.username,
          role: role?.type ?? "VIEWER",
        };
      },
    }),
  ],
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const userId = token?.id;
      if (typeof userId === "string") {
        await audit({ userId, action: "LOGOUT" });
      }
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as UserRoleType;
      }
      return session;
    },
  },
});

/** Fetch current session or throw — for server actions that require auth. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}
