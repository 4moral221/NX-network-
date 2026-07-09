-- 📊 Create view for merchant daily stats
CREATE OR REPLACE VIEW public.v_merchant_stats_daily AS
SELECT
  merchant_code,
  COUNT(id) as txn_count,
  SUM(cash_paid) as total_cash,
  SUM(nx_redeemed) as total_redeemed,
  SUM(nx_earned) as total_earned_by_cust
FROM transactions
WHERE status = 'confirmed'
  AND created_at >= CURRENT_DATE
GROUP BY merchant_code;

GRANT SELECT ON public.v_merchant_stats_daily TO authenticated, anon;
