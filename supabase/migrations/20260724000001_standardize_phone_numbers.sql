-- Standardize all phone numbers across tables to +254 E.164 canonical format

-- 1. Standardize public.users.phone
UPDATE public.users
SET phone = CASE
  WHEN phone LIKE '0%' THEN '+254' || SUBSTRING(phone FROM 2)
  WHEN phone LIKE '254%' THEN '+' || phone
  WHEN phone ~ '^[17][0-9]{8}$' THEN '+254' || phone
  ELSE phone
END
WHERE phone IS NOT NULL AND phone NOT LIKE '+254%';

-- 2. Standardize public.transactions.customer_phone & merchant_phone
UPDATE public.transactions
SET customer_phone = CASE
  WHEN customer_phone LIKE '0%' THEN '+254' || SUBSTRING(customer_phone FROM 2)
  WHEN customer_phone LIKE '254%' THEN '+' || customer_phone
  WHEN customer_phone ~ '^[17][0-9]{8}$' THEN '+254' || customer_phone
  ELSE customer_phone
END
WHERE customer_phone IS NOT NULL AND customer_phone NOT LIKE '+254%';

UPDATE public.transactions
SET merchant_phone = CASE
  WHEN merchant_phone LIKE '0%' THEN '+254' || SUBSTRING(merchant_phone FROM 2)
  WHEN merchant_phone LIKE '254%' THEN '+' || merchant_phone
  WHEN merchant_phone ~ '^[17][0-9]{8}$' THEN '+254' || merchant_phone
  ELSE merchant_phone
END
WHERE merchant_phone IS NOT NULL AND merchant_phone NOT LIKE '+254%';

-- 3. Standardize public.merchant_whitelist.phone
UPDATE public.merchant_whitelist
SET phone = CASE
  WHEN phone LIKE '0%' THEN '+254' || SUBSTRING(phone FROM 2)
  WHEN phone LIKE '254%' THEN '+' || phone
  WHEN phone ~ '^[17][0-9]{8}$' THEN '+254' || phone
  ELSE phone
END
WHERE phone IS NOT NULL AND phone NOT LIKE '+254%';

-- 4. Create trigger to automatically normalize users.phone on insert or update
CREATE OR REPLACE FUNCTION public.normalize_user_phone()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := TRIM(NEW.phone);
    IF NEW.phone LIKE '0%' THEN
      NEW.phone := '+254' || SUBSTRING(NEW.phone FROM 2);
    ELSIF NEW.phone LIKE '254%' THEN
      NEW.phone := '+' || NEW.phone;
    ELSIF NEW.phone ~ '^[17][0-9]{8}$' THEN
      NEW.phone := '+254' || NEW.phone;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_user_phone ON public.users;
CREATE TRIGGER trg_normalize_user_phone
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_user_phone();

NOTIFY pgrst, 'reload schema';
