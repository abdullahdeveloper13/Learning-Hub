import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, coursesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";
import { supabaseRest } from "../lib/supabaseRest";

const router = Router();

const fallbackCategories = [
  { id: 1, name: "Web Development", slug: "web-development", description: "Frontend, backend, and full-stack engineering.", iconUrl: "/images/categories/web-development.jpg", createdAt: new Date(), courseCount: 0 },
  { id: 2, name: "Programming", slug: "programming", description: "Programming languages, software craft, automation, and testing.", iconUrl: "/images/categories/programming.jpg", createdAt: new Date(), courseCount: 0 },
  { id: 3, name: "Artificial Intelligence", slug: "artificial-intelligence", description: "AI tools, automation, and applied machine learning.", iconUrl: "/images/categories/ai.jpg", createdAt: new Date(), courseCount: 0 },
  { id: 4, name: "Design", slug: "design", description: "UX, UI, product design, and visual systems.", iconUrl: "/images/categories/design.jpg", createdAt: new Date(), courseCount: 0 },
  { id: 5, name: "Business", slug: "business", description: "Operations, marketing, finance, and strategy.", iconUrl: "/images/categories/business.jpg", createdAt: new Date(), courseCount: 0 },
];

const seedCategories = fallbackCategories.map(({ name, slug, description, iconUrl }) => ({
  name,
  slug,
  description,
  icon_url: iconUrl,
}));

function categoryFromRest(row: any) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    iconUrl: row.icon_url,
    createdAt: new Date(row.created_at),
    courseCount: 0,
  };
}

async function getOrSeedRestCategories() {
  const rest = supabaseRest();
  let rows = await rest.selectMany("categories");
  if (rows.length === 0) {
    for (const category of seedCategories) {
      await rest.insertOne("categories", category);
    }
    rows = await rest.selectMany("categories");
  }
  return rows.map(categoryFromRest);
}

router.get("/categories", async (req, res) => {
  try {
    const cats = await db.select().from(categoriesTable);
    const courseCounts = await db.select({
      categoryId: coursesTable.categoryId,
      count: sql<number>`count(*)::int`
    }).from(coursesTable).groupBy(coursesTable.categoryId);
    const countMap = Object.fromEntries(courseCounts.map(c => [c.categoryId, c.count]));
    const result = cats.map(c => ({ ...c, courseCount: countMap[c.id] ?? 0 }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const categories = await getOrSeedRestCategories();
      res.json(categories.length ? categories : fallbackCategories);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/categories", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, iconUrl } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const [cat] = await db.insert(categoriesTable).values({ name, slug, description, iconUrl }).returning();
    res.status(201).json({ ...cat, courseCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/categories/:categoryId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params["categoryId"]);
    const { name, description, iconUrl } = req.body;
    const updates: Record<string, unknown> = {};
    if (name) { updates["name"] = name; updates["slug"] = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""); }
    if (description !== undefined) updates["description"] = description;
    if (iconUrl !== undefined) updates["iconUrl"] = iconUrl;
    const [cat] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
    if (!cat) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...cat, courseCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/categories/:categoryId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params["categoryId"]);
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
