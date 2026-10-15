-- This file is inert. Render only a reviewed private barrier schema during preparation.
CREATE OR REPLACE FUNCTION {{B}}.admit(lease_id uuid DEFAULT NULL, terminal boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c {{B}}.control%rowtype; l {{B}}.writer_leases%rowtype;
BEGIN
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM set_config('statement_timeout','25s',true);
 SELECT * INTO STRICT c FROM {{B}}.control WHERE id FOR SHARE;
 IF c.mode='paused' OR (c.mode='draining' AND clock_timestamp()>=c.abort_at) THEN
  RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000';
 END IF;
 IF lease_id IS NOT NULL THEN
  SELECT * INTO l FROM {{B}}.writer_leases WHERE id=lease_id FOR SHARE;
  IF NOT FOUND OR l.released_at IS NOT NULL OR l.epoch<>(CASE WHEN c.mode='draining' THEN c.epoch-1 ELSE c.epoch END)
     OR (NOT terminal AND l.expires_at<=clock_timestamp()) THEN
   RAISE EXCEPTION 'MIGRATION_LEASE_LOST' USING ERRCODE='55000';
  END IF;

 ELSIF c.mode<>'open' THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
 PERFORM set_config('migration.writer_lease',coalesce(lease_id::text,''),true);
 PERFORM set_config('migration.writer_terminal',terminal::text,true);
END $$;
CREATE OR REPLACE FUNCTION {{B}}.gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c {{B}}.control%rowtype; admitted boolean=false; value text; terminal boolean;
BEGIN
 SELECT * INTO STRICT c FROM {{B}}.control WHERE id FOR SHARE;
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
 value=current_setting('migration.writer_lease',true);
 terminal=coalesce(current_setting('migration.writer_terminal',true),'false')='true';
 IF terminal AND TG_TABLE_NAME NOT IN ('gamedeck_import_runs','gamedeck_import_controls','gamedeck_import_leases','marquee_import_runs','marquee_import_controls') THEN
  RAISE EXCEPTION 'TERMINAL_WRITER_TABLE_DENIED' USING ERRCODE='55000';
 END IF;
 IF value IS NOT NULL AND value<>'' THEN
  SELECT EXISTS(SELECT 1 FROM {{B}}.writer_leases WHERE id=value::uuid AND released_at IS NULL
    AND (terminal OR expires_at>clock_timestamp()) AND epoch=CASE WHEN c.mode='draining' THEN c.epoch-1 ELSE c.epoch END) INTO admitted;
  IF NOT admitted THEN RAISE EXCEPTION 'MIGRATION_LEASE_LOST' USING ERRCODE='55000'; END IF;
 END IF;
 IF c.mode='paused' OR (c.mode='draining' AND (NOT admitted OR clock_timestamp()>=c.abort_at)) THEN
  RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000';
 END IF;
 RETURN NULL;
END $$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA {{B}} FROM PUBLIC;

CREATE OR REPLACE FUNCTION {{B}}.advance_sequences() RETURNS integer LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r record; seq text; maximum bigint; previous bigint; called boolean; advanced integer=0; ns text;
BEGIN
 PERFORM 1 FROM {{B}}.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 FOR r IN SELECT reg.relation,a.attname FROM {{B}}.registry reg JOIN pg_attribute a ON a.attrelid=reg.relation WHERE a.attnum>0 AND NOT a.attisdropped LOOP
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
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA {{B}} FROM PUBLIC;
