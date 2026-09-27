# SawitVision V3 deployment contract

`backend/.env.example` is the canonical backend environment reference. Keep
real secrets in Railway Variables or an ignored local `.env`, never in Git.

## Railway service configuration

Use these service settings:

```text
Repository:       sawitvision/SawitVision_V3
Root Directory:   /backend
Start Command:    empty / reset
Health-check:     /ready
Workers:          one Uvicorn process
```

The Dockerfile is the only production startup mechanism. Railway supplies
`PORT`; the command falls back to port 8000 only when `PORT` is absent.

```text
backend/Dockerfile
  -> python prepare_models.py
  -> uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
  -> main.py loads YOLO11n and DINOv2 once
```

Docker installs `backend/requirements.txt`. Do not configure a Railway Start
Command that bypasses the Dockerfile.

## Railway required variables

The current production application intentionally uses name + phone login, so
the explicit auth flag must accompany `APP_ENV=production`.

```env
APP_ENV=production
ALLOW_INSECURE_IDENTITY_AUTH=true

DATABASE_URL=<supabase-postgresql-connection-string>
JWT_SECRET_KEY=<strong-random-secret-at-least-32-characters>
CORS_ORIGINS=https://<vercel-frontend-domain>

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<backend-only-service-role-key>

YOLO_MODEL_URL=https://huggingface.co/Ferrdy/SawitVision-DetectClass/resolve/main/yolo11n_v1_best.pt
DINO_CHECKPOINT_URL=https://huggingface.co/Ferrdy/SawitVision-DetectClass/resolve/main/dinov2_vits14_v1_best.pt
YOLO_MODEL_SHA256=0ea20e9dfa6ef65f41c9f4f8125268d464662da204ff0021e483381b7138d9bf
DINO_CHECKPOINT_SHA256=ff9c87057d70853aaf9e68e51242c470a83ba3d34fba8efe09ea8dfc98f15c94
```

For the current two Vercel domains, the exact CORS value is:

```env
CORS_ORIGINS=https://sawitvision.vercel.app,https://sawit-vision-version-3.vercel.app
```

Origins must not contain a trailing slash, path, query, credentials, or
wildcard.

## Railway optional variables

Defaults below match the current one-worker runtime:

```env
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=5
DB_SSLMODE=require
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

SUPABASE_BUCKET=sawitvision-v3-images

AI_DEVICE=auto
YOLO_IMGSZ=640
YOLO_CONFIDENCE=0.40
YOLO_IOU=0.50
AI_MIN_CROP_SIZE=8
DINO_BATCH_SIZE=8
AI_USE_AMP=true
AI_VERIFY_MODEL_SHA256=true
AI_ANNOTATE_DETECTOR_CONFIDENCE=false

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
ENABLE_API_DOCS=false
```

`LOG_LEVEL` accepts `DEBUG`, `INFO`, `WARNING`, `ERROR`, or `CRITICAL`.
Enable `TRUST_PROXY_HEADERS` only when the backend is reachable exclusively
through a trusted proxy that overwrites forwarded-IP headers.

## Model acquisition and storage path

`prepare_models.py` downloads and verifies these exact files before Uvicorn
starts:

```text
/app/models/yolo11n_v1_best.pt
/app/models/dinov2_vits14_v1_best.pt
```

The Docker build excludes local model artifacts. If a persistent Railway
volume is later used for model caching, mount it at `/app/models` so both
`prepare_models.py` and the AI loader resolve the same files.

Leave these path overrides unset on Railway under the current startup:

```text
AI_MODEL_DIR
YOLO_MODEL_PATH
DINO_CHECKPOINT_PATH
```

The public Hugging Face URLs do not require a model-download token.

## Health and readiness

- `GET /health` is process liveness only. It performs no database, inference,
  Storage, or geocoder call.
- `GET /ready` checks loaded YOLO/DINO objects and executes `SELECT 1` against
  PostgreSQL. Storage and geocoding are reported from configuration without
  contacting those providers.
- `/ready` returns HTTP 503 when AI or PostgreSQL is not ready.

Use `/ready` as Railway's deployment health-check so traffic begins only after
model loading succeeds and PostgreSQL is reachable.

Every HTTP response includes `X-Request-ID`. Request logs contain the request
ID, method, path without query string, status, and duration.

## Vercel frontend

Configure the Vercel project Root Directory as `frontend` and set:

```env
VITE_API_BASE_URL=https://sawitvisionv3-production.up.railway.app
```

`VITE_API_BASE_URL` is public configuration. Never place database, JWT,
Supabase service-role, or other backend secrets in a `VITE_*` variable.

The URL relationship is:

```text
Vercel VITE_API_BASE_URL = Railway backend HTTPS origin
Railway CORS_ORIGINS     = Vercel frontend HTTPS origin(s)
```

## Supabase responsibilities

- `DATABASE_URL`: Supabase PostgreSQL connection used by SQLAlchemy.
- `SUPABASE_URL`: Supabase API and Storage project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: backend-only Storage credential.
- `SUPABASE_BUCKET`: processed-image and thumbnail bucket.

## Required migrations

Apply these manually and in order to a new target database. Do not assume the
presence of local migration files means they were applied remotely.

1. `001_add_prediction_detections.sql` - multi-TBS child records.
2. `002_add_prediction_location.sql` - coordinates, accuracy, capture time.
3. `003_add_prediction_location_names.sql` - automatic/editable location names.

## Dependency snapshot procedure

Do this after the working Railway deployment passes smoke tests:

1. Open a shell for the exact running Railway image.
2. Run `python -m pip freeze` and retain the result for review.
3. Match resolved versions to direct packages in `requirements.txt`; do not
   copy every transitive dependency blindly.
4. Pin only versions proven by that running image.
5. Rebuild staging from scratch and repeat `/health`, `/ready`, auth,
   prediction, Storage, report, and admin smoke tests.
