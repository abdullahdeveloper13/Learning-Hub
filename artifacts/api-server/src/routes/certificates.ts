import { Router } from "express";
import { db } from "@workspace/db";
import { certificatesTable, coursesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function enrichCert(cert: typeof certificatesTable.$inferSelect) {
  const [course] = await db.select({ title: coursesTable.title, instructorId: coursesTable.instructorId }).from(coursesTable).where(eq(coursesTable.id, cert.courseId)).limit(1);
  let instructorName = "Instructor";
  if (course) {
    const [inst] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, course.instructorId)).limit(1);
    if (inst) instructorName = inst.name;
  }
  return { ...cert, courseTitle: course?.title ?? "Course", instructorName, issuedAt: cert.issuedAt.toISOString() };
}

router.get("/certificates", requireAuth, async (req, res) => {
  try {
    const certs = await db.select().from(certificatesTable).where(eq(certificatesTable.userId, req.user!.id));
    const enriched = await Promise.all(certs.map(enrichCert));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/certificates/verify/:credentialId", async (req, res) => {
  try {
    const credentialId = String(req.params["credentialId"] ?? "");
    const [cert] = await db.select().from(certificatesTable).where(eq(certificatesTable.credentialId, credentialId)).limit(1);
    if (!cert) { res.status(404).json({ error: "Certificate not found" }); return; }
    const enriched = await enrichCert(cert);
    res.json({
      credentialId: enriched.credentialId,
      courseTitle: enriched.courseTitle,
      instructorName: enriched.instructorName,
      issuedAt: enriched.issuedAt,
      verified: true,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/certificates/:certificateId", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["certificateId"]);
    const [cert] = await db.select().from(certificatesTable).where(eq(certificatesTable.id, id)).limit(1);
    if (!cert) { res.status(404).json({ error: "Not found" }); return; }
    const enriched = await enrichCert(cert);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
