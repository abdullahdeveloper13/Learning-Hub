import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import fs from "node:fs";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const allowedOrigins = getAllowedOrigins();

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers["x-request-id"]?.toString() || randomUUID(),
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins === "*") {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.has(origin));
    },
  }),
);
app.use("/api/storage/uploads", express.raw({ type: "*/*", limit: "2gb" }));
app.use("/api/payments/webhook/stripe", express.raw({ type: "application/json", limit: "2mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const mediaRootPath = path.resolve(import.meta.dirname, "../../../media");
app.use("/media", express.static(mediaRootPath, { fallthrough: true }));
app.use("/resources", express.static(path.join(mediaRootPath, "resources"), { fallthrough: true }));

const frontendDistPath = path.resolve(import.meta.dirname, "../../../dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error({ err, route: req.originalUrl, method: req.method }, "Unhandled API error");
  const status = typeof err === "object" && err && "status" in err && typeof err.status === "number" ? err.status : 500;
  const message = status >= 500 ? "Internal server error" : err instanceof Error ? err.message : "Bad request";
  res.status(status).json({ error: message, requestId: req.id });
});

export default app;

function getAllowedOrigins() {
  const configured = [
    process.env["CORS_ORIGINS"],
    process.env["PUBLIC_APP_URL"],
    process.env["FRONTEND_URL"],
  ]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (configured.includes("*")) return "*";

  const defaults =
    process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:5173", "http://127.0.0.1:5173"];

  return new Set([...configured, ...defaults]);
}
