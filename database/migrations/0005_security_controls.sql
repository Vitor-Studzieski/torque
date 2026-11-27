CREATE TABLE workshop_security_rate_limits (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  scope varchar(80) NOT NULL CHECK (scope ~ '^[a-z][a-z0-9._-]{0,79}$'),
  subject_user_id varchar(255) NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count >= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, scope, subject_user_id)
);

CREATE INDEX workshop_security_rate_limits_updated_idx
  ON workshop_security_rate_limits (updated_at);

ALTER TABLE workshop_security_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_security_rate_limits FORCE ROW LEVEL SECURITY;
CREATE POLICY workshop_security_rate_limits_isolation ON workshop_security_rate_limits
  USING (workshop_id = app_current_workshop_id())
  WITH CHECK (workshop_id = app_current_workshop_id());

DROP POLICY IF EXISTS workshop_isolation ON audit_events;
CREATE POLICY audit_events_select ON audit_events
  FOR SELECT
  USING (workshop_id = app_current_workshop_id());
CREATE POLICY audit_events_insert ON audit_events
  FOR INSERT
  WITH CHECK (workshop_id = app_current_workshop_id());

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'torque_app_runtime_restricted') THEN
    RAISE EXCEPTION 'O papel SQL torque_app_runtime_restricted precisa ser provisionado pelo comando de migration.';
  END IF;

  EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM torque_app_runtime_restricted';
  EXECUTE 'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM torque_app_runtime_restricted';
  EXECUTE 'REVOKE ALL PRIVILEGES ON SCHEMA public FROM torque_app_runtime_restricted';
  EXECUTE 'REVOKE CREATE ON SCHEMA public FROM torque_app_runtime_restricted';
  EXECUTE 'GRANT CONNECT ON DATABASE neondb TO torque_app_runtime_restricted';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO torque_app_runtime_restricted';

  EXECUTE 'GRANT SELECT, UPDATE ON workshops TO torque_app_runtime_restricted';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON workshop_memberships TO torque_app_runtime_restricted';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON customers, vehicles, work_orders, financial_entries TO torque_app_runtime_restricted';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON inventory_items, work_order_items, work_order_checklist_items, workshop_invitations TO torque_app_runtime_restricted';
  EXECUTE 'GRANT SELECT, INSERT ON inventory_movements, work_order_timeline_events TO torque_app_runtime_restricted';
  EXECUTE 'GRANT SELECT, INSERT, DELETE ON work_order_photos, work_order_photo_uploads TO torque_app_runtime_restricted';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON workshop_security_rate_limits TO torque_app_runtime_restricted';
  EXECUTE 'GRANT SELECT, INSERT ON audit_events TO torque_app_runtime_restricted';
  EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE audit_events_id_seq TO torque_app_runtime_restricted';

  IF EXISTS (
    SELECT 1
    FROM pg_roles AS runtime_role
    WHERE runtime_role.rolname = 'torque_app_runtime_restricted'
      AND (
        runtime_role.rolsuper OR runtime_role.rolbypassrls OR
        runtime_role.rolcreatedb OR runtime_role.rolcreaterole OR
        runtime_role.rolreplication OR
        has_schema_privilege(runtime_role.oid, 'public', 'CREATE') OR
        EXISTS (
          SELECT 1 FROM pg_roles AS granted_role
          WHERE granted_role.oid <> runtime_role.oid
            AND pg_has_role(runtime_role.oid, granted_role.oid, 'MEMBER')
        ) OR
        EXISTS (
          SELECT 1
          FROM pg_class AS relation
          JOIN pg_namespace AS namespace_info ON namespace_info.oid = relation.relnamespace
          WHERE namespace_info.nspname = 'public'
            AND relation.relkind IN ('r', 'p')
            AND relation.relname IN (
              'workshops', 'workshop_memberships', 'customers', 'vehicles',
              'inventory_items', 'work_orders', 'work_order_items',
              'inventory_movements', 'financial_entries', 'work_order_photos',
              'work_order_photo_uploads', 'work_order_checklist_items',
              'work_order_timeline_events', 'workshop_invitations',
              'audit_events', 'workshop_security_rate_limits'
            )
            AND relation.relowner = runtime_role.oid
        ) OR
        has_table_privilege(runtime_role.oid, 'public.workshops', 'INSERT') OR
        has_table_privilege(runtime_role.oid, 'public.workshops', 'DELETE') OR
        has_table_privilege(runtime_role.oid, 'public.workshops', 'TRUNCATE') OR
        has_table_privilege(runtime_role.oid, 'public.workshop_memberships', 'DELETE') OR
        has_table_privilege(runtime_role.oid, 'public.workshop_memberships', 'TRUNCATE') OR
        has_table_privilege(runtime_role.oid, 'public.audit_events', 'UPDATE') OR
        has_table_privilege(runtime_role.oid, 'public.audit_events', 'DELETE') OR
        has_table_privilege(runtime_role.oid, 'public.audit_events', 'TRUNCATE')
      )
  ) THEN
    RAISE EXCEPTION 'O papel torque_app_runtime_restricted ainda possui privilégios incompatíveis com o runtime seguro.';
  END IF;
END $$;
