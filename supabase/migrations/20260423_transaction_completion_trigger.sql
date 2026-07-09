-- Function to create ledger entry when transaction is completed
create or replace function handle_transaction_completion()
returns trigger as $$
begin
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

    -- Debit customer with redeemed NX
    if (new.nx_redeemed > 0) then
      insert into ledger_entries (account_phone, entry_type, amount, reference, expires_at)
      values (
        new.customer_phone, 
        'debit', 
        -new.nx_redeemed, 
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

    -- NEW: Mark first purchase as used
    update users 
    set 
      is_first_purchase_used = true,
      last_transaction_at = now(),
      cancellation_count = 0
    where phone = new.customer_phone;

    -- NEW: Hub Commission
    declare
      m_hub_code text;
    begin
      select hub_merchant_code into m_hub_code from users where merchant_code = new.merchant_code;
      if (m_hub_code is not null) then
        insert into hub_commissions (hub_merchant_code, sub_merchant_code, transaction_id, commission_amount, paid_out)
        values (m_hub_code, new.merchant_code, new.id, 0.2, false);
      end if;
    end;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function
drop trigger if exists on_transaction_completed on transactions;
create trigger on_transaction_completed
  after update on transactions
  for each row execute procedure handle_transaction_completion();
