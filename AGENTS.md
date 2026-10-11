# Architecture rules

- Keep the patrimonial simulator in a dedicated client-menu module; projections must not modify master diagnostic fields because scenarios are independent planning assumptions.
- Persist simulator state in `public.client_patrimonial_simulations` with user-and-client RLS and separate browser drafts; serialized saves must protect newer edits from older responses.
- Keep monthly financial calculation functions pure and tested, separate from presentation and AI; deterministic calculations preserve auditable financial values.
- Extract planning documents only in the authenticated `patrimonial-prefill` edge function through server-only gateway helpers; AI suggestions require review and cannot silently modify CRM data.
- Capture each report section separately for PDF export and download via Blob anchors; this preserves section boundaries and avoids blocked downloads.
