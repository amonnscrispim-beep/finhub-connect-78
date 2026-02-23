
-- Add canonical field for liquid financial patrimony (ranking source)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS patrimonio_financeiro_liquido numeric DEFAULT NULL;

-- Backfill: handle empty strings from JSONB
UPDATE public.clients
SET patrimonio_financeiro_liquido = COALESCE(
  CASE 
    WHEN NULLIF(TRIM(strategic_diagnostic->'estruturaPatrimonial'->>'liquidFinancialAssets'), '') IS NOT NULL
    THEN (TRIM(strategic_diagnostic->'estruturaPatrimonial'->>'liquidFinancialAssets'))::numeric
    ELSE NULL
  END,
  NULLIF(financial_assets, 0),
  NULL
);
