import pg from 'pg';

const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined });

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
  // Additive, idempotent migration: keeps existing match rows and converts their
  // participant names to the first/last-name shape used by the updated form.
  await pool.query(`ALTER TABLE tennis_matches DROP CONSTRAINT IF EXISTS tennis_matches_match_type_check`);
  await pool.query(`ALTER TABLE tennis_matches ADD CONSTRAINT tennis_matches_match_type_check CHECK (match_type IN ('friendly','tournament','training'))`);
  await pool.query(`ALTER TABLE tennis_matches ALTER COLUMN winner_team DROP NOT NULL`);
  await pool.query(`UPDATE tennis_matches SET match_format = CASE match_format
    WHEN '2 sets gagnants' THEN 'best_of_3'
    WHEN '2 sets gagnants + super tie-break' THEN 'best_of_3_super'
    WHEN '3 sets gagnants' THEN 'best_of_5'
    WHEN '3 sets gagnants + super tie-break' THEN 'best_of_5_super'
    ELSE match_format END
    WHERE match_format IN ('2 sets gagnants','2 sets gagnants + super tie-break','3 sets gagnants','3 sets gagnants + super tie-break')`);
  await pool.query(`UPDATE tennis_matches SET players = (
    SELECT jsonb_agg(
      (p - 'name') || jsonb_build_object(
        'first_name', COALESCE(p->>'first_name', split_part(COALESCE(p->>'name',''), ' ', 1)),
        'last_name', COALESCE(p->>'last_name', NULLIF(substr(COALESCE(p->>'name',''), length(split_part(COALESCE(p->>'name',''), ' ', 1)) + 2), ''))
      ) ORDER BY ord
    ) FROM jsonb_array_elements(players) WITH ORDINALITY AS x(p,ord)
  ) WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(tennis_matches.players) AS participant(value) WHERE participant.value ? 'name')`);
  await pool.query(`CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_date DATE NOT NULL, match_time TIME NOT NULL, venue TEXT NOT NULL, opponent TEXT NOT NULL, opponent_rank TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}
