import time
import os

from celery import Celery

REDIS_HOST = os.environ.get('EXPLORI_REDIS_HOST', default='localhost')
REDIS_PORT = os.environ.get('EXPLORI_REDIS_PORT', default='6379')

app = Celery(
    'explori',
    broker=f"redis://{REDIS_HOST}:{REDIS_PORT}/0",
    backend=f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
)
app.autodiscover_tasks(['worker.tasks.dfm', 'worker.tasks.alignments'], force=True)


@app.task()
def test_task(x):
    time.sleep(5)
    return x + 5