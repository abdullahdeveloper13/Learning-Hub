import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres.vqpdlagmeatubprlfgkz:123%40%21Abdullah%24%25@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- 1. Create missing enums (IF NOT EXISTS via DO block)
DO $$ BEGIN
  CREATE TYPE auth_token_purpose AS ENUM ('password_reset', 'email_verification');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'paid', 'failed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_provider AS ENUM ('stripe', 'manual');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('open', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_target AS ENUM ('user', 'course', 'review', 'discussion', 'comment');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Add missing column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamp;

-- 3. Create auth_tokens table
CREATE TABLE IF NOT EXISTS auth_tokens (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  purpose auth_token_purpose not null,
  token_hash text not null unique,
  expires_at timestamp not null,
  used_at timestamp,
  created_at timestamp not null default now(),
  unique(user_id, purpose)
);

-- 4. Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id serial primary key,
  code text not null unique,
  description text,
  discount_type discount_type not null,
  discount_value real not null,
  max_redemptions integer,
  redemption_count integer not null default 0,
  expires_at timestamp,
  is_active integer not null default 1,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- 5. Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id serial primary key,
  user_id integer not null references users(id),
  status order_status not null default 'pending',
  subtotal real not null default 0,
  discount_total real not null default 0,
  total real not null default 0,
  currency text not null default 'usd',
  coupon_id integer references coupons(id),
  provider payment_provider not null default 'stripe',
  provider_session_id text,
  provider_payment_intent_id text,
  metadata json default '{}'::json,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- 6. Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id serial primary key,
  order_id integer not null references orders(id) on delete cascade,
  course_id integer not null references courses(id),
  title text not null,
  price real not null,
  created_at timestamp not null default now(),
  unique(order_id, course_id)
);

-- 7. Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id serial primary key,
  order_id integer not null references orders(id) on delete cascade,
  provider payment_provider not null,
  status order_status not null,
  amount real not null,
  currency text not null default 'usd',
  provider_payment_id text,
  raw_event json default '{}'::json,
  created_at timestamp not null default now()
);

-- 8. Create coupon_redemptions table
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id serial primary key,
  coupon_id integer not null references coupons(id),
  user_id integer not null references users(id),
  order_id integer references orders(id),
  redeemed_at timestamp not null default now(),
  unique(coupon_id, user_id)
);

-- 9. Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id serial primary key,
  order_id integer not null references orders(id),
  amount real not null,
  reason text,
  status text not null default 'pending',
  provider_refund_id text,
  created_at timestamp not null default now()
);

-- 10. Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id serial primary key,
  reporter_id integer references users(id),
  target_type report_target not null,
  target_id integer not null,
  reason text not null,
  details text,
  status report_status not null default 'open',
  resolved_by integer references users(id),
  resolution_note text,
  created_at timestamp not null default now(),
  resolved_at timestamp
);

-- 11. Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id serial primary key,
  key text not null unique,
  value json not null default '{}'::json,
  updated_by integer references users(id),
  updated_at timestamp not null default now()
);
`;

async function main() {
  try {
    await pool.query(sql);
    console.log('All migrations applied successfully!');

    // Verify tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('\nAll tables now (' + tables.rows.length + '):');
    tables.rows.forEach(r => console.log('  ' + r.table_name));

    // Verify users columns
    const users = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public' ORDER BY ordinal_position
    `);
    console.log('\nUsers columns:');
    users.rows.forEach(r => console.log('  ' + r.column_name));

  } catch (err) {
    console.error('Migration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
  } finally {
    await pool.end();
  }
}

main();
