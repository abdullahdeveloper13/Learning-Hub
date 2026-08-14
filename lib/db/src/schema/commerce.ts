import { pgTable, serial, text, integer, timestamp, real, pgEnum, json, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { coursesTable } from "./courses";

export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "failed", "cancelled", "refunded"]);
export const paymentProviderEnum = pgEnum("payment_provider", ["stripe", "manual"]);
export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed"]);

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: real("discount_value").notNull(),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  status: orderStatusEnum("status").notNull().default("pending"),
  subtotal: real("subtotal").notNull().default(0),
  discountTotal: real("discount_total").notNull().default(0),
  total: real("total").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  couponId: integer("coupon_id").references(() => couponsTable.id),
  provider: paymentProviderEnum("provider").notNull().default("stripe"),
  providerSessionId: text("provider_session_id"),
  providerPaymentIntentId: text("provider_payment_intent_id"),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id),
  title: text("title").notNull(),
  price: real("price").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.orderId, t.courseId)]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  provider: paymentProviderEnum("provider").notNull(),
  status: orderStatusEnum("status").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  providerPaymentId: text("provider_payment_id"),
  rawEvent: json("raw_event").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const couponRedemptionsTable = pgTable("coupon_redemptions", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => couponsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
}, (t) => [unique().on(t.couponId, t.userId)]);

export const refundsTable = pgTable("refunds", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  amount: real("amount").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  providerRefundId: text("provider_refund_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

