-- Fix RLS: Allow authenticated users (merchants) to update transaction status
-- This is critical for the PWA dashboard to confirm payments.

drop policy if exists "Allow auth update transactions" on transactions;

create policy "Allow auth update transactions" on transactions
  for update to authenticated
  using (true)
  with check (true);

-- Also ensure ledger_entries can be read by authenticated users for balance checks
drop policy if exists "Allow auth manage ledger" on ledger_entries;
create policy "Allow auth manage ledger" on ledger_entries
  for all to authenticated
  using (true)
  with check (true);
