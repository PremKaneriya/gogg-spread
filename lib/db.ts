import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST || 'ep-twilight-morning-a5nr6ocf-pooler.us-east-2.aws.neon.tech',
  database: process.env.PGDATABASE || 'Lite',
  user: process.env.PGUSER || 'Lite_owner',
  password: process.env.PGPASSWORD || 'npg_LnwNl5FuEa1r',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;

