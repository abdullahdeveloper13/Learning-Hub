import { pgTable, serial, text, integer, timestamp, pgEnum, json } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "dismissed"]);
export const reportTargetEnum = pgEnum("report_target", ["user", "course", "review", "discussion", "comment"]);

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => usersTable.id),
  targetType: reportTargetEnum("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: reportStatusEnum("status").notNull().default("open"),
  resolvedBy: integer("resolved_by").references(() => usersTable.id),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: json("value").$type<Record<string, unknown>>().notNull().default({}),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

