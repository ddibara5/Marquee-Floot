-- Private source-resource clone and real cross-resource test destination; never promote to public.
SET LOCAL lock_timeout='3s';CREATE SCHEMA prep_marquee_cross_resource_20261001;REVOKE ALL ON SCHEMA prep_marquee_cross_resource_20261001 FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE prep_marquee_cross_resource_20261001.legacy_owner(id uuid PRIMARY KEY);INSERT INTO prep_marquee_cross_resource_20261001.legacy_owner VALUES('c566e7e0-880a-430d-85df-c40484144a91');
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_episodes(LIKE public.marquee_episodes INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_episodes SELECT * FROM public.marquee_episodes;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_episodes ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_franchise_overrides(LIKE public.marquee_franchise_overrides INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_franchise_overrides SELECT * FROM public.marquee_franchise_overrides;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_franchise_overrides ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_ingest_raw(LIKE public.marquee_ingest_raw INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_ingest_raw SELECT * FROM public.marquee_ingest_raw;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ingest_raw ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_mapping_review(LIKE public.marquee_mapping_review INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_mapping_review SELECT * FROM public.marquee_mapping_review;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_mapping_review ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_movies(LIKE public.marquee_movies INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_movies SELECT * FROM public.marquee_movies;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_movies ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_ratings(LIKE public.marquee_ratings INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_ratings SELECT * FROM public.marquee_ratings;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ratings ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_season_release_schedules(LIKE public.marquee_season_release_schedules INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_season_release_schedules SELECT * FROM public.marquee_season_release_schedules;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_season_release_schedules ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_seasons(LIKE public.marquee_seasons INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_seasons SELECT * FROM public.marquee_seasons;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_seasons ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_shows(LIKE public.marquee_shows INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_shows SELECT * FROM public.marquee_shows;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_shows ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings(LIKE public.marquee_source_mappings INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_source_mappings SELECT * FROM public.marquee_source_mappings;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_statuses(LIKE public.marquee_statuses INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_statuses SELECT * FROM public.marquee_statuses;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_statuses ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs(LIKE public.marquee_sync_runs INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_sync_runs SELECT * FROM public.marquee_sync_runs;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_sync_state(LIKE public.marquee_sync_state INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_sync_state SELECT * FROM public.marquee_sync_state;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_state ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_titles(LIKE public.marquee_titles INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_titles SELECT * FROM public.marquee_titles;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_titles ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_undated_completion_evidence(LIKE public.marquee_undated_completion_evidence INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_undated_completion_evidence SELECT * FROM public.marquee_undated_completion_evidence;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completion_evidence ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_undated_completions(LIKE public.marquee_undated_completions INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_undated_completions SELECT * FROM public.marquee_undated_completions;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completions ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_verified_season_totals(LIKE public.marquee_verified_season_totals INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_verified_season_totals SELECT * FROM public.marquee_verified_season_totals;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_verified_season_totals ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_watch_date_decisions(LIKE public.marquee_watch_date_decisions INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_watch_date_decisions SELECT * FROM public.marquee_watch_date_decisions;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_date_decisions ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_watch_history(LIKE public.marquee_watch_history INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_watch_history SELECT * FROM public.marquee_watch_history;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_watch_history_sources(LIKE public.marquee_watch_history_sources INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_watch_history_sources SELECT * FROM public.marquee_watch_history_sources;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history_sources ENABLE ROW LEVEL SECURITY;
CREATE TABLE prep_marquee_cross_resource_20261001.marquee_watchlist(LIKE public.marquee_watchlist INCLUDING CONSTRAINTS INCLUDING INDEXES);INSERT INTO prep_marquee_cross_resource_20261001.marquee_watchlist SELECT * FROM public.marquee_watchlist;ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_episodes ADD CONSTRAINT marquee_episodes_season_id_fkey FOREIGN KEY (season_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_seasons(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_franchise_overrides ADD CONSTRAINT marquee_franchise_overrides_show_title_id_fkey FOREIGN KEY (show_title_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_shows(title_id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ingest_raw ADD CONSTRAINT marquee_ingest_raw_first_sync_run_id_fkey FOREIGN KEY (first_sync_run_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_sync_runs(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ingest_raw ADD CONSTRAINT marquee_ingest_raw_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_mapping_review ADD CONSTRAINT marquee_mapping_review_resolved_mapping_id_fkey FOREIGN KEY (resolved_mapping_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_source_mappings(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_movies ADD CONSTRAINT marquee_movies_title_id_media_type_fkey FOREIGN KEY (title_id, media_type) REFERENCES prep_marquee_cross_resource_20261001.marquee_titles(id, media_type);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ratings ADD CONSTRAINT marquee_ratings_season_id_fkey FOREIGN KEY (season_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_seasons(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ratings ADD CONSTRAINT marquee_ratings_title_id_fkey FOREIGN KEY (title_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_titles(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ratings ADD CONSTRAINT marquee_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_season_release_schedules ADD CONSTRAINT marquee_season_release_schedules_season_id_fkey FOREIGN KEY (season_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_seasons(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_seasons ADD CONSTRAINT marquee_seasons_show_title_id_fkey FOREIGN KEY (show_title_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_shows(title_id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_shows ADD CONSTRAINT marquee_shows_title_id_media_type_fkey FOREIGN KEY (title_id, media_type) REFERENCES prep_marquee_cross_resource_20261001.marquee_titles(id, media_type);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings ADD CONSTRAINT marquee_source_mappings_episode_id_fkey FOREIGN KEY (episode_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_episodes(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings ADD CONSTRAINT marquee_source_mappings_movie_title_id_fkey FOREIGN KEY (movie_title_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_movies(title_id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings ADD CONSTRAINT marquee_source_mappings_season_id_fkey FOREIGN KEY (season_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_seasons(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings ADD CONSTRAINT marquee_source_mappings_show_title_id_fkey FOREIGN KEY (show_title_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_shows(title_id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings ADD CONSTRAINT marquee_source_mappings_title_id_fkey FOREIGN KEY (title_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_titles(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_statuses ADD CONSTRAINT marquee_statuses_season_id_fkey FOREIGN KEY (season_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_seasons(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_statuses ADD CONSTRAINT marquee_statuses_title_id_fkey FOREIGN KEY (title_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_titles(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_statuses ADD CONSTRAINT marquee_statuses_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ADD CONSTRAINT marquee_sync_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_state ADD CONSTRAINT marquee_sync_state_last_success_run_id_fkey FOREIGN KEY (last_success_run_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_sync_runs(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_state ADD CONSTRAINT marquee_sync_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completion_evidence ADD CONSTRAINT marquee_undated_completion_evidence_raw_id_fkey FOREIGN KEY (raw_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_ingest_raw(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completion_evidence ADD CONSTRAINT marquee_undated_completion_evidence_user_id_completion_id_fkey FOREIGN KEY (user_id, completion_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_undated_completions(user_id, id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completion_evidence ADD CONSTRAINT marquee_undated_completion_evidence_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completions ADD CONSTRAINT marquee_undated_completions_episode_id_fkey FOREIGN KEY (episode_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_episodes(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completions ADD CONSTRAINT marquee_undated_completions_movie_title_id_fkey FOREIGN KEY (movie_title_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_movies(title_id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completions ADD CONSTRAINT marquee_undated_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_verified_season_totals ADD CONSTRAINT marquee_verified_season_totals_season_id_fkey FOREIGN KEY (season_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_seasons(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_date_decisions ADD CONSTRAINT marquee_watch_date_decisions_raw_id_fkey FOREIGN KEY (raw_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_ingest_raw(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_date_decisions ADD CONSTRAINT marquee_watch_date_decisions_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_date_decisions ADD CONSTRAINT marquee_watch_date_decisions_user_id_history_id_fkey FOREIGN KEY (user_id, history_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_watch_history(user_id, id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history ADD CONSTRAINT marquee_watch_history_episode_id_fkey FOREIGN KEY (episode_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_episodes(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history ADD CONSTRAINT marquee_watch_history_movie_title_id_fkey FOREIGN KEY (movie_title_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_movies(title_id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history ADD CONSTRAINT marquee_watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history_sources ADD CONSTRAINT marquee_watch_history_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history_sources ADD CONSTRAINT marquee_watch_history_sources_user_id_history_id_fkey FOREIGN KEY (user_id, history_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_watch_history(user_id, id) ON DELETE CASCADE;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watchlist ADD CONSTRAINT marquee_watchlist_title_id_fkey FOREIGN KEY (title_id) REFERENCES prep_marquee_cross_resource_20261001.marquee_titles(id);
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watchlist ADD CONSTRAINT marquee_watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES prep_marquee_cross_resource_20261001.legacy_owner(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION prep_marquee_cross_resource_20261001.marquee_trakt_add_mapping(p_source text, p_kind text, p_id text, p_target_kind text, p_target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare old_target uuid;
begin
  if p_id is null or btrim(p_id)='' then
    raise exception using errcode='PT001', message='missing stable external ID';
  end if;
  select coalesce(title_id,show_title_id,movie_title_id,season_id,episode_id)
    into old_target from prep_marquee_cross_resource_20261001.marquee_source_mappings
    where source=p_source and source_entity_type=p_kind and source_id=p_id;
  if found then
    if old_target is distinct from p_target then
      raise exception using errcode='PT001', message='conflicting stable external ID';
    end if;
    return;
  end if;
  if p_target_kind='show' then
    insert into prep_marquee_cross_resource_20261001.marquee_source_mappings(source,source_entity_type,source_id,canonical_entity_type,show_title_id,match_method)
      values(p_source,p_kind,p_id,'show',p_target,'external_id');
  elsif p_target_kind='movie' then
    insert into prep_marquee_cross_resource_20261001.marquee_source_mappings(source,source_entity_type,source_id,canonical_entity_type,movie_title_id,match_method)
      values(p_source,p_kind,p_id,'movie',p_target,'external_id');
  elsif p_target_kind='episode' then
    insert into prep_marquee_cross_resource_20261001.marquee_source_mappings(source,source_entity_type,source_id,canonical_entity_type,episode_id,match_method)
      values(p_source,p_kind,p_id,'episode',p_target,'external_id');
  else
    raise exception 'unsupported Trakt mapping kind';
  end if;
end;
$function$
;
CREATE OR REPLACE FUNCTION prep_marquee_cross_resource_20261001.marquee_trakt_apply_snapshot(p_user_id uuid, p_feeds jsonb, p_approved jsonb, p_execution_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_scope text:=p_user_id::text;
  v_run uuid; v_feed text; v_item jsonb; v_media jsonb;
  v_kind text; v_media_id text; v_key text; v_at timestamptz;
  v_target uuid; v_history uuid; v_source text; v_locked boolean; v_previous timestamptz;
  v_seen jsonb:='{}'::jsonb; v_deleted int;
  v_watchlist uuid[]:=array[]::uuid[]; v_watchlist_reviewed boolean:=false;
  v_counts jsonb:='{}'::jsonb; v_fetched int:=0; v_inserted int:=0;
  v_updated int:=0; v_skipped int:=0; v_unmapped int:=0;
  v_result text; v_reason text; v_mapping uuid; v_title text;
begin
  if p_user_id is null or jsonb_typeof(p_feeds)<>'object' or
     jsonb_typeof(p_approved)<>'object' or nullif(btrim(p_execution_id),'') is null then
    raise exception 'invalid Trakt snapshot argument';
  end if;
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtext('marquee.trakt'),pg_catalog.hashtext(v_scope)) then
    raise exception 'Trakt importer already running';
  end if;
  if (select count(*) from pg_catalog.jsonb_object_keys(p_feeds))<>6 then
    raise exception 'Trakt snapshot must contain exactly six feeds';
  end if;
  -- Validate every stable record ID and timestamp before any canonical writes.
  foreach v_feed in array array['history_movies','history_episodes','ratings_movies',
                              'ratings_shows','watchlist_movies','watchlist_shows'] loop
    if jsonb_typeof(p_feeds->v_feed)<>'array' then
      raise exception 'missing Trakt feed %',v_feed;
    end if;
    v_counts:=v_counts||pg_catalog.jsonb_build_object(v_feed,pg_catalog.jsonb_array_length(p_feeds->v_feed));
    for v_item in select value from pg_catalog.jsonb_array_elements(p_feeds->v_feed) loop
      v_kind:=case when v_feed='history_episodes' then 'episode'
                   when v_feed like '%movies' then 'movie' else 'show' end;
      v_media:=v_item->v_kind;
      v_media_id:=v_media#>>'{ids,trakt}';
      v_key:=case when v_feed like 'history_%' then v_item->>'id' else v_media_id end;
      if jsonb_typeof(v_item)<>'object' or jsonb_typeof(v_media)<>'object' or
         jsonb_typeof(v_media->'ids')<>'object' or
         nullif(btrim(v_media_id),'') is null or nullif(btrim(v_key),'') is null or
         (v_kind='episode' and nullif(btrim(v_item#>>'{show,ids,trakt}'),'') is null) then
        raise exception 'Trakt % missing stable identity',v_feed;
      end if;
      if v_feed like 'history_%' then v_title:=v_item->>'watched_at';
      elsif v_feed like 'ratings_%' then v_title:=v_item->>'rated_at';
      else v_title:=v_item->>'listed_at'; end if;
      if v_title is null or v_title !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then
        raise exception 'Trakt % timestamp requires timezone',v_feed;
      end if;
      perform v_title::timestamptz;
      if v_feed like 'ratings_%' and
         (jsonb_typeof(v_item->'rating')<>'number' or
          (v_item->>'rating') !~ '^([1-9]|10)$') then
        raise exception 'Trakt rating outside 1..10';
      end if;
      if v_seen ? (v_feed||':'||v_key) then
        raise exception 'duplicate Trakt source record in %',v_feed;
      end if;
      v_seen:=v_seen||pg_catalog.jsonb_build_object(v_feed||':'||v_key,true);
    end loop;
  end loop;
  insert into prep_marquee_cross_resource_20261001.marquee_sync_runs(source,user_id,scope_key,execution_id)
    values('trakt',p_user_id,v_scope,p_execution_id) returning id into v_run;
  foreach v_feed in array array['history_movies','history_episodes','ratings_movies',
                              'ratings_shows','watchlist_movies','watchlist_shows'] loop
    for v_item in select value from pg_catalog.jsonb_array_elements(p_feeds->v_feed) loop
      v_kind:=case when v_feed='history_episodes' then 'episode'
                   when v_feed like '%movies' then 'movie' else 'show' end;
      v_media:=v_item->v_kind;
      v_media_id:=v_media#>>'{ids,trakt}';
      v_key:=case when v_feed like 'history_%' then v_item->>'id' else v_media_id end;
      v_at:=case when v_feed like 'history_%' then (v_item->>'watched_at')::timestamptz
                 when v_feed like 'ratings_%' then (v_item->>'rated_at')::timestamptz
                 else (v_item->>'listed_at')::timestamptz end;
      v_fetched:=v_fetched+1;
      insert into prep_marquee_cross_resource_20261001.marquee_ingest_raw
        (source,source_entity_type,source_id,user_id,scope_key,dedupe_key,payload_hash,payload,first_sync_run_id)
        values('trakt',v_feed,v_media_id,p_user_id,v_scope,v_key,
          pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v_item::text,'UTF8'),'sha256'),'hex'),v_item,v_run)
        on conflict(scope_key,source,source_entity_type,dedupe_key) do update
          set payload_hash=excluded.payload_hash,payload=excluded.payload,last_seen_at=now();
      begin
        v_target:=case when v_kind='episode'
          then prep_marquee_cross_resource_20261001.marquee_trakt_resolve_episode(v_item,p_approved)
          else prep_marquee_cross_resource_20261001.marquee_trakt_resolve_catalog(v_kind,v_media,p_approved) end;
        v_result:='skipped';
        if v_feed like 'history_%' then
          select history_id into v_history from prep_marquee_cross_resource_20261001.marquee_watch_history_sources
            where user_id=p_user_id and source='trakt' and source_entity_type=v_kind
              and source_record_id=v_key;
          if v_history is not null then
            update prep_marquee_cross_resource_20261001.marquee_watch_history
              set watched_at=v_at,source_updated_at=v_at,updated_at=now()
              where user_id=p_user_id and id=v_history and source='trakt'
                and watched_at is distinct from v_at;
            if found then v_result:='updated'; end if;
          else
            if v_kind='movie' then
              insert into prep_marquee_cross_resource_20261001.marquee_watch_history
                (user_id,movie_title_id,logical_event_key,watched_at,source,source_record_id,source_updated_at)
                values(p_user_id,v_target,'trakt:movie:'||v_key,v_at,'trakt',v_key,v_at)
                on conflict(user_id,logical_event_key) do update
                  set source_updated_at=excluded.source_updated_at returning id into v_history;
            else
              insert into prep_marquee_cross_resource_20261001.marquee_watch_history
                (user_id,episode_id,logical_event_key,watched_at,source,source_record_id,source_updated_at)
                values(p_user_id,v_target,'trakt:episode:'||v_key,v_at,'trakt',v_key,v_at)
                on conflict(user_id,logical_event_key) do update
                  set source_updated_at=excluded.source_updated_at returning id into v_history;
            end if;
            insert into prep_marquee_cross_resource_20261001.marquee_watch_history_sources
              (user_id,history_id,source,source_entity_type,source_record_id,observed_at)
              values(p_user_id,v_history,'trakt',v_kind,v_key,v_at) on conflict do nothing;
            v_result:='inserted';
          end if;
        elsif v_feed like 'ratings_%' then
          select source,manual_locked,source_updated_at into v_source,v_locked,v_previous
            from prep_marquee_cross_resource_20261001.marquee_ratings where user_id=p_user_id and title_id=v_target;
          if found and (v_locked or v_source='manual' or (v_previous is not null and v_previous>v_at)) then
            v_result:='skipped';
          else
            insert into prep_marquee_cross_resource_20261001.marquee_ratings(user_id,title_id,score,source,source_record_id,source_updated_at)
              values(p_user_id,v_target,(v_item->>'rating')::int,'trakt',v_media_id,v_at)
              on conflict(user_id,title_id) where title_id is not null do update
              set score=excluded.score,source='trakt',source_record_id=excluded.source_record_id,
                  source_updated_at=excluded.source_updated_at,updated_at=now()
              where prep_marquee_cross_resource_20261001.marquee_ratings.manual_locked=false and prep_marquee_cross_resource_20261001.marquee_ratings.source<>'manual'
                and (prep_marquee_cross_resource_20261001.marquee_ratings.source_updated_at is null or
                     prep_marquee_cross_resource_20261001.marquee_ratings.source_updated_at<=excluded.source_updated_at);
            v_result:=case when v_source is null then 'inserted' else 'updated' end;
          end if;
        else
          select source,manual_locked into v_source,v_locked from prep_marquee_cross_resource_20261001.marquee_watchlist
            where user_id=p_user_id and title_id=v_target;
          if found and (v_locked or v_source='manual') then
            v_result:='skipped';
          else
            insert into prep_marquee_cross_resource_20261001.marquee_watchlist(user_id,title_id,source,source_record_id,source_updated_at,added_at)
              values(p_user_id,v_target,'trakt',v_media_id,v_at,v_at)
              on conflict(user_id,title_id) do update
              set source='trakt',source_record_id=excluded.source_record_id,
                  source_updated_at=excluded.source_updated_at,updated_at=now()
              where prep_marquee_cross_resource_20261001.marquee_watchlist.manual_locked=false and prep_marquee_cross_resource_20261001.marquee_watchlist.source<>'manual';
            v_result:=case when v_source is null then 'inserted' else 'updated' end;
          end if;
        end if;
      exception when sqlstate 'PT001' then
        get stacked diagnostics v_reason=message_text;
        v_result:='review';
      end;
      if v_result='review' then
        v_unmapped:=v_unmapped+1;
        if v_feed like 'watchlist_%' then v_watchlist_reviewed:=true; end if;
        insert into prep_marquee_cross_resource_20261001.marquee_mapping_review(source,source_entity_type,source_id,source_title,reason)
          values('trakt',v_kind,v_media_id,v_media->>'title',v_reason)
          on conflict(source,source_entity_type,source_id) where status='open'
          do update set reason=excluded.reason,source_title=excluded.source_title;
      else
        if v_result='inserted' then v_inserted:=v_inserted+1;
        elsif v_result='updated' then v_updated:=v_updated+1;
        else v_skipped:=v_skipped+1; end if;
        select id into v_mapping from prep_marquee_cross_resource_20261001.marquee_source_mappings
          where source='trakt' and source_entity_type=v_kind and source_id=v_media_id;
        update prep_marquee_cross_resource_20261001.marquee_mapping_review set status='resolved',resolved_at=now(),
          resolved_mapping_id=v_mapping,resolution_notes='Resolved by stable source mapping'
          where source='trakt' and source_entity_type=v_kind and source_id=v_media_id and status='open';
        if v_feed like 'watchlist_%' then v_watchlist:=pg_catalog.array_append(v_watchlist,v_target); end if;
      end if;
      update prep_marquee_cross_resource_20261001.marquee_ingest_raw set normalization_status=case when v_result='review' then 'review' else 'mapped' end,
        normalization_error=null where scope_key=v_scope and source='trakt'
          and source_entity_type=v_feed and dedupe_key=v_key;
    end loop;
  end loop;
  if not v_watchlist_reviewed then
    delete from prep_marquee_cross_resource_20261001.marquee_watchlist where user_id=p_user_id and source='trakt'
      and manual_locked=false and not (title_id=any(v_watchlist));
    get diagnostics v_deleted = row_count;
    v_updated:=v_updated+v_deleted;
  end if;
  update prep_marquee_cross_resource_20261001.marquee_sync_runs set status='succeeded',finished_at=now(),
    fetched_count=v_fetched,inserted_count=v_inserted,updated_count=v_updated,
    skipped_count=v_skipped,unmapped_count=v_unmapped
    where id=v_run and status='running';
  if not found then raise exception 'Trakt sync run did not finish'; end if;
  insert into prep_marquee_cross_resource_20261001.marquee_sync_state
    (source,user_id,scope_key,watermark,last_attempt_at,last_success_at,last_success_run_id)
    values('trakt',p_user_id,v_scope,
      pg_catalog.jsonb_build_object('completed_at',now(),'feeds',v_counts),now(),now(),v_run)
    on conflict(source,scope_key) do update set watermark=excluded.watermark,
      last_attempt_at=now(),last_success_at=now(),last_success_run_id=excluded.last_success_run_id,
      last_error=null,consecutive_failures=0,updated_at=now();
  return pg_catalog.jsonb_build_object('fetched',v_fetched,'inserted',v_inserted,
    'updated',v_updated,'skipped',v_skipped,'unmapped',v_unmapped,'run_id',v_run);
end;
$function$
;
CREATE OR REPLACE FUNCTION prep_marquee_cross_resource_20261001.marquee_trakt_mapping_target(p_source text, p_kind text, p_id text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(m.title_id, m.show_title_id, m.movie_title_id, m.season_id, m.episode_id)
  from prep_marquee_cross_resource_20261001.marquee_source_mappings m
  where m.source=p_source and m.source_entity_type=p_kind and m.source_id=p_id
$function$
;
CREATE OR REPLACE FUNCTION prep_marquee_cross_resource_20261001.marquee_trakt_resolve_catalog(p_kind text, p_media jsonb, p_approved jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_ids jsonb:=p_media->'ids'; v_trakt text:=v_ids->>'trakt'; v_source text;
  v_other uuid; v_target uuid; v_old uuid; v_type text; v_anime boolean;
  v_title text:=p_media->>'title'; v_year int;
begin
  if p_kind not in ('show','movie') or jsonb_typeof(v_ids)<>'object' or nullif(btrim(v_trakt),'') is null then
    raise exception using errcode='PT001', message='missing media IDs';
  end if;
  select coalesce(title_id,show_title_id,movie_title_id),canonical_entity_type
    into v_target,v_type from prep_marquee_cross_resource_20261001.marquee_source_mappings
    where source='trakt' and source_entity_type=p_kind and source_id=v_trakt;
  if found and v_type not in (p_kind,'title') then
    raise exception using errcode='PT001', message='Trakt mapping points to a different entity type';
  end if;
  foreach v_source in array array['tmdb','imdb'] loop
    if v_ids->>v_source is not null then
      select coalesce(title_id,show_title_id,movie_title_id) into v_other
        from prep_marquee_cross_resource_20261001.marquee_source_mappings
        where source=v_source and source_entity_type=p_kind and source_id=v_ids->>v_source;
      if v_other is not null then
        if v_target is not null and v_other<>v_target then
          raise exception using errcode='PT001', message='external IDs point to different canonical records';
        end if;
        v_target:=v_other;
      end if;
    end if;
  end loop;
  if p_kind='show' and v_target is null and not (p_approved ? v_trakt) then
    raise exception using errcode='PT001', message='TV show not approved as non-anime';
  end if;
  if v_target is not null then
    select media_type,is_anime into v_type,v_anime from prep_marquee_cross_resource_20261001.marquee_titles where id=v_target;
    if not found or v_type<>p_kind or (p_kind='show' and v_anime)
       or (p_kind='show' and not exists(select 1 from prep_marquee_cross_resource_20261001.marquee_shows where title_id=v_target))
       or (p_kind='movie' and not exists(select 1 from prep_marquee_cross_resource_20261001.marquee_movies where title_id=v_target)) then
      raise exception using errcode='PT001', message='existing catalog identity conflicts with Trakt media type or anime boundary';
    end if;
  else
    if nullif(btrim(v_title),'') is null then
      raise exception using errcode='PT001', message='missing display title';
    end if;
    if p_media->'year' is not null then
      if jsonb_typeof(p_media->'year')<>'number' or (p_media->>'year') !~ '^[0-9]{4}$' then
        raise exception using errcode='PT001', message='invalid release year';
      end if;
      v_year:=(p_media->>'year')::int;
      if v_year not between 1880 and 2200 then
        raise exception using errcode='PT001', message='invalid release year';
      end if;
    end if;
    insert into prep_marquee_cross_resource_20261001.marquee_titles(media_type,display_title,release_year)
      values(p_kind,v_title,v_year) returning id into v_target;
    if p_kind='show' then
      insert into prep_marquee_cross_resource_20261001.marquee_shows(title_id) values(v_target);
    else
      insert into prep_marquee_cross_resource_20261001.marquee_movies(title_id) values(v_target);
    end if;
  end if;
  perform prep_marquee_cross_resource_20261001.marquee_trakt_add_mapping('trakt',p_kind,v_trakt,p_kind,v_target);
  foreach v_source in array array['tmdb','imdb'] loop
    if v_ids->>v_source is not null then
      perform prep_marquee_cross_resource_20261001.marquee_trakt_add_mapping(v_source,p_kind,v_ids->>v_source,p_kind,v_target);
    end if;
  end loop;
  return v_target;
end;
$function$
;
CREATE OR REPLACE FUNCTION prep_marquee_cross_resource_20261001.marquee_trakt_resolve_episode(p_item jsonb, p_approved jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_show uuid; v_season int; v_number int; v_season_id uuid;
  v_target uuid; v_existing uuid; v_trakt text:=p_item#>>'{episode,ids,trakt}';
begin
  v_show:=prep_marquee_cross_resource_20261001.marquee_trakt_resolve_catalog('show',p_item->'show',p_approved);
  if jsonb_typeof(p_item#>'{episode,season}')<>'number' or
     (p_item#>>'{episode,season}') !~ '^[0-9]+$' or
     jsonb_typeof(p_item#>'{episode,number}')<>'number' or
     (p_item#>>'{episode,number}') !~ '^[0-9]+$' then
    raise exception using errcode='PT001', message='episode lacks valid season or episode number';
  end if;
  v_season:=(p_item#>>'{episode,season}')::int;
  v_number:=(p_item#>>'{episode,number}')::int;
  if v_number<=0 or nullif(btrim(v_trakt),'') is null then
    raise exception using errcode='PT001', message='episode lacks a positive number or stable ID';
  end if;
  select id into v_season_id from prep_marquee_cross_resource_20261001.marquee_seasons
    where show_title_id=v_show and season_number=v_season;
  if v_season_id is null then
    insert into prep_marquee_cross_resource_20261001.marquee_seasons(show_title_id,season_number)
      values(v_show,v_season) returning id into v_season_id;
  end if;
  select id into v_target from prep_marquee_cross_resource_20261001.marquee_episodes
    where season_id=v_season_id and episode_number=v_number;
  v_existing:=prep_marquee_cross_resource_20261001.marquee_trakt_mapping_target('trakt','episode',v_trakt);
  if v_existing is not null and v_target is not null and v_existing<>v_target then
    raise exception using errcode='PT001', message='episode ID conflicts with episode number';
  end if;
  if v_existing is not null and v_target is null then
    raise exception using errcode='PT001', message='mapped episode moved to a different number';
  end if;
  if v_target is not null and exists(
    select 1 from prep_marquee_cross_resource_20261001.marquee_source_mappings where source='trakt' and source_entity_type='episode'
      and episode_id=v_target and source_id<>v_trakt
  ) then
    raise exception using errcode='PT001', message='another stable episode ID uses this number';
  end if;
  if v_target is null then
    insert into prep_marquee_cross_resource_20261001.marquee_episodes(season_id,episode_number,display_title)
      values(v_season_id,v_number,p_item#>>'{episode,title}') returning id into v_target;
  end if;
  perform prep_marquee_cross_resource_20261001.marquee_trakt_add_mapping('trakt','episode',v_trakt,'episode',v_target);
  return v_target;
end;
$function$
;
-- Render barrier_marquee_cross_resource_20261001 to a reviewed private schema. Never install on public without approval.
CREATE SCHEMA barrier_marquee_cross_resource_20261001;
REVOKE ALL ON SCHEMA barrier_marquee_cross_resource_20261001 FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA barrier_marquee_cross_resource_20261001 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE barrier_marquee_cross_resource_20261001.control (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 app text NOT NULL, mode text NOT NULL DEFAULT 'open' CHECK(mode IN('open','draining','paused')),
 epoch bigint NOT NULL DEFAULT 0, paused_at timestamptz, abort_at timestamptz, deadline timestamptz,
 native_enabled boolean NOT NULL DEFAULT false, enrollment_enabled boolean NOT NULL DEFAULT false,
 dual_writes boolean NOT NULL DEFAULT true
);
INSERT INTO barrier_marquee_cross_resource_20261001.control(app) VALUES('marquee');
CREATE TABLE barrier_marquee_cross_resource_20261001.registry (
 relation regclass PRIMARY KEY, logical_name text UNIQUE NOT NULL, pk text[] NOT NULL CHECK(cardinality(pk)>0)
);
CREATE TABLE barrier_marquee_cross_resource_20261001.journal (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, epoch bigint NOT NULL,
 xid bigint NOT NULL DEFAULT txid_current(), relation regclass NOT NULL,
 logical_name text NOT NULL, operation text NOT NULL CHECK(operation IN('INSERT','UPDATE','DELETE')),
 old_key jsonb, new_key jsonb, before_row jsonb, after_row jsonb, at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE barrier_marquee_cross_resource_20261001.receipts(batch_id text PRIMARY KEY,payload_hash text NOT NULL,changed bigint NOT NULL,at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION barrier_marquee_cross_resource_20261001.gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c barrier_marquee_cross_resource_20261001.control%rowtype;
BEGIN
 -- The shared row lock lives until commit. A pause UPDATE waits for admitted writers.
 SELECT * INTO STRICT c FROM barrier_marquee_cross_resource_20261001.control WHERE id FOR SHARE;
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
 IF c.mode<>'open' THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION barrier_marquee_cross_resource_20261001.record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r barrier_marquee_cross_resource_20261001.registry%rowtype; b jsonb; a jsonb; bk jsonb; ak jsonb; e bigint;
BEGIN
 SELECT * INTO STRICT r FROM barrier_marquee_cross_resource_20261001.registry WHERE relation=TG_RELID;
 SELECT epoch INTO STRICT e FROM barrier_marquee_cross_resource_20261001.control WHERE id;
 IF TG_OP<>'INSERT' THEN b=to_jsonb(OLD); SELECT jsonb_agg(b->k ORDER BY ord) INTO bk FROM unnest(r.pk) WITH ORDINALITY p(k,ord); END IF;
 IF TG_OP<>'DELETE' THEN a=to_jsonb(NEW); SELECT jsonb_agg(a->k ORDER BY ord) INTO ak FROM unnest(r.pk) WITH ORDINALITY p(k,ord); END IF;
 IF b IS NOT DISTINCT FROM a THEN RETURN NULL; END IF;
 INSERT INTO barrier_marquee_cross_resource_20261001.journal(epoch,relation,logical_name,operation,old_key,new_key,before_row,after_row)
 VALUES(e,TG_RELID,r.logical_name,TG_OP,bk,ak,b,a);
 RETURN NULL;
END $$;
CREATE FUNCTION barrier_marquee_cross_resource_20261001.register(t regclass,logical text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE keys text[];
BEGIN
 SELECT array_agg(a.attname ORDER BY ord) INTO keys FROM pg_catalog.pg_constraint c
 CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY p(attnum,ord)
 JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=p.attnum
 WHERE c.conrelid=t AND c.contype='p';
 IF keys IS NULL THEN RAISE EXCEPTION 'PRIMARY_KEY_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=t AND attgenerated<>'') THEN RAISE EXCEPTION 'GENERATED_COLUMN_REVIEW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=t AND NOT tgisinternal AND tgenabled<>'O') THEN RAISE EXCEPTION 'TRIGGER_MODE_REVIEW_REQUIRED'; END IF;
 INSERT INTO barrier_marquee_cross_resource_20261001.registry VALUES(t,logical,keys);
 EXECUTE format('CREATE TRIGGER migration_gate BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON %s FOR EACH STATEMENT EXECUTE FUNCTION barrier_marquee_cross_resource_20261001.gate()',t);
 EXECUTE format('CREATE TRIGGER migration_journal AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION barrier_marquee_cross_resource_20261001.record()',t);
END $$;
CREATE FUNCTION barrier_marquee_cross_resource_20261001.pause() RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c barrier_marquee_cross_resource_20261001.control%rowtype;
BEGIN
 -- Caller uses lock_timeout; never wait unboundedly for a long writer.
 UPDATE barrier_marquee_cross_resource_20261001.control SET mode='draining',epoch=epoch+1,paused_at=clock_timestamp(),
 abort_at=clock_timestamp()+interval '10 minutes',deadline=clock_timestamp()+interval '15 minutes'
 WHERE id AND mode='open' RETURNING * INTO c;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAUSE_ALREADY_ACTIVE'; END IF;
 RETURN to_jsonb(c);
END $$;
CREATE FUNCTION barrier_marquee_cross_resource_20261001.drained(running bigint,leases bigint,external_verified boolean) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF running<>0 OR leases<>0 OR NOT external_verified THEN RAISE EXCEPTION 'WRITERS_NOT_DRAINED'; END IF;
 UPDATE barrier_marquee_cross_resource_20261001.control SET mode='paused' WHERE id AND mode='draining' AND clock_timestamp()<abort_at;
 IF NOT FOUND THEN RAISE EXCEPTION 'ABORT_DEADLINE_OR_WRONG_PHASE'; END IF;
END $$;
CREATE FUNCTION barrier_marquee_cross_resource_20261001.resume() RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 -- No timer silently reopens writers during copy/rollback. The operator explicitly aborts/resumes.
 UPDATE barrier_marquee_cross_resource_20261001.control SET mode='open',paused_at=NULL,abort_at=NULL,deadline=NULL WHERE id;
END $$;
CREATE FUNCTION barrier_marquee_cross_resource_20261001.apply(batch text, changes jsonb) RETURNS bigint LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb; r barrier_marquee_cross_resource_20261001.registry%rowtype; existing jsonb; predicate text; columns text; assignments text;
 before_value jsonb; after_value jsonb; changed bigint=0; receipt barrier_marquee_cross_resource_20261001.receipts%rowtype; payload_hash text;
BEGIN
 IF jsonb_typeof(changes)<>'array' THEN RAISE EXCEPTION 'INVALID_CHANGESET'; END IF;
 -- Excludes every admitted writer, and serializes apply/replay.
 PERFORM 1 FROM barrier_marquee_cross_resource_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 payload_hash=md5(changes::text);
 SELECT * INTO receipt FROM barrier_marquee_cross_resource_20261001.receipts WHERE batch_id=batch;
 IF FOUND THEN
  IF receipt.payload_hash<>payload_hash THEN RAISE EXCEPTION 'REPLAY_PAYLOAD_CHANGED'; END IF;
  RETURN 0;
 END IF;
 -- Verify/lock all registered targets before disabling derivation triggers inside this transaction.
 FOR r IN SELECT * FROM barrier_marquee_cross_resource_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('LOCK TABLE %s IN ACCESS EXCLUSIVE MODE',r.relation);
 END LOOP;
 FOR r IN SELECT * FROM barrier_marquee_cross_resource_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s DISABLE TRIGGER USER',r.relation);
 END LOOP;
 SET CONSTRAINTS ALL DEFERRED;
 FOR item IN SELECT value FROM jsonb_array_elements(changes) LOOP
  SELECT * INTO STRICT r FROM barrier_marquee_cross_resource_20261001.registry WHERE logical_name=item->>'table';
  before_value=item->'before'; after_value=item->'after';
  IF before_value='null'::jsonb THEN before_value=NULL; END IF;
  IF after_value='null'::jsonb THEN after_value=NULL; END IF;
  IF before_value IS NULL AND after_value IS NULL THEN RAISE EXCEPTION 'EMPTY_CHANGE'; END IF;
  SELECT string_agg(format('t.%I IS NOT DISTINCT FROM (jsonb_populate_record(NULL::%s,$1)).%I',k,r.relation,k),' AND ') INTO predicate FROM unnest(r.pk) k;
  EXECUTE format('SELECT to_jsonb(t) FROM %s t WHERE %s FOR UPDATE',r.relation,predicate)
  INTO existing USING coalesce(before_value,after_value);
  IF existing IS NOT DISTINCT FROM after_value THEN CONTINUE; END IF;
  IF existing IS DISTINCT FROM before_value THEN RAISE EXCEPTION 'DELTA_CONFLICT:%',r.logical_name; END IF;
  IF after_value IS NULL THEN
   EXECUTE format('DELETE FROM %s t WHERE %s',r.relation,predicate) USING before_value;
  ELSIF before_value IS NULL THEN
   EXECUTE format('INSERT INTO %s OVERRIDING SYSTEM VALUE SELECT (jsonb_populate_record(NULL::%s,$1)).*',r.relation,r.relation) USING after_value;
  ELSE
   SELECT string_agg(format('%I',attname),','),string_agg(format('%I=(jsonb_populate_record(NULL::%s,$2)).%I',attname,r.relation,attname),',')
   INTO columns,assignments FROM pg_catalog.pg_attribute WHERE attrelid=r.relation AND attnum>0 AND NOT attisdropped AND attgenerated='' AND attidentity<>'a';
   EXECUTE format('UPDATE %s t SET %s WHERE %s',r.relation,assignments,predicate) USING before_value,after_value;
  END IF;
  changed=changed+1;
 END LOOP;
 FOR r IN SELECT * FROM barrier_marquee_cross_resource_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s ENABLE TRIGGER USER',r.relation);
 END LOOP;
 SET CONSTRAINTS ALL IMMEDIATE;
 INSERT INTO barrier_marquee_cross_resource_20261001.receipts VALUES(batch,payload_hash,changed,now());
 RETURN changed;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA barrier_marquee_cross_resource_20261001 FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA barrier_marquee_cross_resource_20261001 FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA barrier_marquee_cross_resource_20261001 FROM PUBLIC;


-- Reviewed isolated safeguards extension; render barrier_marquee_cross_resource_20261001 only after isolation review.
CREATE TABLE barrier_marquee_cross_resource_20261001.sealed_batches(batch_id text primary key,direction text not null check(direction in('forward','reverse')),lower_id bigint not null,upper_id bigint not null,payload jsonb not null,payload_hash text not null,created_at timestamptz not null default now());
CREATE TABLE barrier_marquee_cross_resource_20261001.writer_leases(id uuid primary key,kind text not null,epoch bigint not null,expires_at timestamptz not null,released_at timestamptz);
CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE c barrier_marquee_cross_resource_20261001.control%rowtype; admitted boolean=false; value text;
BEGIN
SELECT * INTO STRICT c FROM barrier_marquee_cross_resource_20261001.control WHERE id FOR SHARE;
IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
value=current_setting('migration.writer_lease',true);
IF c.mode='draining' AND value IS NOT NULL AND value~'^[0-9a-f-]{36}$' AND clock_timestamp()<c.abort_at THEN
SELECT EXISTS(SELECT 1 FROM barrier_marquee_cross_resource_20261001.writer_leases WHERE id=value::uuid AND released_at IS NULL AND expires_at>clock_timestamp() AND epoch=c.epoch-1) INTO admitted;
END IF;
IF c.mode<>'open' AND NOT admitted THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.drained(running bigint, leases bigint, external_verified boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
IF running<>0 OR leases<>0 OR NOT external_verified OR EXISTS(SELECT 1 FROM barrier_marquee_cross_resource_20261001.writer_leases WHERE released_at IS NULL) THEN RAISE EXCEPTION 'WRITERS_NOT_DRAINED'; END IF;
UPDATE barrier_marquee_cross_resource_20261001.control SET mode='paused' WHERE id AND mode='draining' AND clock_timestamp()<abort_at;
IF NOT FOUND THEN RAISE EXCEPTION 'ABORT_DEADLINE_OR_WRONG_PHASE'; END IF;
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.full_key_delta(source regclass, target regclass, logical text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE r barrier_marquee_cross_resource_20261001.registry%rowtype; predicate text; payload jsonb; sc text[]; tc text[];
BEGIN
SELECT * INTO STRICT r FROM barrier_marquee_cross_resource_20261001.registry WHERE relation=target AND logical_name=logical;
SELECT array_agg(attname ORDER BY attname COLLATE "C") INTO sc FROM pg_attribute WHERE attrelid=source AND attnum>0 AND NOT attisdropped;
SELECT array_agg(attname ORDER BY attname COLLATE "C") INTO tc FROM pg_attribute WHERE attrelid=target AND attnum>0 AND NOT attisdropped;
IF sc IS DISTINCT FROM tc THEN RAISE EXCEPTION 'SCHEMA_DRIFT_REVIEW_REQUIRED'; END IF;
SELECT string_agg(format('s.%I=t.%I',k,k),' AND ') INTO predicate FROM unnest(r.pk) k;
EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''table'',$1,''before'',to_jsonb(t),''after'',to_jsonb(s)) ORDER BY coalesce(to_jsonb(s),to_jsonb(t))::text COLLATE "C"),''[]''::jsonb) FROM %s s FULL JOIN %s t ON %s WHERE to_jsonb(s) IS DISTINCT FROM to_jsonb(t)',source,target,predicate) INTO payload USING logical;
RETURN payload;
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.seal_journal(batch text, lower_bound bigint, reverse_direction boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE upper_bound bigint; payload jsonb; direction_value text; old barrier_marquee_cross_resource_20261001.sealed_batches%rowtype;
BEGIN
PERFORM 1 FROM barrier_marquee_cross_resource_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
SELECT * INTO old FROM barrier_marquee_cross_resource_20261001.sealed_batches WHERE batch_id=batch;
IF FOUND THEN
IF old.lower_id<>lower_bound OR (old.direction='reverse')<>reverse_direction THEN RAISE EXCEPTION 'REPLAY_PAYLOAD_CHANGED'; END IF;
RETURN jsonb_build_object('batch',batch,'lower',old.lower_id,'upper',old.upper_id,'changes',jsonb_array_length(old.payload),'hash',old.payload_hash,'reused',true);
END IF;
SELECT coalesce(max(id),0) INTO upper_bound FROM barrier_marquee_cross_resource_20261001.journal;
IF lower_bound<0 OR lower_bound>upper_bound THEN RAISE EXCEPTION 'INVALID_JOURNAL_BOUND'; END IF;
direction_value=CASE WHEN reverse_direction THEN 'reverse' ELSE 'forward' END;
SELECT coalesce(jsonb_agg(jsonb_build_object('table',logical_name,'before',CASE WHEN reverse_direction THEN after_row ELSE before_row END,'after',CASE WHEN reverse_direction THEN before_row ELSE after_row END) ORDER BY CASE WHEN reverse_direction THEN -id ELSE id END),'[]'::jsonb) INTO payload FROM barrier_marquee_cross_resource_20261001.journal WHERE id>lower_bound AND id<=upper_bound;
INSERT INTO barrier_marquee_cross_resource_20261001.sealed_batches VALUES(batch,direction_value,lower_bound,upper_bound,payload,md5(payload::text),now());
RETURN jsonb_build_object('batch',batch,'lower',lower_bound,'upper',upper_bound,'changes',jsonb_array_length(payload),'hash',md5(payload::text),'reused',false);
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.advance_sequences()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE r record; seq text; maximum bigint; previous bigint; advanced integer=0;
BEGIN
PERFORM 1 FROM barrier_marquee_cross_resource_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
FOR r IN SELECT reg.relation,a.attname FROM barrier_marquee_cross_resource_20261001.registry reg JOIN pg_attribute a ON a.attrelid=reg.relation WHERE a.attnum>0 AND NOT a.attisdropped LOOP
seq=pg_get_serial_sequence(r.relation::text,r.attname);
IF seq IS NULL THEN CONTINUE; END IF;
EXECUTE format('SELECT max(%I) FROM %s',r.attname,r.relation) INTO maximum;
EXECUTE format('SELECT last_value FROM %s',seq) INTO previous;
IF maximum IS NOT NULL AND maximum>previous THEN PERFORM setval(seq::regclass,maximum,true);advanced=advanced+1; END IF;
END LOOP;
RETURN advanced;
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.acquire_lease(lease_id uuid, writer_kind text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE e bigint;
BEGIN
SELECT epoch INTO e FROM barrier_marquee_cross_resource_20261001.control WHERE id AND mode='open' FOR SHARE;
IF NOT FOUND THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED'; END IF;
INSERT INTO barrier_marquee_cross_resource_20261001.writer_leases VALUES(lease_id,writer_kind,e,clock_timestamp()+interval '9 minutes',NULL);
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.release_lease(lease_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN UPDATE barrier_marquee_cross_resource_20261001.writer_leases SET released_at=clock_timestamp() WHERE id=lease_id AND released_at IS NULL; END $function$;

REVOKE ALL ON barrier_marquee_cross_resource_20261001.sealed_batches,barrier_marquee_cross_resource_20261001.writer_leases FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA barrier_marquee_cross_resource_20261001 FROM PUBLIC;


-- Private-only engine hardening. Render a reviewed schema; never install on production without approval.
-- seal_journal(..., true) is UNDO, not a migration rollback. Transfer preserves before/after.
CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.apply(batch text, changes jsonb) RETURNS bigint LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb; r barrier_marquee_cross_resource_20261001.registry%rowtype; existing jsonb; predicate text; columns text; assignments text;
 before_value jsonb; after_value jsonb; changed bigint=0; receipt barrier_marquee_cross_resource_20261001.receipts%rowtype; payload_hash text; identity_move boolean;
BEGIN
 IF jsonb_typeof(changes)<>'array' THEN RAISE EXCEPTION 'INVALID_CHANGESET'; END IF;
 -- Excludes every admitted writer, and serializes apply/replay.
 PERFORM 1 FROM barrier_marquee_cross_resource_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 payload_hash=md5(changes::text);
 SELECT * INTO receipt FROM barrier_marquee_cross_resource_20261001.receipts WHERE batch_id=batch;
 IF FOUND THEN
  IF receipt.payload_hash<>payload_hash THEN RAISE EXCEPTION 'REPLAY_PAYLOAD_CHANGED'; END IF;
  RETURN 0;
 END IF;
 -- Verify/lock all registered targets before disabling derivation triggers inside this transaction.
 FOR r IN SELECT * FROM barrier_marquee_cross_resource_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('LOCK TABLE %s IN ACCESS EXCLUSIVE MODE',r.relation);
 END LOOP;
 FOR r IN SELECT * FROM barrier_marquee_cross_resource_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s DISABLE TRIGGER USER',r.relation);
 END LOOP;
 SET CONSTRAINTS ALL DEFERRED;
 FOR item IN SELECT value FROM jsonb_array_elements(changes) LOOP
  SELECT * INTO STRICT r FROM barrier_marquee_cross_resource_20261001.registry WHERE logical_name=item->>'table';
  before_value=item->'before'; after_value=item->'after';
  IF before_value='null'::jsonb THEN before_value=NULL; END IF;
  IF after_value='null'::jsonb THEN after_value=NULL; END IF;
  IF before_value IS NULL AND after_value IS NULL THEN RAISE EXCEPTION 'EMPTY_CHANGE'; END IF;
  SELECT string_agg(format('t.%I IS NOT DISTINCT FROM (jsonb_populate_record(NULL::%s,$1)).%I',k,r.relation,k),' AND ') INTO predicate FROM unnest(r.pk) k;
  EXECUTE format('SELECT to_jsonb(t) FROM %s t WHERE %s FOR UPDATE',r.relation,predicate)
  INTO existing USING coalesce(before_value,after_value);
  IF existing IS NOT DISTINCT FROM after_value THEN CONTINUE; END IF;
  IF existing IS DISTINCT FROM before_value THEN RAISE EXCEPTION 'DELTA_CONFLICT:%',r.logical_name; END IF;
  IF after_value IS NULL THEN
   EXECUTE format('DELETE FROM %s t WHERE %s',r.relation,predicate) USING before_value;
  ELSIF before_value IS NULL THEN
   EXECUTE format('INSERT INTO %s OVERRIDING SYSTEM VALUE SELECT (jsonb_populate_record(NULL::%s,$1)).*',r.relation,r.relation) USING after_value;
  ELSE
   SELECT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=r.relation AND attidentity='a' AND (before_value->attname) IS DISTINCT FROM (after_value->attname)) INTO identity_move;
   IF identity_move THEN
    EXECUTE format('DELETE FROM %s t WHERE %s',r.relation,predicate) USING before_value;
    EXECUTE format('INSERT INTO %s OVERRIDING SYSTEM VALUE SELECT (jsonb_populate_record(NULL::%s,$1)).*',r.relation,r.relation) USING after_value;
   ELSE
   SELECT string_agg(format('%I',attname),','),string_agg(format('%I=(jsonb_populate_record(NULL::%s,$2)).%I',attname,r.relation,attname),',')
   INTO columns,assignments FROM pg_catalog.pg_attribute WHERE attrelid=r.relation AND attnum>0 AND NOT attisdropped AND attgenerated='' AND attidentity<>'a';
   EXECUTE format('UPDATE %s t SET %s WHERE %s',r.relation,assignments,predicate) USING before_value,after_value;
   END IF;
  END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM %s t WHERE %s',r.relation,predicate) INTO existing USING coalesce(after_value,before_value);
  IF existing IS DISTINCT FROM after_value THEN RAISE EXCEPTION 'DELTA_POSTIMAGE_CONFLICT:%',r.logical_name; END IF;
  changed=changed+1;
 END LOOP;
 SET CONSTRAINTS ALL IMMEDIATE;
 FOR r IN SELECT * FROM barrier_marquee_cross_resource_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s ENABLE TRIGGER USER',r.relation);
 END LOOP;
 INSERT INTO barrier_marquee_cross_resource_20261001.receipts VALUES(batch,payload_hash,changed,now());
 RETURN changed;
END $$;

CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.seal_rollback_transfer(batch text, lower_bound bigint)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $transfer$
DECLARE receipt jsonb;
BEGIN
receipt=barrier_marquee_cross_resource_20261001.seal_journal(batch,lower_bound,false);
RETURN receipt||jsonb_build_object('purpose','native-to-retained-preserve-new-changes','undo',false);
END $transfer$;
CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.full_key_delta(source regclass,target regclass,logical text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $delta$
DECLARE r barrier_marquee_cross_resource_20261001.registry%rowtype; sc text[]; tc text[]; predicate text; key_columns text; null_predicate text; bad boolean; payload jsonb;
BEGIN
SELECT * INTO STRICT r FROM barrier_marquee_cross_resource_20261001.registry WHERE relation=target AND logical_name=logical;
SELECT array_agg(attname ORDER BY attname COLLATE "C") INTO sc FROM pg_attribute WHERE attrelid=source AND attnum>0 AND NOT attisdropped;
SELECT array_agg(attname ORDER BY attname COLLATE "C") INTO tc FROM pg_attribute WHERE attrelid=target AND attnum>0 AND NOT attisdropped;
IF sc IS DISTINCT FROM tc THEN RAISE EXCEPTION 'SCHEMA_DRIFT_REVIEW_REQUIRED'; END IF;
SELECT string_agg(format('%I',k),','),string_agg(format('%I IS NULL',k),' OR '),string_agg(format('s.%I=t.%I',k,k),' AND ') INTO key_columns,null_predicate,predicate FROM unnest(r.pk) k;
EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s WHERE %s) OR EXISTS(SELECT 1 FROM %s GROUP BY %s HAVING count(*)>1)',source,null_predicate,source,key_columns) INTO bad;
IF bad THEN RAISE EXCEPTION 'SOURCE_KEY_COVERAGE_INVALID'; END IF;
EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''table'',$1,''before'',to_jsonb(t),''after'',to_jsonb(s)) ORDER BY coalesce(to_jsonb(s),to_jsonb(t))::text COLLATE "C"),''[]''::jsonb) FROM %s s FULL JOIN %s t ON %s WHERE to_jsonb(s) IS DISTINCT FROM to_jsonb(t)',source,target,predicate) INTO payload USING logical;
RETURN payload;
END $delta$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA barrier_marquee_cross_resource_20261001 FROM PUBLIC;

-- This file is inert. Render only a reviewed private barrier schema during preparation.
CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.admit(lease_id uuid DEFAULT NULL, terminal boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c barrier_marquee_cross_resource_20261001.control%rowtype; l barrier_marquee_cross_resource_20261001.writer_leases%rowtype;
BEGIN
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM set_config('statement_timeout','25s',true);
 SELECT * INTO STRICT c FROM barrier_marquee_cross_resource_20261001.control WHERE id FOR SHARE;
 IF c.mode='paused' OR (c.mode='draining' AND clock_timestamp()>=c.abort_at) THEN
  RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000';
 END IF;
 IF lease_id IS NOT NULL THEN
  SELECT * INTO l FROM barrier_marquee_cross_resource_20261001.writer_leases WHERE id=lease_id FOR SHARE;
  IF NOT FOUND OR l.released_at IS NOT NULL OR l.epoch<>(CASE WHEN c.mode='draining' THEN c.epoch-1 ELSE c.epoch END)
     OR (NOT terminal AND l.expires_at<=clock_timestamp()) THEN
   RAISE EXCEPTION 'MIGRATION_LEASE_LOST' USING ERRCODE='55000';
  END IF;

 ELSIF c.mode<>'open' THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
 PERFORM set_config('migration.writer_lease',coalesce(lease_id::text,''),true);
 PERFORM set_config('migration.writer_terminal',terminal::text,true);
END $$;
CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c barrier_marquee_cross_resource_20261001.control%rowtype; admitted boolean=false; value text; terminal boolean;
BEGIN
 SELECT * INTO STRICT c FROM barrier_marquee_cross_resource_20261001.control WHERE id FOR SHARE;
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
 value=current_setting('migration.writer_lease',true);
 terminal=coalesce(current_setting('migration.writer_terminal',true),'false')='true';
 IF terminal AND TG_TABLE_NAME NOT IN ('gamedeck_import_runs','gamedeck_import_controls','gamedeck_import_leases','marquee_import_runs','marquee_import_controls') THEN
  RAISE EXCEPTION 'TERMINAL_WRITER_TABLE_DENIED' USING ERRCODE='55000';
 END IF;
 IF value IS NOT NULL AND value<>'' THEN
  SELECT EXISTS(SELECT 1 FROM barrier_marquee_cross_resource_20261001.writer_leases WHERE id=value::uuid AND released_at IS NULL
    AND (terminal OR expires_at>clock_timestamp()) AND epoch=CASE WHEN c.mode='draining' THEN c.epoch-1 ELSE c.epoch END) INTO admitted;
  IF NOT admitted THEN RAISE EXCEPTION 'MIGRATION_LEASE_LOST' USING ERRCODE='55000'; END IF;
 END IF;
 IF c.mode='paused' OR (c.mode='draining' AND (NOT admitted OR clock_timestamp()>=c.abort_at)) THEN
  RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000';
 END IF;
 RETURN NULL;
END $$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA barrier_marquee_cross_resource_20261001 FROM PUBLIC;

CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.advance_sequences() RETURNS integer LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r record; seq text; maximum bigint; previous bigint; called boolean; advanced integer=0; ns text;
BEGIN
 PERFORM 1 FROM barrier_marquee_cross_resource_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 FOR r IN SELECT reg.relation,a.attname FROM barrier_marquee_cross_resource_20261001.registry reg JOIN pg_attribute a ON a.attrelid=reg.relation WHERE a.attnum>0 AND NOT a.attisdropped LOOP
  seq=pg_get_serial_sequence(r.relation::text,r.attname); IF seq IS NULL THEN CONTINUE; END IF;
  SELECT n.nspname INTO ns FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=seq::regclass;
  IF ns='public' OR ns='auth' THEN RAISE EXCEPTION 'PRIVATE_SEQUENCE_REQUIRED'; END IF;
  EXECUTE format('SELECT max(%I) FROM %s',r.attname,r.relation) INTO maximum;
  EXECUTE format('SELECT last_value,is_called FROM %s',seq) INTO previous,called;
  IF maximum IS NOT NULL AND (maximum>previous OR (maximum=previous AND NOT called)) THEN
   PERFORM setval(seq::regclass,maximum,true);advanced=advanced+1;
  END IF;
 END LOOP; RETURN advanced;
END $$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA barrier_marquee_cross_resource_20261001 FROM PUBLIC;


-- Inert engine extension. Render a reviewed barrier; no production table is altered by this file.
CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.require_binding(expected jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item record; target regclass; keys text[]; n integer;
BEGIN
 IF jsonb_typeof(expected)<>'object' OR expected='{}'::jsonb THEN RAISE EXCEPTION 'MIGRATION_BINDING_INVALID'; END IF;
 SELECT count(*) INTO n FROM jsonb_object_keys(expected);
 IF n<>(SELECT count(*) FROM barrier_marquee_cross_resource_20261001.registry) OR n<>(SELECT count(DISTINCT value) FROM jsonb_each_text(expected)) THEN RAISE EXCEPTION 'MIGRATION_BINDING_INCOMPLETE'; END IF;
 FOR item IN SELECT key,value FROM jsonb_each_text(expected) LOOP
  target=to_regclass(item.value);
  IF target IS NULL OR NOT EXISTS(SELECT 1 FROM barrier_marquee_cross_resource_20261001.registry WHERE logical_name=item.key AND relation=target) THEN RAISE EXCEPTION 'MIGRATION_BINDING_MISMATCH'; END IF;
  SELECT array_agg(a.attname ORDER BY ord) INTO keys FROM pg_constraint c CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY p(num,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=p.num WHERE c.conrelid=target AND c.contype='p';
  IF keys IS NULL OR keys IS DISTINCT FROM (SELECT pk FROM barrier_marquee_cross_resource_20261001.registry WHERE relation=target) THEN RAISE EXCEPTION 'MIGRATION_BINDING_KEY_MISMATCH'; END IF;
  SELECT count(*) INTO n FROM pg_trigger WHERE tgrelid=target AND NOT tgisinternal AND tgenabled='O' AND (
   (tgname='migration_gate' AND tgfoid='barrier_marquee_cross_resource_20261001.gate()'::regprocedure AND tgtype=62) OR
   (tgname='migration_journal' AND tgfoid='barrier_marquee_cross_resource_20261001.record()'::regprocedure AND tgtype=29));
  IF n<>2 THEN RAISE EXCEPTION 'MIGRATION_BINDING_TRIGGER_MISMATCH'; END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION barrier_marquee_cross_resource_20261001.admit_bound(lease_id uuid,terminal boolean,expected jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM barrier_marquee_cross_resource_20261001.admit(lease_id,terminal);
 PERFORM barrier_marquee_cross_resource_20261001.require_binding(expected);
END $$;
REVOKE EXECUTE ON FUNCTION barrier_marquee_cross_resource_20261001.require_binding(jsonb),barrier_marquee_cross_resource_20261001.admit_bound(uuid,boolean,jsonb) FROM PUBLIC; 

SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_episodes'::regclass,'marquee_episodes');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_franchise_overrides'::regclass,'marquee_franchise_overrides');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_ingest_raw'::regclass,'marquee_ingest_raw');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_mapping_review'::regclass,'marquee_mapping_review');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_movies'::regclass,'marquee_movies');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_ratings'::regclass,'marquee_ratings');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_season_release_schedules'::regclass,'marquee_season_release_schedules');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_seasons'::regclass,'marquee_seasons');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_shows'::regclass,'marquee_shows');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_source_mappings'::regclass,'marquee_source_mappings');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_statuses'::regclass,'marquee_statuses');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_sync_runs'::regclass,'marquee_sync_runs');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_sync_state'::regclass,'marquee_sync_state');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_titles'::regclass,'marquee_titles');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_undated_completion_evidence'::regclass,'marquee_undated_completion_evidence');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_undated_completions'::regclass,'marquee_undated_completions');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_verified_season_totals'::regclass,'marquee_verified_season_totals');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_watch_date_decisions'::regclass,'marquee_watch_date_decisions');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_watch_history'::regclass,'marquee_watch_history');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_watch_history_sources'::regclass,'marquee_watch_history_sources');
SELECT barrier_marquee_cross_resource_20261001.register('prep_marquee_cross_resource_20261001.marquee_watchlist'::regclass,'marquee_watchlist');
CREATE TABLE prep_marquee_cross_resource_20261001.remote_receipts(run_id uuid PRIMARY KEY,snapshot_sha256 text NOT NULL,result jsonb NOT NULL,committed_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON ALL TABLES IN SCHEMA prep_marquee_cross_resource_20261001 FROM PUBLIC,anon,authenticated,service_role;REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA prep_marquee_cross_resource_20261001 FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_episodes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_episodes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_episodes ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_franchise_overrides ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_franchise_overrides ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_franchise_overrides ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ingest_raw ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ingest_raw ALTER COLUMN fetched_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ingest_raw ALTER COLUMN last_seen_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ingest_raw ALTER COLUMN normalization_status SET DEFAULT 'pending'::text;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_mapping_review ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_mapping_review ALTER COLUMN candidates SET DEFAULT '[]'::jsonb;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_mapping_review ALTER COLUMN status SET DEFAULT 'open'::text;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_mapping_review ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_movies ALTER COLUMN media_type SET DEFAULT 'movie'::text;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_movies ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ratings ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ratings ALTER COLUMN manual_locked SET DEFAULT false;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ratings ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_ratings ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_season_release_schedules ALTER COLUMN reviewed_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_seasons ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_seasons ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_seasons ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_shows ALTER COLUMN media_type SET DEFAULT 'show'::text;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_shows ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings ALTER COLUMN manual_locked SET DEFAULT false;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_source_mappings ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_statuses ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_statuses ALTER COLUMN manual_locked SET DEFAULT false;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_statuses ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_statuses ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ALTER COLUMN started_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ALTER COLUMN status SET DEFAULT 'running'::text;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ALTER COLUMN fetched_count SET DEFAULT 0;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ALTER COLUMN inserted_count SET DEFAULT 0;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ALTER COLUMN updated_count SET DEFAULT 0;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ALTER COLUMN skipped_count SET DEFAULT 0;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ALTER COLUMN unmapped_count SET DEFAULT 0;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_runs ALTER COLUMN error_count SET DEFAULT 0;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_state ALTER COLUMN watermark SET DEFAULT '{}'::jsonb;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_state ALTER COLUMN consecutive_failures SET DEFAULT 0;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_sync_state ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_titles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_titles ALTER COLUMN is_anime SET DEFAULT false;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_titles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_titles ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completion_evidence ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completion_evidence ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completions ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_undated_completions ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_verified_season_totals ALTER COLUMN reviewed_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_date_decisions ALTER COLUMN decided_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history_sources ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watch_history_sources ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watchlist ALTER COLUMN manual_locked SET DEFAULT false;
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watchlist ALTER COLUMN added_at SET DEFAULT now();
ALTER TABLE prep_marquee_cross_resource_20261001.marquee_watchlist ALTER COLUMN updated_at SET DEFAULT now();