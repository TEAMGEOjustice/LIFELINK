import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  console.log('🔌 Connecting to NEW Supabase project...');
  const client = new pg.Client({
    host: 'db.ohopcuksklbdttxzagmc.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.argv[2] || process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  
  try {
    await client.connect();
    console.log('✅ Connected!\n');

    const sql = readFileSync(join(__dirname, '..', 'supabase', 'COMPLETE_SETUP.sql'), 'utf-8');
    console.log('🚀 Executing COMPLETE database setup...');
    await client.query(sql);
    console.log('✅ Setup complete!\n');

    // Verify tables
    const { rows: tables } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
    );
    console.log('📋 Tables:', tables.map(t=>t.tablename).join(', '));

    // Verify functions
    const { rows: funcs } = await client.query(`
      SELECT routine_name FROM information_schema.routines 
      WHERE routine_schema='public' AND routine_type='FUNCTION'
      ORDER BY routine_name
    `);
    console.log('⚡ Functions:', funcs.map(f=>f.routine_name).join(', '));

    console.log('\n🎉 DATABASE FULLY READY!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
