from redis.client import Redis


def run():
    redis = Redis('localhost', 6379)
    for key in redis.scan_iter("*ocel*"):
        redis.delete(key)
        print(f"Deleted {key}")
    print("Done")


if __name__ == '__main__':
    run()