import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(cors());
app.use("/api/storage/uploads", express.raw({ type: "*/*", limit: "2gb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error({ err, route: req.originalUrl, method: req.method }, "Unhandled API error");
  const status = typeof err === "object" && err && "status" in err && typeof err.status === "number" ? err.status : 500;
  const message = status >= 500 ? "Internal server error" : err instanceof Error ? err.message : "Bad request";
  res.status(status).json({ error: message, requestId: req.id });
});

export default app;
