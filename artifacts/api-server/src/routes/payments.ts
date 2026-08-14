import { Router } from "express";
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

    if (!process.env["STRIPE_SECRET_KEY"]) {
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
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/payments/orders", requireAuth, async (req, res) => {
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.userId, req.user!.id));
  res.json(rows);
});

router.get("/admin/payments/orders", requireAuth, requireRole("admin"), async (_req, res) => {
  const rows = await db.select().from(ordersTable);
  res.json(rows);
});

router.post("/admin/coupons", requireAuth, requireRole("admin"), async (req, res) => {
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
});

router.get("/admin/coupons", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await db.select().from(couponsTable));
});

router.patch("/admin/coupons/:couponId", requireAuth, requireRole("admin"), async (req, res) => {
  const couponId = Number(req.params["couponId"]);
  const [coupon] = await db.update(couponsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(couponsTable.id, couponId)).returning();
  if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }
  res.json(coupon);
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
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/payments/orders/:orderId/refunds", requireAuth, requireRole("admin"), async (req, res) => {
  const orderId = Number(req.params["orderId"]);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const amount = Math.min(Number(req.body.amount || order.total), order.total);
  const [refund] = await db.insert(refundsTable).values({ orderId, amount, reason: req.body.reason ?? null, status: "pending" }).returning();
  res.status(201).json(refund);
});

export async function hasPaidAccess(userId: number, courseId: number) {
  const rows = await db.select({ orderId: ordersTable.id })
    .from(ordersTable)
    .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(and(eq(ordersTable.userId, userId), eq(ordersTable.status, "paid"), eq(orderItemsTable.courseId, courseId)))
    .limit(1);
  return rows.length > 0;
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

async function completePaidOrder(orderId: number, paymentIntent?: unknown) {
  const [order] = await db.update(ordersTable)
    .set({ status: "paid", providerPaymentIntentId: typeof paymentIntent === "string" ? paymentIntent : null, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId))
    .returning();
  if (!order) return;
  await db.insert(paymentsTable).values({ orderId, provider: order.provider, status: "paid", amount: order.total, currency: order.currency, providerPaymentId: order.providerPaymentIntentId }).catch(() => {});
  if (order.couponId) {
    await db.insert(couponRedemptionsTable).values({ couponId: order.couponId, userId: order.userId, orderId }).catch(() => {});
    await db.update(couponsTable).set({ redemptionCount: sql`${couponsTable.redemptionCount} + 1`, updatedAt: new Date() }).where(eq(couponsTable.id, order.couponId)).catch(() => {});
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  for (const item of items) {
    await db.insert(enrollmentsTable).values({ userId: order.userId, courseId: item.courseId }).catch(() => {});
    await db.insert(notificationsTable).values({
      userId: order.userId,
      type: "enrollment",
      title: `Enrolled in ${item.title}`,
      body: "Your payment was confirmed server-side.",
      link: `/learn/${item.courseId}`,
    }).catch(() => {});
  }
}

async function createStripeCheckoutSession(orderId: number, courseTitle: string, total: number) {
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
      Authorization: `Bearer ${process.env["STRIPE_SECRET_KEY"]}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!response.ok) throw new Error(`Stripe checkout failed with ${response.status}`);
  return await response.json() as { id: string; url: string };
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
