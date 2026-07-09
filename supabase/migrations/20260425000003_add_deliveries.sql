
alter table restock_invoices add column if not exists delivered_at timestamptz;
alter table restock_invoices add column if not exists driver_name text;
