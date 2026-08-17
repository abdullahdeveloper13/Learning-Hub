import { Router, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  couponsTable,
  couponRedemptionsTable,
  coursesTable,
  enrollmentsTable,
  notificationsTable,
  orderItemsTable,
  ordersTable,
  paymentsTable,
  refundsTable,
} from "@workspace/db";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { rateLimit } from "../middlewares/rateLimit";
import { databaseErrorResponse } from "../lib/httpErrors";
import { logger } from "../lib/logger";
import { supabaseRest } from "../lib/supabaseRest";

const router = Router();

const checkoutInput = z.object({
  courseId: z.coerce.number().int().positive(),
  couponCode: z.string().trim().optional(),
});

router.post("/payments/checkout", requireAuth, rateLimit({ keyPrefix: "payments-checkout", windowMs: 15 * 60_000, max: 20 }), async (req, res) => {
  try {
    const parsed = checkoutInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid checkout request", issues: parsed.error.issues }); return; }
    const { courseId, couponCode } = parsed.data;
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course || !course.isPublished) { res.status(404).json({ error: "Course not found" }); return; }

    const existingEnrollment = await db.select().from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, req.user!.id), eq(enrollmentsTable.courseId, courseId))).limit(1);
    if (existingEnrollment.length) { res.status(409).json({ error: "Already enrolled" }); return; }

    if (course.price <= 0) {
      const [enrollment] = await db.insert(enrollmentsTable).values({ userId: req.user!.id, courseId }).returning();
      res.status(201).json({ free: true, enrollment });
      return;
    }

    const coupon = couponCode ? await resolveCoupon(couponCode, req.user!.id) : null;
    if (couponCode && !coupon) { res.status(400).json({ error: "Coupon is invalid, expired, inactive, or already used" }); return; }
    const discountTotal = coupon ? calculateDiscount(course.price, coupon.discountType, coupon.discountValue) : 0;
    const total = Math.max(0, roundMoney(course.price - discountTotal));

    const [order] = await db.insert(ordersTable).values({
      userId: req.user!.id,
      subtotal: course.price,
      discountTotal,
      total,
      couponId: coupon?.id,
      provider: "stripe",
      status: total === 0 ? "paid" : "pending",
    }).returning();
    await db.insert(orderItemsTable).values({ orderId: order.id, courseId, title: course.title, price: course.price });

    if (total === 0) {
      await completePaidOrder(order.id);
      res.status(201).json({ orderId: order.id, freeWithCoupon: true, status: "paid" });
      return;
    }

    if (!stripeSecretKey()) {
      res.status(503).json({
        error: "Payment provider is not configured",
        code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
        requiredEnv: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PUBLIC_APP_URL"],
        orderId: order.id,
      });
      return;
    }

    const session = await createStripeCheckoutSession(order.id, course.title, total);
    await db.update(ordersTable).set({ providerSessionId: session.id, updatedAt: new Date() }).where(eq(ordersTable.id, order.id));
    res.status(201).json({ orderId: order.id, checkoutUrl: session.url, status: "pending" });
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      await handleRestCheckout(req, res, dbError);
      return;
    }
    if (err instanceof StripeCheckoutError) {
      res.status(err.status).json({
        error: err.safeMessage,
        code: "STRIPE_CHECKOUT_FAILED",
      });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

const verifyInput = z.object({
  orderId: z.coerce.number().int().positive(),
});

router.post("/payments/verify", requireAuth, rateLimit({ keyPrefix: "payments-verify", windowMs: 60_000, max: 30 }), async (req, res) => {
  try {
    const parsed = verifyInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid verify request", issues: parsed.error.issues });
      return;
    }
    const { orderId } = parsed.data;
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order || order.userId !== req.user!.id) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (order.status === "paid") {
      res.json({ status: "paid", order });
      return;
    }
    if (order.status !== "pending" || !order.providerSessionId) {
      res.json({ status: order.status, order });
      return;
    }

    if (!stripeSecretKey()) {
      res.status(503).json({
        error: "Payment provider is not configured",
        code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
        requiredEnv: ["STRIPE_SECRET_KEY"],
      });
      return;
    }

    const session = await retrieveStripeSession(order.providerSessionId);
    if (session?.payment_status === "paid") {
      await completePaidOrder(order.id, session.payment_intent ?? undefined);
      const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
      res.json({ status: "paid", order: updated });
      return;
    }
    res.json({ status: order.status, order });
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      res.status(dbError.status).json(dbError.body);
      return;
    }
    if (err instanceof StripeCheckoutError) {
      res.status(err.status).json({ error: err.safeMessage, code: "STRIPE_VERIFY_FAILED" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/payments/orders", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(ordersTable).where(eq(ordersTable.userId, req.user!.id));
    const stuck = rows.some((order) => order.status === "pending" && order.providerSessionId);
    if (stuck) {
      await reconcilePendingOrders(rows);
      const updated = await db.select().from(ordersTable).where(eq(ordersTable.userId, req.user!.id));
      res.json(updated);
      return;
    }
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      res.json([]);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/payments/orders", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const rows = await db.select().from(ordersTable);
    const stuck = rows.filter((order) => order.status === "pending" && order.providerSessionId).slice(0, 20);
    if (stuck.length) {
      await reconcilePendingOrders(stuck);
      res.json(await db.select().from(ordersTable));
      return;
    }
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      res.json([]);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/coupons", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const parsed = z.object({
      code: z.string().min(2).max(40),
      description: z.string().optional(),
      discountType: z.enum(["percentage", "fixed"]),
      discountValue: z.coerce.number().positive(),
      maxRedemptions: z.coerce.number().int().positive().optional(),
      expiresAt: z.string().datetime().optional(),
    }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid coupon", issues: parsed.error.issues }); return; }
    const values = parsed.data;
    const [coupon] = await db.insert(couponsTable).values({
      ...values,
      code: values.code.toUpperCase(),
      expiresAt: values.expiresAt ? new Date(values.expiresAt) : null,
    }).returning();
    res.status(201).json(coupon);
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      res.status(dbError.status).json(dbError.body);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/coupons", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    res.json(await db.select().from(couponsTable));
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      res.json([]);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/coupons/:couponId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const couponId = Number(req.params["couponId"]);
    const [coupon] = await db.update(couponsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(couponsTable.id, couponId)).returning();
    if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }
    res.json(coupon);
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      res.status(dbError.status).json(dbError.body);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/payments/webhook/stripe", rateLimit({ keyPrefix: "stripe-webhook", windowMs: 60_000, max: 120 }), async (req, res) => {
  try {
    if (!process.env["STRIPE_WEBHOOK_SECRET"]) {
      res.status(503).json({ error: "Stripe webhook is not configured", requiredEnv: ["STRIPE_WEBHOOK_SECRET"] });
      return;
    }
    const signature = req.header("stripe-signature");
    const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
    if (!signature || !rawBody || !verifyStripeSignature(rawBody, signature, process.env["STRIPE_WEBHOOK_SECRET"])) {
      res.status(400).json({ error: "Invalid Stripe webhook signature" });
      return;
    }

    const event = JSON.parse(rawBody.toString("utf8")) as { type?: string; data?: { object?: { id?: string; payment_intent?: string } } };
    if (event.type === "checkout.session.completed") {
      const sessionId = event.data?.object?.id;
      if (sessionId) {
        const [order] = await db.select().from(ordersTable).where(eq(ordersTable.providerSessionId, sessionId)).limit(1);
        if (order) await completePaidOrder(order.id, event.data?.object?.payment_intent);
      }
    }
    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      const sessionId = event.data?.object?.id;
      if (sessionId) await db.update(ordersTable).set({ status: "failed", updatedAt: new Date() }).where(eq(ordersTable.providerSessionId, sessionId));
    }
    res.json({ received: true });
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      res.status(dbError.status).json(dbError.body);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/payments/orders/:orderId/refunds", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const orderId = Number(req.params["orderId"]);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    const amount = Math.min(Number(req.body.amount || order.total), order.total);
    const [refund] = await db.insert(refundsTable).values({ orderId, amount, reason: req.body.reason ?? null, status: "pending" }).returning();
    res.status(201).json(refund);
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      res.status(dbError.status).json(dbError.body);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export async function hasPaidAccess(userId: number, courseId: number) {
  const rows = await db.select({ orderId: ordersTable.id })
    .from(ordersTable)
    .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(and(eq(ordersTable.userId, userId), eq(ordersTable.status, "paid"), eq(orderItemsTable.courseId, courseId)))
    .limit(1);
  return rows.length > 0;
}

async function reconcilePendingOrders(orders: Array<{ id: number; status: string; providerSessionId: string | null }>) {
  for (const order of orders) {
    if (order.status !== "pending" || !order.providerSessionId) continue;
    try {
      if (!stripeSecretKey()) continue;
      const session = await retrieveStripeSession(order.providerSessionId);
      if (session?.payment_status === "paid") {
        await completePaidOrder(order.id, session.payment_intent ?? undefined);
        logger.info({ orderId: order.id }, "Reconciled pending Stripe order to paid");
      }
    } catch (err) {
      logger.error({ err, orderId: order.id }, "Failed to reconcile pending order");
    }
  }
}

async function resolveCoupon(code: string, userId: number) {
  const normalized = code.toUpperCase();
  const [coupon] = await db.select().from(couponsTable)
    .where(and(
      eq(couponsTable.code, normalized),
      eq(couponsTable.isActive, 1),
      or(isNull(couponsTable.expiresAt), gt(couponsTable.expiresAt, new Date())),
    ))
    .limit(1);
  if (!coupon) return null;
  if (coupon.maxRedemptions && coupon.redemptionCount >= coupon.maxRedemptions) return null;
  const used = await db.select().from(couponRedemptionsTable)
    .where(and(eq(couponRedemptionsTable.couponId, coupon.id), eq(couponRedemptionsTable.userId, userId))).limit(1);
  return used.length ? null : coupon;
}

async function handleRestCheckout(
  req: Request,
  res: Response,
  dbError: { status: number; body: { error: string } },
) {
  try {
    if (req.user!.id < 0) {
      res.status(503).json({
        error: "Checkout requires a persisted database user. Restart the API after fixing DATABASE_URL, then sign in again.",
        code: "CHECKOUT_DATABASE_USER_REQUIRED",
      });
      return;
    }

    const parsed = checkoutInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid checkout request", issues: parsed.error.issues });
      return;
    }

    const { courseId, couponCode } = parsed.data;
    const rest = supabaseRest();
    const courseRow = await rest.selectOne("courses", { id: courseId });
    const course = courseFromRest(courseRow);
    if (!course || !course.isPublished) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    const existingEnrollment = await rest.selectMany("enrollments", {
      user_id: req.user!.id,
      course_id: courseId,
    });
    if (existingEnrollment.length) {
      res.status(409).json({ error: "Already enrolled" });
      return;
    }

    if (course.price <= 0) {
      const enrollment = await rest.insertOne("enrollments", {
        user_id: req.user!.id,
        course_id: courseId,
      });
      res.status(201).json({ free: true, enrollment });
      return;
    }

    const coupon = couponCode ? await resolveRestCoupon(rest, couponCode, req.user!.id) : null;
    if (couponCode && !coupon) {
      res.status(400).json({ error: "Coupon is invalid, expired, inactive, or already used" });
      return;
    }

    const discountTotal = coupon ? calculateDiscount(course.price, coupon.discountType, coupon.discountValue) : 0;
    const total = Math.max(0, roundMoney(course.price - discountTotal));
    const order = await rest.insertOne("orders", {
      user_id: req.user!.id,
      subtotal: course.price,
      discount_total: discountTotal,
      total,
      coupon_id: coupon?.id ?? null,
      provider: "stripe",
      status: total === 0 ? "paid" : "pending",
    });
    await rest.insertOne("order_items", {
      order_id: order.id,
      course_id: courseId,
      title: course.title,
      price: course.price,
    });

    if (total === 0) {
      await completePaidRestOrder(rest, order.id, undefined);
      res.status(201).json({ orderId: order.id, freeWithCoupon: true, status: "paid" });
      return;
    }

    if (!stripeSecretKey()) {
      res.status(503).json({
        error: "Payment provider is not configured",
        code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
        requiredEnv: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PUBLIC_APP_URL"],
        orderId: order.id,
      });
      return;
    }

    const session = await createStripeCheckoutSession(order.id, course.title, total);
    await rest.updateOne("orders", { id: order.id }, { provider_session_id: session.id, updated_at: new Date().toISOString() });
    res.status(201).json({ orderId: order.id, checkoutUrl: session.url, status: "pending" });
  } catch (fallbackError) {
    req.log.error(fallbackError);
    if (fallbackError instanceof StripeCheckoutError) {
      res.status(fallbackError.status).json({
        error: fallbackError.safeMessage,
        code: "STRIPE_CHECKOUT_FAILED",
      });
      return;
    }
    res.status(dbError.status).json(dbError.body);
  }
}

function courseFromRest(row: any) {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: String(row.title),
    isPublished: Boolean(row.is_published),
    price: Number(row.price || 0),
  };
}

