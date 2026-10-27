import pg from 'pg';

const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined });

export async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY, sess JSON NOT NULL, expire TIMESTAMP(6) NOT NULL
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions(expire)');
  await pool.query(`CREATE TABLE IF NOT EXISTS tennis_matches (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_type TEXT NOT NULL CHECK (match_type IN ('friendly','tournament')), format TEXT NOT NULL CHECK(format IN ('singles','doubles')),
    played_on DATE NOT NULL, venue TEXT NOT NULL, surface TEXT NOT NULL, match_format TEXT NOT NULL,
    tournament_round TEXT, duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0), feeling INTEGER NOT NULL CHECK(feeling BETWEEN 1 AND 10),
    winner_team SMALLINT NOT NULL CHECK(winner_team IN (1,2)), players JSONB NOT NULL, sets JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_date DATE NOT NULL, match_time TIME NOT NULL, venue TEXT NOT NULL, opponent TEXT NOT NULL, opponent_rank TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}
