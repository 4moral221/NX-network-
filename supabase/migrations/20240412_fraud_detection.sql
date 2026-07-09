-- 1. Create fraud_logs table
CREATE TABLE IF NOT EXISTS public.fraud_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT NOT NULL, -- Using text to match transaction_code
    user_phone TEXT NOT NULL,
    risk_score INT DEFAULT 0,
    reason TEXT,
    status TEXT DEFAULT 'flagged' CHECK (status IN ('flagged', 'reviewed', 'approved', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add fraud columns to transactions table if they don't exist
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fraud_score INT DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fraud_status TEXT DEFAULT 'safe';

-- 3. Create the fraud detection function
CREATE OR REPLACE FUNCTION public.detect_transaction_fraud()
RETURNS TRIGGER AS $$
DECLARE
    score INT := 0;
    reasons TEXT[] := ARRAY[]::TEXT[];
    recent_count INT;
    user_created_at TIMESTAMPTZ;
    identical_count INT;
BEGIN
    -- Rule 1: Amount > 50,000 KSh → +40 risk
    IF NEW.amount > 50000 THEN
        score := score + 40;
        reasons := array_append(reasons, 'High amount (>50k)');
    END IF;

    -- Rule 2: More than 5 transactions in 1 minute → +30 risk
    SELECT count(*) INTO recent_count
    FROM public.transactions
    WHERE customer_phone = NEW.customer_phone
      AND created_at > (now() - interval '1 minute');
    
    IF recent_count > 5 THEN
        score := score + 30;
        reasons := array_append(reasons, 'Velocity alert (>5 txns/min)');
    END IF;

    -- Rule 3: New user (created < 24 hrs) → +20 risk
    SELECT created_at INTO user_created_at
    FROM public.users
    WHERE phone = NEW.customer_phone;

    IF user_created_at > (now() - interval '24 hours') THEN
        score := score + 20;
        reasons := array_append(reasons, 'New user (<24h)');
    END IF;

    -- Rule 4: Repeated identical amounts → +15 risk
    SELECT count(*) INTO identical_count
    FROM public.transactions
    WHERE customer_phone = NEW.customer_phone
      AND amount = NEW.amount
      AND created_at > (now() - interval '1 hour');

    IF identical_count > 3 THEN
        score := score + 15;
        reasons := array_append(reasons, 'Repeated identical amounts');
    END IF;

    -- Rule 5: Night transactions (00:00–04:00) → +10 risk
    IF EXTRACT(HOUR FROM now()) BETWEEN 0 AND 4 THEN
        score := score + 10;
        reasons := array_append(reasons, 'Night transaction');
    END IF;

    -- Update the transaction with the score
    NEW.fraud_score := score;
    
    -- If total risk_score >= 50: Mark as suspicious
    IF score >= 50 THEN
        NEW.fraud_status := 'suspicious';
        
        -- Log the fraud event
        INSERT INTO public.fraud_logs (transaction_id, user_phone, risk_score, reason, status)
        VALUES (NEW.transaction_code, NEW.customer_phone, score, array_to_string(reasons, ', '), 'flagged');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger
DROP TRIGGER IF EXISTS tr_detect_fraud ON public.transactions;
CREATE TRIGGER tr_detect_fraud
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.detect_transaction_fraud();

-- 5. Enable Realtime for fraud_logs
-- Note: This might need to be run manually if the publication doesn't exist
-- ALTER PUBLICATION supabase_realtime ADD TABLE fraud_logs;
