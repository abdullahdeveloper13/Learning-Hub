import { pgTable, serial, text, integer, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const authTokenPurposeEnum = pgEnum("auth_token_purpose", ["password_reset", "email_verification"]);

export const authTokensTable = pgTable("auth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  purpose: authTokenPurposeEnum("purpose").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.purpose)]);

export type AuthToken = typeof authTokensTable.$inferSelect;
