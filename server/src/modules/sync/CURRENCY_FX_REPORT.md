# Currency + FX — how it works (PM)

## Admin flow
**Admin Settings → Currency Settings → Default Currency + rate → Save**

- Dropdown: PKR, USD, EUR, GBP, SAR
- If not PKR: enter **1 {currency} = ___ PKR** (latest market rate)
- Example: today `1 USD = 230 PKR`, tomorrow save `240` — dashboards use **240**

## What happens on save
1. Store / update `exchange_rates.rate_to_pkr` (latest wins)
2. If **currency code changed** (e.g. PKR → USD):
   - Convert all **product** `selling_price` / `purchase_price` with the rate
   - Set `tenants.default_currency` + `products.price_currency`
3. **Past sales / billing invoices are never rewritten** — they keep `sales.currency` / `billing_invoices.currency`

## New vs old invoices
- Old PKR sale → still shows PKR amounts
- New sale after switch → stamped with current default currency
- Admin KPI / total income → converts mixed sales to current default using **latest** rate

## POS
Bootstrap `company.currency` + product prices (already converted on cloud).  
New POS sales should send `currency` or cloud stamps tenant default on sync ingest.
