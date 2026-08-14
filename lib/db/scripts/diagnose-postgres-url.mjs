import fs from "node:fs";
import dns from "node:dns/promises";
import net from "node:net";
import path from "node:path";
import pg from "pg";

loadEnv(path.resolve(import.meta.dirname, "../../../.env"));
loadEnv(path.resolve(process.cwd(), ".env"));

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log(JSON.stringify({ exists: false }, null, 2));
  process.exitCode = 1;
} else {
  const diagnostics = {
    exists: true,
    startsPostgres: /^postgres(ql)?:\/\//.test(databaseUrl),
    startsHttps: /^https?:\/\//.test(databaseUrl),
    atCount: (databaseUrl.match(/@/g) ?? []).length,
  };

  try {
    const parsed = new URL(databaseUrl);
    diagnostics.protocol = parsed.protocol;
    diagnostics.hostname = parsed.hostname;
    diagnostics.port = parsed.port || defaultPort(parsed.protocol);
    diagnostics.database = parsed.pathname.replace(/^\//, "") || "(none)";
    diagnostics.sslmode = parsed.searchParams.get("sslmode") || "(not set)";
    diagnostics.usernameShape = parsed.username
      ? `${parsed.username.split(".")[0]}${parsed.username.includes(".") ? ".*" : ""}`
      : "(none)";

    const records = await dns.lookup(parsed.hostname, { all: true }).catch((error) => {
      diagnostics.dnsError = error.code || error.message;
      return [];
    });
    diagnostics.dnsAddressFamilies = [...new Set(records.map((record) => `IPv${record.family}`))];

    if (records.length > 0) {
      diagnostics.tcpReachable = await canConnect(parsed.hostname, Number(diagnostics.port), 8000);
    }

    if (diagnostics.startsPostgres && diagnostics.tcpReachable) {
      const pool = new pg.Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 12000,
        ssl: databaseUrl.includes("supabase") || databaseUrl.includes("pooler.supabase.com")
          ? { rejectUnauthorized: false }
          : undefined,
      });

      try {
        const { rows } = await pool.query(
          "select current_database() as database_name, current_user as user_name",
        );
        diagnostics.postgresConnected = true;
        diagnostics.connectedDatabase = rows[0]?.database_name;
        diagnostics.connectedUserShape = rows[0]?.user_name?.replace(/\..+$/, ".*");
      } catch (error) {
        diagnostics.postgresConnected = false;
        diagnostics.postgresErrorCode = error.code;
        diagnostics.postgresError = sanitizeError(error.message);
      } finally {
        await pool.end().catch(() => {});
      }
    }
  } catch (error) {
    diagnostics.parseError = error.message;
  }

  console.log(JSON.stringify(diagnostics, null, 2));
  if (!diagnostics.postgresConnected) process.exitCode = 1;
}

function defaultPort(protocol) {
  return protocol === "postgres:" || protocol === "postgresql:" ? "5432" : "(default)";
}

function canConnect(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsAt = line.indexOf("=");
    if (equalsAt === -1) continue;

    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function sanitizeError(message) {
  return String(message)
    .replace(/password=[^\s]+/gi, "password=<redacted>")
    .replace(/postgres(ql)?:\/\/[^\s]+/gi, "postgresql://<redacted>");
}
