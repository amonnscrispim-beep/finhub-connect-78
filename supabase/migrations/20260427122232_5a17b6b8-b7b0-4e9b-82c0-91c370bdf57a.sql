-- Add return fields and editable technical summary to client_extract_snapshots
ALTER TABLE public.client_extract_snapshots
  ADD COLUMN IF NOT EXISTS return_month_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_month_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_year_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_year_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS technical_summary text DEFAULT '',
  ADD COLUMN IF NOT EXISTS consultant_comments text DEFAULT '';

-- Backfill: any asset whose type or name contains 'DEB' (debênture) becomes tax exempt
UPDATE public.client_extract_assets
SET is_tax_exempt = true
WHERE (
  upper(coalesce(asset_type, '')) LIKE '%DEB%'
  OR upper(coalesce(asset_name, '')) LIKE '%DEB%'
);