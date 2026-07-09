export interface User {
  id: string;
  phone: string;
  role: "customer" | "merchant";
  merchant_code?: string;
  franchise_tier?: string;
  hub_merchant_code?: string;
  language?: string;
  name?: string;
  last_ussd_at?: string;
}

export interface Transaction {
  id: string;
  merchant_code: string;
  customer_phone: string;
  amount: number;
  nx_redeemed: number;
  nx_earned: number;
  status: string;
  created_at: string;
}
