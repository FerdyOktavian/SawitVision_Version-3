# SawitVision V3 Railway staging checklist

Use this after the first Railway deployment. Record timestamps, request IDs,
latency, memory, and failures without copying tokens, phone numbers,
coordinates, database URLs, or signed URLs into tickets/log notes.

## Infrastructure

- [ ] Railway build and deploy complete without secret values in logs.
- [ ] Root Directory is `backend`; Dockerfile starts one worker.
- [ ] Railway health-check path is `/ready`.
- [ ] `GET /health` returns HTTP 200 and `status=ok` quickly.
- [ ] `GET /ready` returns HTTP 200 and all required components are ready.
- [ ] Both responses include a safe `X-Request-ID`.
- [ ] Model acquisition completes or uses the mounted cache as expected.
- [ ] Both model SHA-256 checks report success.
- [ ] A restart reuses valid cached models when a `/models` volume is used.

## Database

- [ ] `/ready` confirms the lightweight `SELECT 1` check.
- [ ] Register/login can access the staging auth tables.
- [ ] Prediction parent records are created.
- [ ] Multi-TBS child detections are created with stable indexes.
- [ ] Latitude, longitude, accuracy, and captured-at columns work.
- [ ] Automatic and editable location-name columns work.
- [ ] Migrations 001, 002, and 003 were applied in order to staging only.

## Storage

- [ ] A processed annotated image uploads successfully.
- [ ] Its thumbnail uploads and renders successfully.
- [ ] History deletion cleans up both Storage objects.
- [ ] A Storage failure remains fail-soft and does not lose the DB result.
- [ ] No service-role key or signed URL appears in logs.

## AI

- [ ] One representative image completes successfully.
- [ ] A valid image with zero detections returns the expected safe result.
- [ ] A multi-TBS image preserves API, DB, annotation, and UI ordering.
- [ ] Observe CPU inference latency without running a load benchmark.
- [ ] Observe idle and post-inference memory for the Railway service.
- [ ] Logs show total prediction and AI duration with a request ID.

## User flow

- [ ] Temporary private-staging name/phone registration works.
- [ ] Login and authenticated session work.
- [ ] Camera/gallery prediction works from the Vercel frontend.
- [ ] History list and detail render.
- [ ] Location name can be edited from prediction/history as designed.
- [ ] Image-level and TBS-level statistics are correct.
- [ ] User Excel export downloads and matches visible data.

## Admin flow

- [ ] Admin dashboard loads totals and charts.
- [ ] User management/listing works for an authorized admin.
- [ ] Admin image/TBS statistics match direct staging samples.
- [ ] Admin report exports successfully.

## Network and integration

- [ ] Vercel `VITE_API_BASE_URL` points to the Railway HTTPS origin.
- [ ] Railway `CORS_ORIGINS` exactly matches the Vercel HTTPS origin.
- [ ] Allowed frontend requests pass CORS; an unrelated origin is rejected.
- [ ] Geocoder timeout/failure remains non-blocking for prediction.
- [ ] Login, register, predict, geocode, and location-edit limits return 429.

## Failure behavior

- [ ] Invalid type, corrupt image, and oversized upload are rejected safely.
- [ ] During a controlled DB outage, `/health` stays 200 and `/ready` is 503.
- [ ] After DB recovery, `/ready` returns 200 without a service restart.
- [ ] Geocoder timeout returns the safe unavailable-name behavior.
- [ ] Missing/invalid model prevents readiness/startup without inference.
- [ ] A service restart reacquires/verifies models and becomes ready.
- [ ] Client 500 responses are sanitized; server logs retain request IDs.

## Resources and concurrency

- [ ] Record cold-start time through model verification and app readiness.
- [ ] Record idle RAM after readiness stabilizes.
- [ ] Record peak RAM during one representative multi-TBS prediction.
- [ ] Record end-to-end and AI inference latency.
- [ ] Try two near-simultaneous requests and observe serialization/memory.
- [ ] Confirm the initial deployment still uses exactly one worker.

## Dependency snapshot

- [ ] After all checks pass, run `python -m pip freeze` in the exact Railway
  image and retain it for review.
- [ ] Pin unresolved direct production dependencies to tested versions.
- [ ] Rebuild staging from scratch and repeat critical smoke tests.
