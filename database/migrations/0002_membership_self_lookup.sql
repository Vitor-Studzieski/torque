CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')
$$;

-- Before a workshop is known, an authenticated user may only discover their own
-- active membership. The application sets this value from a verified Clerk session.
CREATE POLICY membership_self_read ON workshop_memberships
  FOR SELECT
  USING (auth_user_id = app_current_user_id());

CREATE INDEX workshop_memberships_user_active_idx
  ON workshop_memberships (auth_user_id, active, joined_at);
