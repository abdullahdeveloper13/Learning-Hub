import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres.vqpdlagmeatubprlfgkz:123%40%21Abdullah%24%25@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const res = await pool.query(`
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'users' AND table_schema = 'public'
  ORDER BY ordinal_position
`);
console.log('USERS TABLE COLUMNS:');
res.rows.forEach(r => console.log('  ' + r.column_name + ' (' + r.data_type + ') nullable=' + r.is_nullable));

const tables = await pool.query(`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name
`);
console.log('\nALL PUBLIC TABLES:');
tables.rows.forEach(r => console.log('  ' + r.table_name));

// Check which expected columns are missing from users table
const expectedCols = ['id','email','name','password_hash','role','avatar_url','bio','email_verified_at','is_active','created_at','updated_at'];
const existingCols = res.rows.map(r => r.column_name);
const missing = expectedCols.filter(c => !existingCols.includes(c));
if (missing.length > 0) {
  console.log('\nMISSING COLUMNS in users table:', missing.join(', '));
} else {
  console.log('\nAll expected users columns exist.');
}

await pool.end();
