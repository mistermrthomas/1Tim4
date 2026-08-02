-- PATH product model: weekly sermon rhythm (standalone weekly_plans).
-- Seasons are no longer a product dependency. Client persists weeks in IndexedDB;
-- weekly_plans table (20260802000000) is the cloud shape going forward.
--
-- This migration does not drop historical formation season tables yet — they may
-- still hold unused staging rows. Application code no longer reads them for Today,
-- Journey, or planning. A later cleanup can drop season_* tables once confirmed unused.

comment on table weekly_plans is
  'Standalone Sunday–Saturday weekly plans. No parent season required.';
