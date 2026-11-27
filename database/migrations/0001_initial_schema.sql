CREATE TABLE workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  cnpj varchar(18) UNIQUE,
  phone text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  currency char(3) NOT NULL DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workshop_memberships (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  auth_user_id varchar(255) NOT NULL,
  display_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'attendant', 'mechanic', 'finance')),
  active boolean NOT NULL DEFAULT true,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, auth_user_id)
);

CREATE TABLE customers (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  document text,
  phone text NOT NULL,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id)
);

CREATE TABLE vehicles (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  plate varchar(8) NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  model_year smallint NOT NULL CHECK (model_year BETWEEN 1886 AND 2200),
  color text,
  mileage integer NOT NULL CHECK (mileage >= 0),
  fuel_percent smallint NOT NULL CHECK (fuel_percent BETWEEN 0 AND 100),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id),
  UNIQUE (workshop_id, id, customer_id),
  UNIQUE (workshop_id, plate),
  FOREIGN KEY (workshop_id, customer_id)
    REFERENCES customers(workshop_id, id) ON DELETE RESTRICT
);

CREATE TABLE inventory_items (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  category text NOT NULL DEFAULT 'Outros',
  brand text,
  description text,
  unit text NOT NULL DEFAULT 'un',
  quantity numeric(12, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  minimum_quantity numeric(12, 3) NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  unit_cost numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  sale_price numeric(12, 2) NOT NULL CHECK (sale_price > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id),
  UNIQUE (workshop_id, sku)
);

CREATE TABLE work_orders (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  display_number bigint NOT NULL CHECK (display_number > 0),
  customer_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  assigned_to_user_id varchar(255),
  status text NOT NULL DEFAULT 'intake'
    CHECK (status IN ('intake', 'diagnosis', 'awaiting-approval', 'waiting-parts', 'in-progress', 'ready', 'delivered', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  approval text NOT NULL DEFAULT 'not-sent'
    CHECK (approval IN ('not-sent', 'pending', 'partial', 'approved', 'rejected')),
  expected_at timestamptz NOT NULL,
  fuel_percent smallint NOT NULL CHECK (fuel_percent BETWEEN 0 AND 100),
  damage_areas text[] NOT NULL DEFAULT '{}',
  complaint text NOT NULL CHECK (length(trim(complaint)) > 0),
  diagnosis text,
  internal_notes text,
  customer_notes text,
  odometer_in integer NOT NULL CHECK (odometer_in >= 0),
  approved_at timestamptz,
  delivered_at timestamptz,
  created_by_user_id varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id),
  UNIQUE (workshop_id, display_number),
  FOREIGN KEY (workshop_id, customer_id)
    REFERENCES customers(workshop_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (workshop_id, vehicle_id, customer_id)
    REFERENCES vehicles(workshop_id, id, customer_id) ON DELETE RESTRICT,
  FOREIGN KEY (workshop_id, assigned_to_user_id)
    REFERENCES workshop_memberships(workshop_id, auth_user_id) ON DELETE RESTRICT
);

CREATE TABLE work_order_items (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  inventory_item_id uuid,
  kind text NOT NULL CHECK (kind IN ('service', 'part')),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text NOT NULL DEFAULT '',
  approval text NOT NULL DEFAULT 'pending'
    CHECK (approval IN ('pending', 'approved', 'rejected')),
  service_status text CHECK (service_status IS NULL OR service_status IN ('todo', 'in-progress', 'done')),
  installed boolean NOT NULL DEFAULT false,
  quantity numeric(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id),
  UNIQUE (workshop_id, id, work_order_id),
  FOREIGN KEY (workshop_id, work_order_id)
    REFERENCES work_orders(workshop_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id, inventory_item_id)
    REFERENCES inventory_items(workshop_id, id) ON DELETE RESTRICT,
  CHECK (
    (kind = 'part' AND inventory_item_id IS NOT NULL AND service_status IS NULL)
    OR (kind = 'service' AND inventory_item_id IS NULL AND service_status IS NOT NULL AND installed = false)
  ),
  CHECK ((installed AND used_at IS NOT NULL) OR (NOT installed AND used_at IS NULL))
);

CREATE TABLE inventory_movements (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL,
  work_order_id uuid,
  work_order_item_id uuid,
  movement_type text NOT NULL CHECK (movement_type IN ('inbound', 'outbound', 'adjustment')),
  quantity_delta numeric(12, 3) NOT NULL CHECK (quantity_delta <> 0),
  unit_cost numeric(12, 2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  reason text NOT NULL,
  idempotency_key text NOT NULL,
  created_by_user_id varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id),
  UNIQUE (workshop_id, idempotency_key),
  FOREIGN KEY (workshop_id, inventory_item_id)
    REFERENCES inventory_items(workshop_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (workshop_id, work_order_id)
    REFERENCES work_orders(workshop_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (workshop_id, work_order_item_id, work_order_id)
    REFERENCES work_order_items(workshop_id, id, work_order_id) ON DELETE RESTRICT,
  CHECK (
    (movement_type = 'inbound' AND quantity_delta > 0)
    OR (movement_type = 'outbound' AND quantity_delta < 0)
    OR movement_type = 'adjustment'
  ),
  CHECK (work_order_item_id IS NULL OR work_order_id IS NOT NULL)
);

CREATE TABLE financial_entries (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_order_id uuid,
  direction text NOT NULL CHECK (direction IN ('payable', 'receivable')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'canceled')),
  description text NOT NULL CHECK (length(trim(description)) > 0),
  category text NOT NULL DEFAULT 'Outros',
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  paid_at timestamptz,
  payment_method text CHECK (payment_method IS NULL OR payment_method IN ('pix', 'cash', 'card', 'transfer', 'other')),
  notes text,
  created_by_user_id varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id),
  FOREIGN KEY (workshop_id, work_order_id)
    REFERENCES work_orders(workshop_id, id) ON DELETE RESTRICT,
  CHECK ((status = 'paid' AND paid_at IS NOT NULL) OR status <> 'paid')
);

CREATE TABLE work_order_photos (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  object_key text NOT NULL,
  category text NOT NULL CHECK (category IN ('entry', 'damage', 'part', 'work', 'delivery')),
  title text NOT NULL,
  original_name text,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic')),
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 20971520),
  caption text,
  captured_at timestamptz,
  uploaded_by_user_id varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id),
  UNIQUE (workshop_id, object_key),
  FOREIGN KEY (workshop_id, work_order_id)
    REFERENCES work_orders(workshop_id, id) ON DELETE CASCADE
);

CREATE TABLE work_order_checklist_items (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  checklist_type text NOT NULL CHECK (checklist_type IN ('entry', 'exit')),
  item_key text NOT NULL,
  label text NOT NULL,
  sort_order smallint NOT NULL CHECK (sort_order >= 0),
  checked boolean NOT NULL DEFAULT false,
  checked_by_user_id varchar(255),
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id),
  UNIQUE (workshop_id, work_order_id, checklist_type, item_key),
  FOREIGN KEY (workshop_id, work_order_id)
    REFERENCES work_orders(workshop_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id, checked_by_user_id)
    REFERENCES workshop_memberships(workshop_id, auth_user_id) ON DELETE RESTRICT,
  CHECK ((checked AND checked_at IS NOT NULL) OR NOT checked)
);

