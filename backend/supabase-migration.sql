-- ============================================
-- TikTok World Cup - Supabase Migration
-- Project: aleson's Project
-- Prefix: twc_
-- Run this in the Supabase SQL Editor
-- ============================================

-- Create tables with twc_ prefix
CREATE TABLE IF NOT EXISTS twc_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS twc_teams (
  id TEXT PRIMARY KEY,
  name TEXT,
  flag TEXT,
  "primaryColor" TEXT,
  "secondaryColor" TEXT,
  "jerseyColor" TEXT
);

CREATE TABLE IF NOT EXISTS twc_donors (
  username TEXT PRIMARY KEY,
  diamonds INTEGER,
  "teamId" TEXT,
  avatar TEXT
);

CREATE TABLE IF NOT EXISTS twc_matches (
  id SERIAL PRIMARY KEY,
  "localTeamId" TEXT,
  "visitorTeamId" TEXT,
  "localScore" INTEGER,
  "visitorScore" INTEGER,
  "winnerId" TEXT,
  "mvpUsername" TEXT,
  "mvpDiamonds" INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed default settings
INSERT INTO twc_settings (key, value) VALUES
  ('admin_password', 'admin123'),
  ('goal_distance_diamonds', '200'),
  ('goal_distance_pixels', '600'),
  ('match_mode', 'goals'),
  ('match_limit', '3'),
  ('volume', '0.5'),
  ('event_multiplier', '1'),
  ('event_gold_goal', 'false'),
  ('event_penalty', 'none'),
  ('event_turbo', 'false'),
  ('local_team_id', 'ARG'),
  ('visitor_team_id', 'BRA'),
  ('local_score', '0'),
  ('visitor_score', '0'),
  ('ball_progress', '0'),
  ('match_state', 'idle'),
  ('overlay_resolution', '1920x1080'),
  ('gift_values', '{"Rosa":1,"TikTok":1,"Perfume":20,"Corazon":5,"Sombrero":99,"Leon":29999,"Universo":34999}')
ON CONFLICT (key) DO NOTHING;

-- Seed teams
INSERT INTO twc_teams (id, name, flag, "primaryColor", "secondaryColor", "jerseyColor") VALUES
  ('ARG', 'Argentina', '🇦🇷', '#74ACDF', '#FFFFFF', '#74ACDF'),
  ('BRA', 'Brasil', '🇧🇷', '#FEDF00', '#009739', '#FEDF00'),
  ('COL', 'Colombia', '🇨🇴', '#FCD116', '#003893', '#FCD116'),
  ('FRA', 'Francia', '🇫🇷', '#002395', '#ED2939', '#002395'),
  ('ESP', 'España', '🇪🇸', '#C60B1E', '#F1BF00', '#C60B1E'),
  ('GER', 'Alemania', '🇩🇪', '#000000', '#DD0000', '#FFFFFF'),
  ('POR', 'Portugal', '🇵🇹', '#046A38', '#DA291C', '#DA291C'),
  ('ENG', 'Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '#FFFFFF', '#CF081F', '#FFFFFF'),
  ('URU', 'Uruguay', '🇺🇾', '#007FFF', '#FFFFFF', '#007FFF'),
  ('MEX', 'México', '🇲🇽', '#006847', '#C8102E', '#006847'),
  ('JPN', 'Japón', '🇯🇵', '#00005F', '#FFFFFF', '#00005F'),
  ('MAR', 'Marruecos', '🇲🇦', '#C1272D', '#006233', '#C1272D')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  flag = EXCLUDED.flag,
  "primaryColor" = EXCLUDED."primaryColor",
  "secondaryColor" = EXCLUDED."secondaryColor",
  "jerseyColor" = EXCLUDED."jerseyColor";
