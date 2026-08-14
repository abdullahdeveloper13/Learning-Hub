import { Router } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { authTokensTable, usersTable } from "@workspace/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";
import { supabaseRest } from "../lib/supabaseRest";
import { emailService } from "../lib/email";
import { rateLimit } from "../middlewares/rateLimit";

const router = Router();
const devAuthUsers = new Map<string, {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: "student" | "instructor" | "admin";
  avatarUrl: string | null;
  bio: string | null;
  emailVerifiedAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>();

function safeUser(user: {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: "student" | "instructor" | "admin";
  avatarUrl: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

function userFromRest(row: any) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : null,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function publicBaseUrl() {
  return (process.env["PUBLIC_APP_URL"] || process.env["APP_URL"] || "http://localhost:5173").replace(/\/$/, "");
}

function apiBaseUrl() {
  return (process.env["API_PUBLIC_URL"] || process.env["VITE_API_URL"] || "http://localhost:3000").replace(/\/$/, "");
}

function createToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function issueAuthToken(userId: number, purpose: "password_reset" | "email_verification", minutes: number) {
  const { token, tokenHash } = createToken();
  const expiresAt = new Date(Date.now() + minutes * 60_000);
  await db.delete(authTokensTable).where(and(eq(authTokensTable.userId, userId), eq(authTokensTable.purpose, purpose))).catch(() => {});
  await db.insert(authTokensTable).values({ userId, purpose, tokenHash, expiresAt }).catch(() => {});
  return token;
}

async function verifyAuthToken(token: string, purpose: "password_reset" | "email_verification") {
  const tokenHash = hashToken(token);
  const [row] = await db.select().from(authTokensTable)
    .where(and(
      eq(authTokensTable.tokenHash, tokenHash),
      eq(authTokensTable.purpose, purpose),
      gt(authTokensTable.expiresAt, new Date()),
      isNull(authTokensTable.usedAt),
    ))
    .limit(1);
  return row ?? null;
}

async function markTokenUsed(tokenHash: string) {
  await db.update(authTokensTable).set({ usedAt: new Date() }).where(eq(authTokensTable.tokenHash, tokenHash));
}

router.post("/auth/register", rateLimit({ keyPrefix: "auth-register", windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  try {
    const { email, password, name, role = "student" } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password, and name are required" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedEmail = String(email).toLowerCase();
    const [user] = await db.insert(usersTable).values({ email: normalizedEmail, passwordHash, name, role: role as "student" | "instructor" }).returning();
    const verificationToken = await issueAuthToken(user.id, "email_verification", 24 * 60);
    await emailService.sendVerificationEmail(user.email, user.name, `${publicBaseUrl()}/verify-email?token=${verificationToken}`).catch((emailError) => req.log.warn({ err: emailError }, "Verification email not delivered"));
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ user: safeUser, token });
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      const { email, password, name, role = "student" } = req.body;
      const normalizedEmail = String(email).toLowerCase();
      const rest = supabaseRest();
      const existingRow = await rest.selectOne("users", { email: normalizedEmail });
      const existing = existingRow ? userFromRest(existingRow) : devAuthUsers.get(normalizedEmail);
      if (existing) {
        res.status(400).json({ error: "Email already in use" });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const inserted = await rest.insertOne("users", {
        email: normalizedEmail,
        name,
        password_hash: passwordHash,
        role,
        is_active: true,
      });
      const user = userFromRest(inserted);
      devAuthUsers.set(normalizedEmail, user);
      const token = signToken({ id: user.id, email: user.email, role: user.role });
      res.status(201).json({ user: safeUser(user), token });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", rateLimit({ keyPrefix: "auth-login", windowMs: 15 * 60_000, max: 20 }), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, String(email).toLowerCase())).limit(1);
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      const { email, password } = req.body;
      const normalizedEmail = String(email).toLowerCase();
      const existingRow = await supabaseRest().selectOne("users", { email: normalizedEmail });
      const user = existingRow ? userFromRest(existingRow) : devAuthUsers.get(normalizedEmail);
      if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const token = signToken({ id: user.id, email: user.email, role: user.role });
      res.json({ user: safeUser(user), token });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

router.post("/auth/forgot-password", rateLimit({ keyPrefix: "auth-forgot-password", windowMs: 15 * 60_000, max: 5 }), async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase();
    if (!email) { res.status(400).json({ error: "email is required" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (user) {
      const resetToken = await issueAuthToken(user.id, "password_reset", 60);
      await emailService.sendPasswordResetEmail(user.email, user.name, `${publicBaseUrl()}/reset-password?token=${resetToken}`)
        .catch((emailError) => req.log.warn({ err: emailError }, "Password reset email not delivered"));
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/reset-password", rateLimit({ keyPrefix: "auth-reset-password", windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");
    if (!token || password.length < 8) { res.status(400).json({ error: "Valid token and password with at least 8 characters are required" }); return; }
    const authToken = await verifyAuthToken(token, "password_reset");
    if (!authToken) { res.status(400).json({ error: "Invalid or expired reset token" }); return; }
    await db.update(usersTable).set({ passwordHash: await bcrypt.hash(password, 10), updatedAt: new Date() }).where(eq(usersTable.id, authToken.userId));
    await markTokenUsed(authToken.tokenHash);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/verify-email", rateLimit({ keyPrefix: "auth-verify-email", windowMs: 15 * 60_000, max: 20 }), async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const authToken = await verifyAuthToken(token, "email_verification");
    if (!authToken) { res.status(400).json({ error: "Invalid or expired verification token" }); return; }
    await db.update(usersTable).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(usersTable.id, authToken.userId));
    await markTokenUsed(authToken.tokenHash);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/resend-verification", requireAuth, rateLimit({ keyPrefix: "auth-resend-verification", windowMs: 15 * 60_000, max: 5 }), async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.emailVerifiedAt) { res.json({ success: true, alreadyVerified: true }); return; }
    const verificationToken = await issueAuthToken(user.id, "email_verification", 24 * 60);
    await emailService.sendVerificationEmail(user.email, user.name, `${publicBaseUrl()}/verify-email?token=${verificationToken}`)
      .catch((emailError) => req.log.warn({ err: emailError }, "Verification email not delivered"));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/oauth/:provider/start", rateLimit({ keyPrefix: "auth-oauth-start", windowMs: 15 * 60_000, max: 20 }), (req, res) => {
  const provider = String(req.params["provider"]);
  const config = getOAuthConfig(provider);
  if (!config) { res.status(404).json({ error: "Unsupported OAuth provider" }); return; }
  if (!config.clientId || !config.clientSecret) {
    res.status(503).json({ error: `${provider} OAuth is not configured`, requiredEnv: config.requiredEnv });
    return;
  }
  const state = randomBytes(16).toString("hex");
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", `${apiBaseUrl()}/api/auth/oauth/${provider}/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});

router.get("/auth/oauth/:provider/callback", async (req, res) => {
  try {
    const provider = String(req.params["provider"]);
    const config = getOAuthConfig(provider);
    if (!config?.clientId || !config.clientSecret) { res.status(503).json({ error: "OAuth provider is not configured" }); return; }
    const code = String(req.query["code"] || "");
    if (!code) { res.status(400).json({ error: "Missing OAuth code" }); return; }
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: `${apiBaseUrl()}/api/auth/oauth/${provider}/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokenPayload = await tokenResponse.json() as { access_token?: string };
    if (!tokenPayload.access_token) { res.status(400).json({ error: "OAuth token exchange failed" }); return; }
    const profile = await config.fetchProfile(tokenPayload.access_token);
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, profile.email)).limit(1);
    const user = existing ?? (await db.insert(usersTable).values({
      email: profile.email,
      name: profile.name,
      passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
      role: "student",
      avatarUrl: profile.avatarUrl,
      emailVerifiedAt: new Date(),
    }).returning())[0];
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.redirect(`${publicBaseUrl()}/login?token=${encodeURIComponent(token)}`);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "OAuth login failed" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      const existingRow = await supabaseRest().selectOne("users", { id: req.user!.id });
      const user = existingRow ? userFromRest(existingRow) : devAuthUsers.get(req.user!.email.toLowerCase());
      if (user) {
        res.json(safeUser(user));
        return;
      }
      res.status(dbError.status).json(dbError.body);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

function getOAuthConfig(provider: string) {
  if (provider === "google") {
    return {
      clientId: process.env["GOOGLE_CLIENT_ID"],
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
      requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "API_PUBLIC_URL", "PUBLIC_APP_URL"],
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      async fetchProfile(accessToken: string) {
        const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profile = await response.json() as { email: string; name?: string; picture?: string };
        return { email: profile.email.toLowerCase(), name: profile.name || profile.email, avatarUrl: profile.picture ?? null };
      },
    };
  }
  if (provider === "github") {
    return {
      clientId: process.env["GITHUB_CLIENT_ID"],
      clientSecret: process.env["GITHUB_CLIENT_SECRET"],
      requiredEnv: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "API_PUBLIC_URL", "PUBLIC_APP_URL"],
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scope: "read:user user:email",
      async fetchProfile(accessToken: string) {
        const headers = { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" };
        const [profileResponse, emailsResponse] = await Promise.all([
          fetch("https://api.github.com/user", { headers }),
          fetch("https://api.github.com/user/emails", { headers }),
        ]);
        const profile = await profileResponse.json() as { name?: string; login?: string; avatar_url?: string };
        const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
        const email = emails.find(e => e.primary && e.verified)?.email || emails.find(e => e.verified)?.email;
        if (!email) throw new Error("GitHub account has no verified email");
        return { email: email.toLowerCase(), name: profile.name || profile.login || email, avatarUrl: profile.avatar_url ?? null };
      },
    };
  }
  return null;
}
