import pg from 'pg';
const {Pool} = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres.vqpdlagmeatubprlfgkz:123%40%21Abdullah%24%25@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: {rejectUnauthorized: false}
});

const r = await pool.query(`SELECT typname FROM pg_type WHERE typname IN ('auth_token_purpose','discount_type','order_status','payment_provider','report_target','report_status')`);
console.log('Existing enums:', r.rows.map(x=>x.typname));

const types = await pool.query(`SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid ORDER BY t.typname, e.enumsortorder`);
console.log('\nAll enums:');
types.rows.forEach(r => console.log('  ' + r.typname + ': ' + r.enumlabel));

await pool.end();
