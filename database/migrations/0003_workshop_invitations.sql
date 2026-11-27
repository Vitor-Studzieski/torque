CREATE TABLE workshop_invitations (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (length(trim(email)) > 0),
  role text NOT NULL CHECK (role IN ('manager', 'attendant', 'mechanic', 'finance')),
  status text NOT NULL DEFAULT 'creating'
    CHECK (status IN ('creating', 'pending', 'accepted', 'revoked', 'failed')),
  clerk_invitation_id varchar(255) UNIQUE,
  invited_by_user_id varchar(255) NOT NULL,
  accepted_by_user_id varchar(255),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  PRIMARY KEY (workshop_id, id),
  FOREIGN KEY (workshop_id, invited_by_user_id)
    REFERENCES workshop_memberships(workshop_id, auth_user_id) ON DELETE RESTRICT,
  FOREIGN KEY (workshop_id, accepted_by_user_id)
    REFERENCES workshop_memberships(workshop_id, auth_user_id) ON DELETE RESTRICT,
  CHECK ((status = 'accepted' AND accepted_by_user_id IS NOT NULL AND accepted_at IS NOT NULL)
    OR status <> 'accepted')
);

CREATE UNIQUE INDEX workshop_invitations_open_email_idx
  ON workshop_invitations (workshop_id, lower(email))
  WHERE status IN ('creating', 'pending');
CREATE INDEX workshop_invitations_status_idx
  ON workshop_invitations (workshop_id, status, created_at DESC);

ALTER TABLE workshop_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY workshop_isolation ON workshop_invitations
  USING (workshop_id = app_current_workshop_id())
  WITH CHECK (workshop_id = app_current_workshop_id());
