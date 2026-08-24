create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  role text not null default 'SCOUT' check (role in ('ADMIN','SCOUT','ANALYST','VIEWER')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  country text,
  province text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  internal_code text unique,
  first_name text not null,
  last_name text not null,
  full_name text generated always as (trim(first_name || ' ' || last_name)) stored,
  birth_date date,
  nationality text,
  position text not null default 'GK',
  specific_position text,
  preferred_foot text check (preferred_foot in ('DERECHO','IZQUIERDO','AMBOS') or preferred_foot is null),
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  current_club_id uuid references clubs(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists player_external_sources (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  source text not null,
  external_id text,
  external_url text,
  last_sync_at timestamptz,
  sync_status text default 'PENDING',
  confidence numeric(5,2),
  unique(player_id, source)
);

create table if not exists competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  category text,
  age_group text,
  level text,
  created_at timestamptz not null default now()
);

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete set null,
  season_id uuid references seasons(id) on delete set null,
  match_date date,
  home_club_id uuid references clubs(id) on delete set null,
  away_club_id uuid references clubs(id) on delete set null,
  home_score integer,
  away_score integer,
  venue text,
  created_at timestamptz not null default now()
);

create table if not exists player_matches (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  club_id uuid references clubs(id) on delete set null,
  starter boolean,
  minutes_played integer,
  shirt_number integer,
  formation text,
  position_played text,
  goals_conceded integer,
  saves integer,
  clean_sheet boolean,
  unique(player_id, match_id)
);

create table if not exists scouting_reports (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  match_id uuid references matches(id) on delete set null,
  scout_id uuid references users(id) on delete set null,
  report_date date not null default current_date,
  minutes_observed integer,
  formation text,
  tracking_line text check (
    tracking_line in ('1_FICHAR','2_SEGUIR','3_VER_MAS_ADELANTE','4_DESCARTAR','JOVEN_PROMESA')
  ),
  general_observation text,
  injury_flag boolean default false,
  national_team_flag boolean default false,
  global_score numeric(4,2) check (global_score between 1 and 10),
  report_status text not null default 'DRAFT' check (report_status in ('DRAFT','FINAL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists evaluation_metrics (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  group_name text not null,
  label text not null,
  position text not null default 'GK',
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists report_scores (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references scouting_reports(id) on delete cascade,
  metric_id uuid not null references evaluation_metrics(id) on delete cascade,
  score numeric(4,2) not null check (score between 1 and 10),
  source_type text not null default 'MANUAL' check (source_type in ('MANUAL','AI','EXTERNAL')),
  confidence numeric(5,2),
  validated boolean not null default true,
  original_ai_score numeric(4,2),
  created_at timestamptz not null default now(),
  unique(report_id, metric_id)
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete set null,
  player_id uuid references players(id) on delete set null,
  url text not null,
  video_type text default 'MATCH',
  duration_seconds integer,
  source text,
  analysis_status text not null default 'UNANALYZED',
  created_at timestamptz not null default now()
);

create table if not exists video_events (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  player_id uuid references players(id) on delete set null,
  metric_id uuid references evaluation_metrics(id) on delete set null,
  timestamp_start_seconds integer not null,
  timestamp_end_seconds integer,
  event_type text,
  result text,
  comment text,
  source_type text not null default 'MANUAL',
  confidence numeric(5,2),
  created_at timestamptz not null default now()
);

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists watchlist_players (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references watchlists(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  priority numeric(4,2) check (priority between 1 and 10),
  next_review date,
  created_at timestamptz not null default now(),
  unique(watchlist_id, player_id)
);

create table if not exists player_tracking_metadata (
  player_id uuid primary key references players(id) on delete cascade,
  reports_count integer not null default 0,
  matches_observed integer not null default 0,
  minutes_observed integer not null default 0,
  avg_global_score numeric(4,2),
  last_global_score numeric(4,2),
  best_score numeric(4,2),
  worst_score numeric(4,2),
  score_last_3 numeric(4,2),
  score_last_5 numeric(4,2),
  consistency_score numeric(4,2),
  potential_score numeric(4,2),
  current_level_score numeric(4,2),
  recruitment_priority numeric(4,2),
  observation_priority numeric(4,2),
  evidence_level text default 'VERY_LOW',
  trend text default 'STABLE',
  last_observed_at date,
  next_review_due date,
  updated_at timestamptz not null default now()
);

insert into evaluation_metrics (code, group_name, label, position, sort_order)
values
('GK_SAVE','Arquero','Atajadas','GK',10),
('GK_REFLEX','Arquero','Reflejos','GK',20),
('GK_1V1','Arquero','Mano a mano','GK',30),
('GK_AERIAL','Arquero','Juego aéreo','GK',40),
('GK_EXIT','Arquero','Salidas','GK',50),
('GK_POSITION','Arquero','Ubicación','GK',60),
('GK_FEET','Distribución','Juego con pies','GK',70),
('GK_LONG','Distribución','Saque largo','GK',80),
('GK_COMM','Distribución','Comunicación','GK',90),
('GK_BODY','Técnica específica','Posición corporal','GK',100),
('GK_MOVE','Técnica específica','Traslado','GK',110),
('GK_HIGH','Técnica específica','Pegada arriba','GK',120),
('GK_LOW','Técnica específica','Pegada abajo','GK',130)
on conflict (code) do nothing;

create index if not exists idx_players_position on players(position);
create index if not exists idx_reports_player on scouting_reports(player_id);
create index if not exists idx_scores_report on report_scores(report_id);
create index if not exists idx_video_events_player on video_events(player_id);
