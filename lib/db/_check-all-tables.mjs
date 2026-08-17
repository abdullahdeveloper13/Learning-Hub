import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres.vqpdlagmeatubprlfgkz:123%40%21Abdullah%24%25@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const tables = [
  'users', 'auth_tokens', 'categories', 'courses', 'modules', 'lessons',
  'enrollments', 'course_progress', 'lesson_progress', 'quizzes', 'questions',
  'quiz_attempts', 'assignments', 'assignment_submissions', 'reviews',
  'coupons', 'orders', 'order_items', 'payments', 'coupon_redemptions',
  'refunds', 'certificates', 'notifications', 'conversations',
  'conversation_participants', 'messages', 'discussions', 'announcements',
  'activity_logs', 'reports', 'platform_settings'
];

for (const table of tables) {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = '${table}' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  if (res.rows.length === 0) {
    console.log(`\n${table}: TABLE DOES NOT EXIST`);
  } else {
    console.log(`\n${table}: ${res.rows.length} columns`);
    res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));
  }
}

await pool.end();
