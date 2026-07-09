-- Enable hashing for all dashboard users
-- Using Bcrypt (via pgcrypto) as it's natively supported in Postgres and secure.

-- 1. Helper to hash passwords on creation/update
CREATE OR REPLACE FUNCTION hash_password(password text) 
RETURNS text AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- 2. Secure Admin Verification with Bcrypt
CREATE OR REPLACE FUNCTION verify_admin_login(p_email text, p_password text)
RETURNS TABLE (is_valid boolean, role text)
SET search_path = public
AS $$
DECLARE
    v_pwd_hash text;
    v_role text;
BEGIN
    SELECT dashboard_password, admin_role INTO v_pwd_hash, v_role
    FROM users 
    WHERE email = p_email 
      AND is_admin = true
    LIMIT 1;

    IF v_pwd_hash IS NULL THEN
        RETURN QUERY SELECT false, null::text;
    ELSE
        -- crypt() compares the provided password against the stored hash
        RETURN QUERY SELECT (v_pwd_hash = crypt(p_password, v_pwd_hash)), v_role;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. New: Secure Merchant/Hub Verification
CREATE OR REPLACE FUNCTION verify_merchant_login(p_phone text, p_password text)
RETURNS TABLE (is_valid boolean, merchant_code text, name text, tier text)
SET search_path = public
AS $$
DECLARE
    v_pwd_hash text;
    v_code text;
    v_name text;
    v_tier text;
BEGIN
    SELECT dashboard_password, merchant_code, name, franchise_tier 
    INTO v_pwd_hash, v_code, v_name, v_tier
    FROM users 
    WHERE phone = p_phone 
      AND (role = 'merchant' OR role = 'hub')
    LIMIT 1;

    IF v_pwd_hash IS NULL THEN
        RETURN QUERY SELECT false, null::text, null::text, null::text;
    ELSE
        RETURN QUERY SELECT 
            (v_pwd_hash = crypt(p_password, v_pwd_hash)), 
            v_code, v_name, v_tier;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Secure FMCG Partner Verification
CREATE OR REPLACE FUNCTION verify_fmcg_login(p_brand text, p_password text)
RETURNS TABLE (is_valid boolean, brand_id bigint, brand_name text)
SET search_path = public
AS $$
DECLARE
    v_pwd_hash text;
    v_id bigint;
    v_name text;
BEGIN
    SELECT dashboard_password, id, name 
    INTO v_pwd_hash, v_id, v_name
    FROM fmcg_partners 
    WHERE name = p_brand 
      AND active = true
    LIMIT 1;

    IF v_pwd_hash IS NULL THEN
        RETURN QUERY SELECT false, null::bigint, null::text;
    ELSE
        RETURN QUERY SELECT 
            (v_pwd_hash = crypt(p_password, v_pwd_hash)), 
            v_id, v_name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Secure User/Customer/Merchant PWA Login verification
CREATE OR REPLACE FUNCTION verify_user_login(p_phone text, p_pin text)
RETURNS TABLE (is_valid boolean, user_id bigint)
SET search_path = public
AS $$
DECLARE
    v_pwd_hash text;
    v_id bigint;
BEGIN
    SELECT recovery_pin, id
    INTO v_pwd_hash, v_id
    FROM users 
    WHERE phone = p_phone 
    LIMIT 1;

    IF v_pwd_hash IS NULL THEN
        RETURN QUERY SELECT false, null::bigint;
    ELSE
        RETURN QUERY SELECT 
            (v_pwd_hash = crypt(p_pin, v_pwd_hash)), 
            v_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Secure FMCG API Key Verification for Password Setup
CREATE OR REPLACE FUNCTION verify_fmcg_setup(p_brand text, p_api_key text)
RETURNS TABLE (is_valid boolean, brand_id bigint)
SET search_path = public
AS $$
DECLARE
    v_api_key_hash text;
    v_id bigint;
BEGIN
    SELECT api_key_hash, id 
    INTO v_api_key_hash, v_id
    FROM fmcg_partners 
    WHERE name = p_brand 
      AND active = true
    LIMIT 1;

    IF v_api_key_hash IS NULL THEN
        RETURN QUERY SELECT false, null::bigint;
    ELSE
        RETURN QUERY SELECT 
            (v_api_key_hash = crypt(p_api_key, v_api_key_hash)), 
            v_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update FMCG api_key_hash to Bcrypt and drop plain api_key
UPDATE fmcg_partners 
SET api_key_hash = crypt(api_key, gen_salt('bf', 10)) 
WHERE api_key IS NOT NULL;

ALTER TABLE fmcg_partners DROP COLUMN IF EXISTS api_key CASCADE;