function couponFromRest(row: any) {
  if (!row) return null;
  return {
    id: Number(row.id),
    code: String(row.code),
    discountType: row.discount_type as "percentage" | "fixed",
    discountValue: Number(row.discount_value || 0),
    maxRedemptions: row.max_redemptions == null ? null : Number(row.max_redemptions),
    redemptionCount: Number(row.redemption_count || 0),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    isActive: Number(row.is_active || 0),
  };
}

async function resolveRestCoupon(rest: ReturnType<typeof supabaseRest>, code: string, userId: number) {
  const coupon = couponFromRest(await rest.selectOne("coupons", { code: code.toUpperCase() }));
  if (!coupon || coupon.isActive !== 1) return null;
  if (coupon.expiresAt && coupon.expiresAt <= new Date()) return null;
  if (coupon.maxRedemptions && coupon.redemptionCount >= coupon.maxRedemptions) return null;
  const used = await rest.selectMany("coupon_redemptions", { coupon_id: coupon.id, user_id: userId });
  return used.length ? null : coupon;
}

async function completePaidRestOrder(rest: ReturnType<typeof supabaseRest>, orderId: number, paymentIntent?: unknown) {
  const order = await rest.updateOne("orders", { id: orderId }, {
    status: "paid",
    provider_payment_intent_id: typeof paymentIntent === "string" ? paymentIntent : null,
    updated_at: new Date().toISOString(),
  });
  if (!order) return;

  await rest.insertOne("payments", {
    order_id: orderId,
    provider: order.provider,
    status: "paid",
    amount: order.total,
    currency: order.currency ?? "usd",
    provider_payment_id: order.provider_payment_intent_id,
  }).catch(() => {});

  const items = await rest.selectMany("order_items", { order_id: orderId });
  for (const item of items) {
    await rest.insertOne("enrollments", { user_id: order.user_id, course_id: item.course_id }).catch(() => {});
    await rest.insertOne("notifications", {
      user_id: order.user_id,
      type: "enrollment",
      title: `Enrolled in ${item.title}`,
      body: "Your payment was confirmed server-side.",
      link: `/learn/${item.course_id}`,
    }).catch(() => {});
  }
}

