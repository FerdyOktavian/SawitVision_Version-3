# SawitVision V3 deployment variables

`backend/.env.example` is the canonical backend environment contract. Keep
real values in Railway Variables or an ignored local `.env`, never in Git.

## Railway required

Use Railway Root Directory `backend`. The detected `Dockerfile` runs
`python start_production.py` with one worker. Railway supplies `PORT`.

For private staging with the current name + phone login:

```env
APP_ENV=staging
DATABASE_URL=<supabase-postgresql-connection-string>
JWT_SECRET_KEY=<strong-random-secret>
CORS_ORIGINS=https://<vercel-frontend-domain>

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<backend-only-service-role-key>
SUPABASE_BUCKET=sawitvision-v3-images

YOLO_MODEL_URL=https://<artifact-host>/<yolo-artifact>
DINO_CHECKPOINT_URL=https://<artifact-host>/<dino-artifact>
YOLO_MODEL_SHA256=<locked-yolo-sha256>
DINO_CHECKPOINT_SHA256=<locked-dino-sha256>
```

If the artifact URLs are private and accept a bearer token:

```env
AI_MODEL_DOWNLOAD_TOKEN=<artifact-read-token>
```

For a Railway Volume mounted at `/models`:

```env
AI_MODEL_DIR=/models
```

The URLs remain useful for first boot or replacing an artifact whose hash no
longer matches. A valid cached artifact is not downloaded again.

## Railway optional

Defaults below are suitable for initial single-worker staging:

```env
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=5
DB_SSLMODE=require
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

AI_DEVICE=auto
YOLO_IMGSZ=640
YOLO_CONFIDENCE=0.40
YOLO_IOU=0.50
AI_MIN_CROP_SIZE=8
DINO_BATCH_SIZE=8
AI_USE_AMP=true
AI_VERIFY_MODEL_SHA256=true
AI_MODEL_DOWNLOAD_TIMEOUT_SECONDS=120

GEOCODING_ENABLED=true
GEOCODING_PROVIDER=nominatim
GEOCODING_TIMEOUT_SECONDS=5
GEOCODING_NOMINATIM_URL=https://nominatim.openstreetmap.org/reverse
GEOCODING_USER_AGENT=SawitVisionV3/1.0
GEOCODING_LANGUAGE=id

APP_STORAGE_LIMIT_GB=1
MIN_SAVE_CONFIDENCE=70
LOG_LEVEL=INFO
RATE_LIMIT_ENABLED=true
TRUST_PROXY_HEADERS=false
```

`LOG_LEVEL` accepts `DEBUG`, `INFO`, `WARNING`, `ERROR`, or `CRITICAL`.
Invalid values fail startup validation. Keep `INFO` for staging/production.

## Health and readiness

- `GET /health` is process liveness only. It performs no database, model
  inference, Storage, or geocoder call.
- `GET /ready` verifies that the in-process YOLO/DINO components exist and
  executes only `SELECT 1` against PostgreSQL. Storage and geocoding are
  reported from configuration without contacting those providers.
- `/ready` returns HTTP 503 when AI or PostgreSQL is not ready. Optional
  Storage/geocoding states do not cause a 503.

For Railway staging, set the deployment health-check path to `/ready` so a
new instance does not receive traffic before models have loaded and the
database is reachable. Use `/health` only for a liveness monitor whose job is
to restart a stuck process; it deliberately does not prove dependencies are
ready. Keep the initial Railway deployment at one worker.

Every HTTP response includes `X-Request-ID`. A valid bounded incoming value
is reused; otherwise the backend generates a UUID. Request logs contain only
the request ID, method, path (without query string), status, and duration.

`TRUST_PROXY_HEADERS=true` is valid only when the backend cannot be reached
except through a trusted proxy that overwrites forwarded-IP headers.

With `APP_ENV=production`, API docs and the temporary name + phone auth are
disabled by default. Do not enable `ALLOW_INSECURE_IDENTITY_AUTH` for a public
production deployment; proof-of-ownership remains future work.

## Vercel required

Configure the Vercel project Root Directory as `frontend` and set:

```env
VITE_API_BASE_URL=https://<railway-backend-domain>
```

`VITE_API_BASE_URL` is public configuration. Never place database, JWT,
Supabase service-role, or model-download secrets in a `VITE_*` variable.
Production builds fail when this value is absent, invalid, or non-HTTPS.

## CORS relationship

The two URLs point in opposite directions:

```text
Vercel VITE_API_BASE_URL = Railway backend HTTPS origin
Railway CORS_ORIGINS     = Vercel frontend HTTPS origin
```

Use exact origins without a trailing slash. Credentialed CORS rejects `*`.

## Supabase responsibilities

- `DATABASE_URL`: PostgreSQL connection used by SQLAlchemy.
- `SUPABASE_URL`: Supabase API and Storage project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: backend-only Storage credential.
- `SUPABASE_BUCKET`: bucket containing processed images and thumbnails.

## Required migrations

Apply these manually, in order, to the target Supabase project before staging:

1. `001_add_prediction_detections.sql` — multi-TBS child records.
2. `002_add_prediction_location.sql` — coordinates, accuracy, capture time.
3. `003_add_prediction_location_names.sql` — automatic/editable location names.

Do not assume local migration files have already been applied remotely.

## Dependency snapshot after first successful staging build

Do this only after Railway staging builds and the smoke tests pass:

1. Open a Railway shell for the exact running image.
2. Run `python -m pip freeze` and save the output as a build artifact or local
   review file; do not commit it blindly.
3. Match the resolved versions to each direct package in
   `requirements-production.txt`, excluding unrelated transitive packages.
4. Update the remaining unpinned direct dependencies to those tested exact
   versions.
5. Rebuild staging from scratch, then repeat `/health`, `/ready`, auth,
   prediction, report, and admin smoke tests.
6. Commit the pins only after the rebuilt staging image passes.
