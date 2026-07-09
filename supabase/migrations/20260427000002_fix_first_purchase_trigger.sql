-- Fix: Ensure is_first_purchase_used is updated correctly via DB trigger
-- to bypass RLS restrictions and ensure it's always set after first transaction.

create or replace function handle_transaction_completion()
returns trigger as $$
begin
  -- When a transaction is confirmed/completed
  if (old.status != 'completed' and new.status = 'completed') then
    -- Credit customer with earned NX
    if (new.nx_earned > 0) then
      insert into ledger_entries (account_phone, entry_type, amount, reference, expires_at)
      values (
        new.customer_phone, 
        'credit', 
        new.nx_earned, 
        new.transaction_code, 
        now() + interval '2 months'
      );
    end if;

    -- Debit merchant with NX fee if applicable
    if (new.nx_fee > 0) then
      insert into ledger_entries (account_phone, entry_type, amount, reference, expires_at)
      values (
        new.merchant_phone, 
        'debit', 
        new.nx_fee, 
        new.transaction_code, 
        now() + interval '99 years'
      );
    end if;

    -- UPDATE CUSTOMER FIRST PURCHASE STATUS
    update users 
    set 
      is_first_purchase_used = true,
      last_transaction_at = now(),
      cancellation_count = 0
    where phone = new.customer_phone;
  end if;
  return new;
end;
$$ language plpgsql security definer;
