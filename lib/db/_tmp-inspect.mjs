import pg from "pg";
import fs from "node:fs";
import path from "node:path";

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsAt = line.indexOf("=");
    if (equalsAt === -1) continue;
    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadEnv(path.resolve(process.cwd(), "../../.env"));

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const res = await pool.query("select id, email, role from users order by id limit 20");
console.log(JSON.stringify(res.rows, null, 2));
const courses = await pool.query("select id, title, price, is_published from courses order by id limit 10");
console.log("COURSES: " + JSON.stringify(courses.rows, null, 2));
const orders = await pool.query("select id, user_id, status, provider_session_id from orders order by id desc limit 10");
console.log("ORDERS: " + JSON.stringify(orders.rows, null, 2));
await pool.end();