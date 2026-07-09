import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `
  ALTER TABLE restock_invoices 
  ADD COLUMN IF NOT EXISTS logistics_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cash_status text DEFAULT 'pending';
  
  -- Ensure the RPCs are correctly created with these columns
  DROP FUNCTION IF EXISTS confirm_delivery(bigint, text);
  CREATE OR REPLACE FUNCTION confirm_delivery(invoice_id bigint, driver text)
  RETURNS void LANGUAGE plpgsql AS $$
  BEGIN
    UPDATE restock_invoices
    SET status = 'delivered', logistics_status = 'delivered', delivery_confirmed_at = now(), driver_name = driver
    WHERE id = invoice_id;
  END;
  $$;

  DROP FUNCTION IF EXISTS confirm_cash_received(bigint, numeric);
  CREATE OR REPLACE FUNCTION confirm_cash_received(invoice_id bigint, amount numeric)
  RETURNS void LANGUAGE plpgsql AS $$
  BEGIN
    UPDATE restock_invoices
    SET status = 'paid', cash_status = 'received', cash_received = amount, payment_confirmed_at = now()
    WHERE id = invoice_id;
  END;
  $$;
`;

async function fix() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (res.ok) {
    console.log('Columns added and RPCs updated.');
  } else {
    console.error('Error applying migration:', await res.text());
  }
}
fix();
