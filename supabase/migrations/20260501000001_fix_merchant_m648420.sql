-- Repair migration for merchant M648420 and FMCG expiry logic
-- 1. Ensure merchant M648420 exists and is properly configured
INSERT INTO users (phone, name, role, merchant_code, franchise_tier, status)
VALUES ('+254000648420', 'M648420 Special Node', 'merchant', 'M648420', 'BASIC', 'active')
ON CONFLICT (merchant_code) DO UPDATE SET status = 'active', role = 'merchant';

INSERT INTO users (phone, name, role, merchant_code, franchise_tier, status)
VALUES ('+254000648420', 'M648420 Special Node', 'merchant', 'M648420', 'BASIC', 'active')
ON CONFLICT (phone) DO UPDATE SET merchant_code = 'M648420', role = 'merchant';

-- Initialise margins (Repair if 0)
INSERT INTO merchant_margins (merchant_code, gross_margin)
VALUES ('M648420', 500)
ON CONFLICT (merchant_code) DO UPDATE 
SET gross_margin = CASE WHEN merchant_margins.gross_margin < 500 THEN 500 ELSE merchant_margins.gross_margin END;

-- Initialise inventory shells
INSERT INTO merchant_inventory (merchant_code, sku_code, variant_code, quantity)
SELECT 'M648420', sku_code, '', 100 FROM sku_catalog
ON CONFLICT DO UPDATE SET quantity = 100;

-- 2. Inject some FMCG liquidity boost for M648420 to ensure payments go through
INSERT INTO fmcg_margin_contributions (merchant_code, fmcg_name, contribution_amount, status, effective_from, effective_to)
VALUES ('M648420', 'NX Foundation', 1000, 'active', CURRENT_DATE, (CURRENT_DATE + INTERVAL '90 days')::date)
ON CONFLICT DO NOTHING;

-- 3. Add default expiry to existing FMCG contributions if missing
UPDATE fmcg_margin_contributions
SET effective_to = (effective_from + INTERVAL '30 days')::date
WHERE effective_to IS NULL AND status = 'pending';

-- 3. Ensure get_merchant_pool handles null effective_to correctly (it already does, but let's be safe)
CREATE OR REPLACE FUNCTION get_merchant_pool(p_merchant_code text)
RETURNS numeric AS $$
DECLARE
  v_tier text;
  v_pool_rate numeric;
  v_margin numeric;
  v_fmcg numeric;
  v_today date := current_date;
BEGIN
  -- Get Tier and Margin
  SELECT franchise_tier into v_tier from users where merchant_code = p_merchant_code;
  SELECT coalesce(gross_margin, 0) into v_margin from merchant_margins where merchant_code = p_merchant_code;
  
  -- Determine Pool Rate from tiers config
  v_pool_rate := CASE 
    WHEN v_tier = 'HUB' THEN 0.70
    WHEN v_tier = 'CERTIFIED' THEN 0.65
    ELSE 0.60
  END;

  -- Add active FMCG Boosts
  SELECT coalesce(sum(contribution_amount), 0) into v_fmcg 
  from fmcg_margin_contributions 
  where merchant_code = p_merchant_code 
    and status = 'active'
    and effective_from <= v_today
    and (effective_to is null or effective_to >= v_today);

  RETURN floor(v_margin * v_pool_rate) + floor(v_fmcg);
END;
$$ LANGUAGE plpgsql STABLE;
