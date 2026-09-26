-- SawitVision V3 Phase Lokasi D: optional reverse-geocoded and user-editable
-- location names per prediction record.
-- Run this migration manually in the Supabase SQL Editor.

BEGIN;

ALTER TABLE public.prediction_records
    ADD COLUMN IF NOT EXISTS location_auto_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS location_label TEXT NULL;

COMMIT;
