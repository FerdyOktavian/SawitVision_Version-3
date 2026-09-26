-- SawitVision V3 Phase 4: additive multi-detection persistence.
-- Run this migration manually in the Supabase SQL Editor before restarting
-- backend code that writes to public.prediction_detections.

BEGIN;

CREATE TABLE IF NOT EXISTS public.prediction_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_record_id UUID NOT NULL,
    detection_index INTEGER NOT NULL,
    x1 INTEGER NOT NULL,
    y1 INTEGER NOT NULL,
    x2 INTEGER NOT NULL,
    y2 INTEGER NOT NULL,
    detector_confidence DOUBLE PRECISION NOT NULL,
    maturity_class TEXT NOT NULL,
    maturity_class_index INTEGER NOT NULL,
    maturity_confidence DOUBLE PRECISION NOT NULL,
    prob_belum_masak DOUBLE PRECISION NOT NULL,
    prob_masak DOUBLE PRECISION NOT NULL,
    prob_terlalu_masak DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT prediction_detections_record_fk
        FOREIGN KEY (prediction_record_id)
        REFERENCES public.prediction_records(id)
        ON DELETE CASCADE,
    CONSTRAINT prediction_detections_record_index_key
        UNIQUE (prediction_record_id, detection_index),
    CONSTRAINT prediction_detections_index_nonnegative
        CHECK (detection_index >= 0),
    CONSTRAINT prediction_detections_bbox_valid
        CHECK (x1 >= 0 AND y1 >= 0 AND x2 > x1 AND y2 > y1),
    CONSTRAINT prediction_detections_maturity_class_valid
        CHECK (
            maturity_class IN (
                'belum_masak',
                'masak',
                'terlalu_masak'
            )
        ),
    CONSTRAINT prediction_detections_maturity_index_valid
        CHECK (maturity_class_index IN (0, 1, 2)),
    CONSTRAINT prediction_detections_class_index_match
        CHECK (
            (maturity_class = 'belum_masak' AND maturity_class_index = 0)
            OR (maturity_class = 'masak' AND maturity_class_index = 1)
            OR (
                maturity_class = 'terlalu_masak'
                AND maturity_class_index = 2
            )
        ),
    CONSTRAINT prediction_detections_detector_confidence_range
        CHECK (detector_confidence BETWEEN 0 AND 100),
    CONSTRAINT prediction_detections_maturity_confidence_range
        CHECK (maturity_confidence BETWEEN 0 AND 100),
    CONSTRAINT prediction_detections_prob_belum_range
        CHECK (prob_belum_masak BETWEEN 0 AND 100),
    CONSTRAINT prediction_detections_prob_masak_range
        CHECK (prob_masak BETWEEN 0 AND 100),
    CONSTRAINT prediction_detections_prob_terlalu_range
        CHECK (prob_terlalu_masak BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS prediction_detections_record_id_idx
    ON public.prediction_detections (prediction_record_id);

COMMENT ON TABLE public.prediction_detections IS
    'Per-TBS YOLO detection and DINOv2 maturity results for one prediction record.';

COMMENT ON COLUMN public.prediction_detections.detection_index IS
    'Stable zero-based position of the detection in the inference result.';

COMMIT;

-- RLS is intentionally not enabled and no policies are created here.
-- This repository accesses PostgreSQL through the backend DATABASE_URL, not
-- directly from the browser. If this table is later exposed through the
-- Supabase Data API, review RLS and role grants before enabling client access.