async function completePaidOrder(orderId: number, paymentIntent?: unknown) {
  const [order] = await db.update(ordersTable)
    .set({ status: "paid", providerPaymentIntentId: typeof paymentIntent === "string" ? paymentIntent : null, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId))
    .returning();
  if (!order) return;
  await db.insert(paymentsTable).values({ orderId, provider: order.provider, status: "paid", amount: order.total, currency: order.currency, providerPaymentId: order.providerPaymentIntentId }).catch((err) => logger.error({ err, orderId }, "Failed to record payment"));
  if (order.couponId) {
    await db.insert(couponRedemptionsTable).values({ couponId: order.couponId, userId: order.userId, orderId }).catch((err) => logger.error({ err, orderId }, "Failed to record coupon redemption"));
    await db.update(couponsTable).set({ redemptionCount: sql`${couponsTable.redemptionCount} + 1`, updatedAt: new Date() }).where(eq(couponsTable.id, order.couponId)).catch((err) => logger.error({ err, orderId }, "Failed to increment coupon redemptions"));
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  for (const item of items) {
    await db.insert(enrollmentsTable).values({ userId: order.userId, courseId: item.courseId }).catch((err) => logger.error({ err, orderId, courseId: item.courseId }, "Failed to create enrollment"));
    await db.insert(notificationsTable).values({
      userId: order.userId,
      type: "enrollment",
      title: `Enrolled in ${item.title}`,
      body: "Your payment was confirmed server-side.",
      link: `/learn/${item.courseId}`,
    }).catch((err) => logger.error({ err, orderId }, "Failed to create enrollment notification"));
  }
}

async function createStripeCheckoutSession(orderId: number, courseTitle: string, total: number) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    throw new StripeCheckoutError(503, "Stripe secret key is missing or invalid");
  }

  const appUrl = (process.env["PUBLIC_APP_URL"] || "http://localhost:5173").replace(/\/$/, "");
  const params = new URLSearchParams({
    mode: "payment",
    success_url: `${appUrl}/dashboard?payment=success&order=${orderId}`,
    cancel_url: `${appUrl}/courses?payment=cancelled&order=${orderId}`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(Math.round(total * 100)),
    "line_items[0][price_data][product_data][name]": courseTitle,
    "metadata[orderId]": String(orderId),
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new StripeCheckoutError(response.status, detail);
  }
  return await response.json() as { id: string; url: string };
}

