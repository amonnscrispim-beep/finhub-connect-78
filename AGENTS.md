# Architecture rules

- The client-menu patrimonial tab renders `ProjecaoPatrimonial` (pure math in `projecao-calc.ts`), saving under the `projecao` key of the existing simulation row so older simulator data is kept; the old simulator component is kept unused.
- Keep the patrimonial simulator in a dedicated client-menu module; projections must not modify master diagnostic fields because scenarios are independent planning assumptions.
- Persist simulator state in `public.client_patrimonial_simulations` with user-and-client RLS and separate browser drafts; serialized saves must protect newer edits from older responses.
- Keep monthly financial calculation functions pure and tested, separate from presentation and AI; deterministic calculations preserve auditable financial values.
- Extract planning documents only in the authenticated `patrimonial-prefill` edge function through server-only gateway helpers; AI suggestions require review and cannot silently modify CRM data.
- Capture each report section separately for PDF export and download via Blob anchors; this preserves section boundaries and avoids blocked downloads.

- Public form links use a 6-char `short_code` (`/f/:code`); the `client-form` edge function resolves short codes and long tokens server-side so the public never queries the table directly.
- Suitability records live in `client_suitability` (one `active` row per client, older ones `superseded`, 24-month validity); scoring is a pure function in `suitability/scoring.ts`.
