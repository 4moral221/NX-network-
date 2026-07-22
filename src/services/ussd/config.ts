export const TIER_CONFIG: Record<string, { poolRate: number; acceptCeiling: number; monthlyFeeKes: number }> = {
  BASIC:     { poolRate: 0.60, acceptCeiling: 0.20, monthlyFeeKes: 0    },
  CERTIFIED: { poolRate: 0.65, acceptCeiling: 0.30, monthlyFeeKes: 500  },
  HUB:       { poolRate: 0.70, acceptCeiling: 0.40, monthlyFeeKes: 1000 },
};

export const MIN_DENOMINATION = 5;

export const SKU_VARIANTS: Record<string, string[]> = {
  BR: ["400g", "600g", "700g"],
  ML: ["250ml", "500ml", "1L", "2L"],
  SG: ["500g", "1kg", "2kg", "5kg"],
  CO: ["500ml", "1L", "2L", "5L", "10L", "20L"],
  F: ["1kg", "2kg", "5kg", "10kg", "25kg"],
};

export const SKU: Record<string, Record<string, string>> = {
  en: { 
    BR: "SupaLoaf", ML: "Milk", SG: "Sugar", CO: "Cooking Oil", F: "Pembe Flour",
    BREAD: "SupaLoaf", MILK: "Milk", SUGAR: "Sugar", OIL: "Cooking Oil", FLOUR: "Pembe Flour",
    MAIZE: "Pembe Flour", COOKING: "Cooking Oil"
  },
  sw: { 
    BR: "SupaLoaf", ML: "Maziwa", SG: "Sukari", CO: "Mafuta",   F: "Pembe",
    BREAD: "SupaLoaf", MILK: "Maziwa", SUGAR: "Sukari", OIL: "Mafuta", FLOUR: "Pembe",
    MAIZE: "Pembe", COOKING: "Mafuta"
  },
};