async function retrieveStripeSession(sessionId: string) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    throw new StripeCheckoutError(503, "Stripe secret key is missing or invalid");
  }
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new StripeCheckoutError(response.status, detail);
  }
  return await response.json() as { payment_status?: string; payment_intent?: string | null };
}

class StripeCheckoutError extends Error {
  readonly safeMessage: string;

  constructor(readonly status: number, detail: string) {
    super(`Stripe checkout failed with ${status}`);
    this.name = "StripeCheckoutError";
    this.safeMessage = safeStripeMessage(status, detail);
  }
}

function safeStripeMessage(status: number, detail: string) {
  if (status === 503) return "Stripe is not configured correctly. Add a Stripe secret key that starts with sk_test_ or sk_live_, then restart the API server.";
  if (status === 401) return "Stripe rejected STRIPE_SECRET_KEY. Check that the server is using a valid Stripe secret key.";
  if (status === 403) return "Stripe rejected this checkout request. Check account permissions and mode.";
  if (status === 429) return "Stripe rate-limited checkout creation. Please wait and try again.";
  if (/No such price|No such product|invalid/i.test(detail)) return "Stripe rejected the checkout payload. Check course price and Stripe account mode.";
  return "Stripe checkout could not be created. Check the API server logs for the Stripe request details.";
}

function stripeSecretKey() {
  const value = process.env["STRIPE_SECRET_KEY"]?.trim();
  if (!value) return "";
  return /^sk_(test|live)_/.test(value) ? value : "";
}

export function verifyStripeSignature(rawBody: Buffer, signatureHeader: string, secret: string) {
  const signatureParts = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestamp = signatureParts.find(([key]) => key === "t")?.[1];
  const expected = signatureParts.find(([key]) => key === "v1")?.[1];
  if (!timestamp || !expected) return false;

  const actual = createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function calculateDiscount(price: number, type: "percentage" | "fixed", value: number) {
  return roundMoney(type === "percentage" ? price * Math.min(value, 100) / 100 : Math.min(value, price));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export default router;
