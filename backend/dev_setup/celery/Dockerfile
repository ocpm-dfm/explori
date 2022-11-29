# celery worker needs pm4py (amongst others) which in turn has dependencies which need to be compiled -> can't use minimalistic image like alpine
FROM python:3.10-slim-buster

# PYTHONPATH: needed to specify the celery app `worker.main.app` relative to it
# EXPLORI_REDIS_HOST: needed to specify the address of the redis docker container (simply its name since they're in the same docker network)
ENV PYTHONUNBUFFERED=1 PYTHONPATH=src/ EXPLORI_REDIS_HOST=explori-redis

WORKDIR /explori-celery

COPY requirements.txt .
COPY data/ data/

RUN pip install --no-cache-dir -r requirements.txt

ENTRYPOINT ["celery", "--app=worker.main.app", "worker", "--loglevel=INFO"]
