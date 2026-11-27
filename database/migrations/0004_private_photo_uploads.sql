CREATE TABLE work_order_photo_uploads (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  object_key text NOT NULL,
  category text NOT NULL CHECK (category IN ('entry', 'damage', 'part', 'work', 'delivery')),
  title text NOT NULL,
  original_name text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic')),
  expected_size_bytes bigint NOT NULL CHECK (expected_size_bytes BETWEEN 1 AND 20971520),
  caption text,
  uploaded_by_user_id varchar(255) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id),
  UNIQUE (workshop_id, object_key),
  FOREIGN KEY (workshop_id, work_order_id)
    REFERENCES work_orders(workshop_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id, uploaded_by_user_id)
    REFERENCES workshop_memberships(workshop_id, auth_user_id) ON DELETE RESTRICT
);

CREATE INDEX work_order_photo_uploads_expiry_idx
  ON work_order_photo_uploads (expires_at);

ALTER TABLE work_order_photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_photo_uploads FORCE ROW LEVEL SECURITY;
CREATE POLICY workshop_isolation ON work_order_photo_uploads
  USING (workshop_id = app_current_workshop_id())
  WITH CHECK (workshop_id = app_current_workshop_id());
