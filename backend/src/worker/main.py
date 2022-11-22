import time

from celery import Celery

app = Celery(
    'explory',
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)
app.autodiscover_tasks(['worker.tasks.dfm'], force=True)


@app.task()
def test_task(x):
    time.sleep(5)
    return x + 5