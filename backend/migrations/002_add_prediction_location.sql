-- SawitVision V3 Phase Lokasi: optional geolocation per prediction record.
-- Run this migration manually in the Supabase SQL Editor.

BEGIN;

ALTER TABLE public.prediction_records
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION NULL,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION NULL,
    ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION NULL,
    ADD COLUMN IF NOT EXISTS location_captured_at TIMESTAMPTZ NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'prediction_records_latitude_range'
          AND conrelid = 'public.prediction_records'::regclass
    ) THEN
        ALTER TABLE public.prediction_records
            ADD CONSTRAINT prediction_records_latitude_range
            CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'prediction_records_longitude_range'
          AND conrelid = 'public.prediction_records'::regclass
    ) THEN
        ALTER TABLE public.prediction_records
            ADD CONSTRAINT prediction_records_longitude_range
            CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'prediction_records_location_accuracy_nonnegative'
          AND conrelid = 'public.prediction_records'::regclass
    ) THEN
        ALTER TABLE public.prediction_records
            ADD CONSTRAINT prediction_records_location_accuracy_nonnegative
            CHECK (location_accuracy IS NULL OR location_accuracy >= 0);
    END IF;
END
$$;

COMMIT;
