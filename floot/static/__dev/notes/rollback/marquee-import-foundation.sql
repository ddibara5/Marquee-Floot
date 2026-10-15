create table if not exists marquee_import_controls(
 source text primary key, mode text not null default 'disabled' check(mode in ('disabled','live')),
 verified_at timestamptz, credential_blocked boolean not null default false, retry_after timestamptz,
 run_id uuid, lease_until timestamptz, last_success_at timestamptz);
insert into marquee_import_controls(source) values('trakt'),('crunchyroll'),('anilist') on conflict do nothing;
create table if not exists marquee_import_runs(
 id uuid primary key,source text not null references marquee_import_controls(source), mode text not null check(mode in ('shadow','live')),
 status text not null default 'running',started_at timestamptz not null default now(),finished_at timestamptz,
 counts jsonb not null default '{}',error_code text,reference_run_id uuid, snapshot jsonb not null default '{}');
create table if not exists marquee_import_pages(
 run_id uuid not null references marquee_import_runs(id),feed text not null,page int not null,
 payload jsonb not null,metadata jsonb not null default '{}',primary key(run_id,feed,page));
create table if not exists marquee_import_backups(
 id uuid primary key,created_at timestamptz not null default now(),reason text not null,snapshot jsonb not null);
alter table marquee_import_controls enable row level security;
alter table marquee_import_runs enable row level security;
alter table marquee_import_pages enable row level security;
alter table marquee_import_backups enable row level security;

ALTER TABLE public.marquee_crunchyroll_sync_runs DROP CONSTRAINT IF EXISTS marquee_crunchyroll_sync_runs_mode_check;
ALTER TABLE public.marquee_crunchyroll_sync_runs ADD CONSTRAINT marquee_crunchyroll_sync_runs_mode_check CHECK(mode IN ('preview','sync','shadow'));

-- Apply the following only to Supabase eiskobjlvxzwvucgpenk, not Floot:
CREATE TABLE IF NOT EXISTS public.marquee_floot_import_backups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 run_id uuid,
 snapshot jsonb NOT NULL
);
ALTER TABLE public.marquee_floot_import_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marquee_floot_import_backups FROM PUBLIC, anon, authenticated;
