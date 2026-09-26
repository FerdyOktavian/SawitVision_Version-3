FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgomp1 \
        tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-production.txt ./
RUN pip install --no-cache-dir -r requirements-production.txt

COPY . .

EXPOSE 8000

CMD ["python", "start_production.py"]