export const T: Record<string, Record<string, string>> = {
  lang_pick:             { en: "Welcome to NX Loyalty\nChoose language:\n1 English\n2 Kiswahili", sw: "Karibu NX Loyalty\nChagua lugha:\n1 English\n2 Kiswahili" },
  main_menu:             { en: "Welcome to NX Loyalty\n1 Register\n2 Help\n3 Continue\n4 Recover Account", sw: "Karibu NX Loyalty\n1 Jiandikishe\n2 Msaada\n3 Endelea\n4 Rudisha Akaunti" },
  customer_menu:         { en: "NX Customer Menu:\n1 Lipa na NX\n2 Check Balance\n3 Family Account\n4 Help", sw: "Menyu ya Mteja:\n1 Lipa na NX\n2 Angalia Salio\n3 Family Account\n4 Msaada" },
  family_menu:           { en: "Family Menu:\n1 Create Family Account\n2 View Family Info", sw: "Menyu ya Familia:\n1 Unda Akaunti ya Familia\n2 Taarifa za Familia" },
  enter_family_code:     { en: "Enter Family Code:", sw: "Weka Nambari ya Familia:" },
  family_created:        { en: "Family account created!\nCode: {code}\nShared spending: ACTIVE", sw: "Akaunti ya familia imeundwa!\nNambari: {code}\nMatumizi: ACTIVE" },
  family_not_found:      { en: "Error: Family account not found.", sw: "Makosa: Akaunti haikupatikana." },
  family_spending_disabled:{ en: "Error: Shared spending is disabled.", sw: "Makosa: Matumizi yamezimwa." },
  family_insufficient:   { en: "Error: Parent balance is insufficient.", sw: "Makosa: Salio la mzazi halitoshi." },
  family_info:           { en: "Family Code: {code}\nParent: {parent}\nSpending: {spending}\nBalance: {bal} NX", sw: "Nambari: {code}\nMzazi: {parent}\nMatumizi: {spending}\nSalio: {bal} NX" },
  family_no_info:        { en: "You don't have a Family Account.", sw: "Huna Akaunti ya Familia." },
  confirm_family_pay:    { en: "CON Pay FAM: {amount} KES at {shop}?\nFamily Code: {code}\nParent Bal: {bal} NX\nRedeem: {red} NX\nCash: {cash} KSH\n1 Confirm\n2 Cancel", sw: "CON Lipa FAM: {amount} KES kwa {shop}?\nNambari: {code}\nSalio la Mzazi: {bal} NX\nRedeem: {red} NX\nKiasi: {cash} KSH\n1 Thibitisha\n2 Ghairi" },
  nx_balance:            { en: "Your current NX balance is {bal} NX.", sw: "Salio lako la sasa la NX ni {bal} NX." },
  help:                  { en: "NX lets you earn & spend tokens at certified kiosks.\nFirst purchase: 10% back. After: 5% back.\n\nNote: Customer NX expires 2 months after issuance.", sw: "NX hukuwezesha kupata na kutumia tokens katika maduka yaliyoidhinishwa.\nMnunuzi wa kwanza: 10% back. Baadaye: 5% back.\n\nKumbuka: NX ya wateja inaisha baada ya miezi 2." },
  not_registered:        { en: "Not registered. Please register first.", sw: "Bado hujasajiliwa. Jiandikishe kwanza." },
  terms:                 { en: "NX Terms:\nWe store your phone, name & national ID for loyalty rewards. Merchants also provide location.\n1 Accept\n2 Reject", sw: "NX Terms:\nTutahifadhi namba, jina na kitambulisho chako. Wafanyabiashara pia wanawasilisha eneo.\n1 Kubali\n2 Kataa" },
  register_as:           { en: "Register as:\n1 Customer\n2 Merchant", sw: "Jisajili kama:\n1 Mteja\n2 Muuzaji" },
  must_accept:           { en: "You must accept terms to join NX.", sw: "Lazima ukubali vigezo ili kujiunga na NX." },
  name_empty:            { en: "Name cannot be empty.", sw: "Jina haliwezi kuwa tupu." },
  enter_biz_name:        { en: "Enter Business Name:", sw: "Weka Jina la Biashara:" },
  enter_location:        { en: "Enter Shop Location:", sw: "Weka Eneo la Duka:" },
  all_fields_required:   { en: "All fields are required.", sw: "Sehemu zote ni lazima." },
  welcome_customer:      { en: "Welcome to NX Network, {name}. Your NX balance is 0. Contact 0781550151 for more information and answers to your queries.", sw: "Karibu kwenye Mtandao wa NX, {name}. Salio lako la NX ni 0. Wasiliana na 0781550151 kwa maelezo zaidi na majibu ya maswali yako." },
  welcome_merchant:      { en: "Welcome to NX Network, {name}. Your merchant account is active. Your NX balance is 0. Contact 0781550151 for more information.", sw: "Karibu kwenye Mtandao wa NX, {name}. Akaunti yako ya kuuza iko tayari. Salio lako la NX ni 0. Wasiliana na 0781550151 kwa maelezo zaidi." },
  enter_pin:             { en: "Set 4-digit PIN:", sw: "Weka PIN ya tarakimu 4:" },
  shortcuts_customers:   { en: "Quick payments are only for customers.", sw: "Malipo ya haraka ni ya wateja pekee." },
  enter_name:            { en: "Enter your full name:", sw: "Weka jina lako kamili:" },
  enter_national_id:     { en: "Enter National ID number:", sw: "Weka namba ya kitambulisho (ID):" },
  set_pin:               { en: "Set 4-digit PIN:", sw: "Weka PIN ya tarakimu 4:" },
  reg_success:           { en: "Registration successful. Welcome to NX!", sw: "Ujisajili umefaulu. Karibu NX!" },
  reg_failed:            { en: "Registration failed. Try again.", sw: "Usajili umefeli. Jaribu tena." },
  invalid_national_id:   { en: "Invalid National ID. Must be 7-9 digits.", sw: "Kitambulisho si sahihi. Lazima kiwe tarakimu 7-9." },
  id_exists:             { en: "National ID is already registered.", sw: "Kitambulisho kimeshasajiliwa." },
  invalid_pin:           { en: "Invalid PIN. Must be 4 digits.", sw: "PIN si sahihi. Lazima iwe tarakimu 4." },
  app_failed:            { en: "Application failed. Please try again.", sw: "Ombi limefeli. Jaribu tena." },
  app_submitted:         { en: "Application submitted. We will contact you at {phone}.", sw: "Ombi limewasilishwa. Tutawasiliana nawe kupitia {phone}." },
  enter_merchant_code:   { en: "Enter Merchant Code:", sw: "Weka namba ya muuzaji:" },
  enter_amount:          { en: "Enter Amount (KES):", sw: "Weka kiasi (KES):" },
  confirm_screen_nx:     { en: "Pay {total} KES at {shop}?\nUse {red} NX? (Min {min} KES cash)\nFee: {fee} NX. Earn: +{earned} NX.\n1 Yes\n2 No", sw: "Lipa {total} KES kwa {shop}?\nTumia {red} NX? (Lipa {min} KES taslimu)\nAda: {fee} NX. Pata: +{earned} NX.\n1 Ndio\n2 Hapana" },
  confirm_screen_no_nx:  { en: "Pay {total} KES at {shop}?\n1 Yes\n2 No", sw: "Lipa {total} KES kwa {shop}?\n1 Ndio\n2 Hapana" },
  invalid_merchant_code: { en: "Invalid Merchant Code.", sw: "Namba ya muuzaji sio sahihi." },
  invalid_amount:        { en: "Invalid Amount. Min 5 KES.", sw: "Kiasi kisichokubalika. Angalau KES 5." },
  insufficient_nx:       { en: "Insufficient NX.", sw: "Salio la NX halitoshi." },
  tx_success:            { en: "Payment successful. {ref}\nYou earned {earned} NX!", sw: "Malipo yamekamilika. {ref}\nUmepata {earned} NX!" },
  tx_failed:             { en: "Payment failed.", sw: "Malipo yamefeli." },
  tx_cancelled:          { en: "Payment cancelled.", sw: "Malipo yameghairiwa." },
  tx_expired:            { en: "Transaction expired.", sw: "Muda wa kulipa umeisha." },
  merchant_confirm_prompt:{ en: "CON Pending payment:\nFrom: {phone}\nAmount: KSH {amount}\nNX off: {nx}\n1 Approve\n2 Reject", sw: "CON Malipo yanayosubiri:\nKutoka: {phone}\nKiasi: KSH {amount}\nNX: {nx}\n1 Thibitisha\n2 Kataa" },
  log_basket_prompt:     { en: "CON Transaction Approved!\nLog items sold?\n1 Yes\n2 Skip", sw: "CON Muamala Umeidhinishwa!\nWeka bidhaa zilizouzwa?\n1 Ndio\n2 Kuruka" },
  log_basket_enter:      { en: "CON Enter items sold:\n(e.g. BR*2, pembe 2kg@120*1)", sw: "CON Weka bidhaa zilizouzwa:\n(mfano BR*2, pembe 2kg@120*1)" },
  pending_merchant:      { en: "Waiting for merchant to confirm...", sw: "Tunasubiri muuzaji athibitishe..." },
  merchant_menu:         { en: "CON Merchant Menu\n1 NX Wallet\n2 Restock\n3 Settings", sw: "CON Menyu ya Muuzaji\n1 NX Wallet\n2 Restock\n3 Settings" },
  delivery_confirm_prompt:{ en: "CON Confirm Delivery\nEnter Delivery Agent Code\n(e.g. AJ007)", sw: "CON Thibitisha Mzigo\nWeka kodi ya Msambazaji\n(mfano AJ007)" },
  delivery_success:      { en: "END Delivery Successful!\nAgent: {name}\nShop restocked. Happy selling!", sw: "END Mzigo umepokelewa!\nMtumishi: {name}\nDuka limeongezewa bidhaa. Karibu tena!" },
  agent_invalid:         { en: "END Agent code invalid. Please contact NX Support.", sw: "END Kodi ya msambazaji sio sahihi. Piga NX Support." },
  agent_suspended:       { en: "END Agent suspended. This delivery cannot be confirmed.", sw: "END Msambazaji amesimamishwa. Mzigo huu hauwezi kuthibitishwa." },
  nx_wallet:             { en: "Code: {code}\nRedemption Pool: {pool} NX\nUtilization: {util}% Used\nEarnings Balance: {redeemed} NX\nSpendable ({rate}%): {usable} NX", sw: "Code: {code}\nRedemption Pool: {pool} NX\nUtilization: {util}% Used\nEarnings Balance: {redeemed} NX\nSpendable ({rate}%): {usable} NX" },
  daily_summary:         { en: "END Daily Summary:\nTransactions: {txns}\nCash received: KSH {cash}\nTotal volume: KSH {vol}\nNX redeemed by customers: {red}\nNX earned by customers: {earn}", sw: "END Daily Summary:\nTransactions: {txns}\nCash received: KSH {cash}\nTotal volume: KSH {vol}\nNX redeemed by customers: {red}\nNX earned by customers: {earn}" },
  invoice_settled:       { en: "END Invoice settled!\nNX used: {used}\nNX retained: {ret}\nCash due: KSH {cash}\nPool +{pool_inc} NX\nWe collect cash on delivery.", sw: "END Ankara imelipwa!\nNX used: {used}\nNX retained: {ret}\nCash due: KSH {cash}\nPool +{pool_inc} NX\nMalipo ni wakati wa kufikishiwa mzigo." },
  enter_restock:         { en: "CON Enter restock order:\nUse SKU codes OR brand names:\nBR*10 or SupaLoaf 400g*10\nML*5 or Brookside 500ml*24\nSG*3 or Mumias 2kg*3\nCO*6 or Salit 1L*6\nF*8 or Pembe 5kg*8", sw: "CON Weka oda yako:\nTumia SKU kodi au majina ya bidhaa:\nBR*10 au SupaLoaf 400g*10\nML*5 au Brookside 500ml*24\nSG*3 au Mumias 2kg*3\nCO*6 au Salit 1L*6\nF*8 au Pembe 5kg*8" },
  order_review:          { en: "CON Review Order:\n{items}\n1 Approve\n2 Decline", sw: "CON Hakiki Oda:\n{items}\n1 Thibitisha\n2 Kataa" },
  order_sent_detail:     { en: "END Order sent!\n{items}", sw: "END Oda imetumwa!\n{items}" },
  settings_menu:         { en: "CON Settings\n1 View Code\n2 Update Acceptance %\n3 My Tier", sw: "CON Settings\n1 View Code\n2 Update Acceptance %\n3 My Tier" },
  tier_status_detail:    { en: "END Tier: {tier}\nPool Rate: {pool_pct}%\nAccept Ceiling: {accept_pct}%\nMonthly Fee: KES {fee}", sw: "END Tier: {tier}\nPool Rate: {pool_pct}%\nKiwango cha Kukubali: {accept_pct}%\nAda: KES {fee}" },
  hub_menu:              { en: "CON Hub Menu\n1 Tier Status\n2 Enroll Sub-Merchant\n3 My Earnings", sw: "CON Menyu ya Hub\n1 Tier Status\n2 Enroll Sub-Merchant\n3 My Earnings" },
  hub_stats:             { en: "END [Hub stats: sub-merchant count {count}, tier info {tier}]", sw: "END [Hub stats: sub-merchant count {count}, tier info {tier}]" },
  hub_earnings_detail:   { en: "END This month: {accrued} NX accrued\nUnpaid commissions: {unpaid} NX\nLast payout: {last}", sw: "END Mwezi huu: {accrued} NX umepata\nKomisheni ambazo hazijalipwa: {unpaid} NX\nMalipo ya mwisho: {last}" },
  recover_menu:          { en: "CON Enter your OLD phone number:", sw: "CON Weka namba yako ya zamani:" },
  recover_success_detail: { en: "END Account recovered to new number.\nYour NX balance transferred.\nCode: {code}", sw: "END Akaunti imerejeshwa kwa namba mpya.\nSalio lako la NX limehamishwa.\nCode: {code}" },
  customer_confirm_pay:  { en: "CON Shop: {shop} ({code})\nCustomer: {phone}\nAmount: KSH {amount}\nCash: KSH {cash} | NX: -{nx}\nEarn: +{earn} NX ({rate}%)\nFee: {fee} NX\nTxn: {txn}\n1 Confirm\n2 Cancel", sw: "CON Duka: {shop} ({code})\nCustomer: {phone}\nKiasi: KSH {amount}\nPesa: KSH {cash} | NX: -{nx}\nPata: +{earn} NX ({rate}%)\nAda: {fee} NX\nTxn: {txn}\n1 Thibitisha\n2 Kataa" },
  customer_req_sent:     { en: "END Request sent to merchant.\nTxn: {txn}\nYou'll get SMS once confirmed.", sw: "END Ombi limetumwa kwa muuzaji.\nTxn: {txn}\nUtapata SMS ikishathibitishwa." },
  merchant_confirm_push: { en: "NX Confirm Txn\nCustomer: {name} ({phone})\nAmount: KSH {amount}\nNX off: {nx}\nCash due: KSH {cash}\nTxn: {txn}\n1 Confirm  2 Reject", sw: "NX Thibitisha Muamala\nMashambiki: {name} ({phone})\nKiasi: KSH {amount}\nNX off: {nx}\nPesa: KSH {cash}\nTxn: {txn}\n1 Thibitisha  2 Kataa" },
  receipt_sms:           { en: "NX Receipt - {txn}\nShop: {shop}\nKSH {cash} cash\nNX off: {nx}\nFee: -{fee} NX\nEarned: +{earned} NX\nBalance: {bal} NX", sw: "NX Risiti - {txn}\nDuka: {shop}\nKSH {cash} taslimu\nNX off: {nx}\nAda: -{fee} NX\nImepatikana: +{earned} NX\nSalio: {bal} NX" },
  reject_sms:            { en: "NX: Txn {txn} rejected. No charges. Your NX balance unchanged.", sw: "NX: Muamala {txn} umekataliwa. Hakuna gharama." },
  txn_not_found:         { en: "Transaction not found.", sw: "Muamala haukudhalika." },
  txn_not_found_m:       { en: "Pending transaction not found.", sw: "Hakuna muamala unaosubiri." },
  txn_expired_customer:  { en: "Transaction expired. Please start again.", sw: "Muamala umeisha muda. Tafadhali anza tena." },
  merchant_push:         { en: "NX Confirm: {amount} KES from {name} ({phone})? Redeeming {nx} NX. Payout {cash} KES. Code: {txn}", sw: "NX Thibitisha: {amount} KES kutoka {name}? Anatumia {nx} NX. Lipwa {cash} KES. Code: {txn}" },
  merchant_sms:          { en: "NX New Transaction: {amount} KES from {name} ({phone}). Dial {code} to confirm. Code: {txn}", sw: "NX Muamala Mpya: {amount} KES kutoka {name}. Piga {code} kuthibitisha. Code: {txn}" },
  request_sent:          { en: "Request sent to merchant. Transaction Code: {txn}", sw: "Ombi limetumwa kwa muuzaji. Code: {txn}" },
  invalid_restock_format:{ en: "Invalid restock format. Use Item*Qty.", sw: "Mfumo wa oda si sahihi. Tumia Bidhaa*Kiasi." },
};

const getEnvRestockPhone = () => {
  if (typeof process !== 'undefined' && process.env && process.env['RESTOCK_PHONE']) {
    return process.env['RESTOCK_PHONE'];
  }
  return "0781550151";
};

const rawRestockPhone = getEnvRestockPhone().trim();
export const RESTOCK_PHONE = (rawRestockPhone && rawRestockPhone.length < 15 && /^\+?\d+$/.test(rawRestockPhone)) 
  ? rawRestockPhone 
  : "0781550151";
