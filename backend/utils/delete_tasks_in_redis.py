import os
from redis.client import Redis

REDIS_HOST = os.environ.get('EXPLORI_REDIS_HOST', default='localhost')
REDIS_PORT = os.environ.get('EXPLORI_REDIS_PORT', default='6379')

def run():
    redis = Redis(REDIS_HOST, REDIS_PORT)
    for key in redis.scan_iter("*ocel*"):
        redis.delete(key)
        print(f"Deleted {key}")
    print("Done")


if __name__ == '__main__':
    run()