CREATE TABLE work_order_timeline_events (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  actor_user_id varchar(255),
  actor_label text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id),
  FOREIGN KEY (workshop_id, work_order_id)
    REFERENCES work_orders(workshop_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id, actor_user_id)
    REFERENCES workshop_memberships(workshop_id, auth_user_id) ON DELETE RESTRICT
);

CREATE TABLE audit_events (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  id bigint GENERATED ALWAYS AS IDENTITY,
  actor_user_id varchar(255) NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, id)
);

CREATE INDEX customers_workshop_name_idx ON customers (workshop_id, lower(name));
CREATE INDEX vehicles_workshop_plate_idx ON vehicles (workshop_id, plate);
CREATE INDEX work_orders_workshop_status_idx ON work_orders (workshop_id, status, created_at DESC);
CREATE INDEX work_orders_workshop_customer_idx ON work_orders (workshop_id, customer_id, created_at DESC);
CREATE INDEX inventory_items_workshop_name_idx ON inventory_items (workshop_id, lower(name));
CREATE INDEX inventory_movements_workshop_item_idx ON inventory_movements (workshop_id, inventory_item_id, created_at DESC);
CREATE INDEX financial_entries_workshop_due_idx ON financial_entries (workshop_id, status, due_date);
CREATE INDEX work_order_photos_workshop_order_idx ON work_order_photos (workshop_id, work_order_id, created_at DESC);
CREATE INDEX work_order_checklist_items_order_idx ON work_order_checklist_items (workshop_id, work_order_id, checklist_type, sort_order);
CREATE INDEX work_order_timeline_events_order_idx ON work_order_timeline_events (workshop_id, work_order_id, created_at DESC);
CREATE INDEX audit_events_workshop_created_idx ON audit_events (workshop_id, created_at DESC);

CREATE OR REPLACE FUNCTION app_current_workshop_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_workshop_id', true), '')::uuid
$$;

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops FORCE ROW LEVEL SECURITY;
CREATE POLICY workshop_isolation ON workshops
  USING (id = app_current_workshop_id())
  WITH CHECK (id = app_current_workshop_id());

DO $$
DECLARE
  protected_table text;
BEGIN
  FOREACH protected_table IN ARRAY ARRAY[
    'workshop_memberships',
    'customers',
    'vehicles',
    'inventory_items',
    'work_orders',
    'work_order_items',
    'inventory_movements',
    'financial_entries',
    'work_order_photos',
    'work_order_checklist_items',
    'work_order_timeline_events',
    'audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', protected_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', protected_table);
    EXECUTE format(
      'CREATE POLICY workshop_isolation ON %I USING (workshop_id = app_current_workshop_id()) WITH CHECK (workshop_id = app_current_workshop_id())',
      protected_table
    );
  END LOOP;
END $$;
