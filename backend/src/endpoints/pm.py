from main import ENDPOINT_PREFIX, app


URI_PREFIX = ENDPOINT_PREFIX + 'pm/'


@app.get(URI_PREFIX + 'test')
def test():
    return {'status': 'successful'}


PROCESS_MINING_ENDPOINTS_IMPORTED = True