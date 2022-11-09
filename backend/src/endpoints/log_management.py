from main import ENDPOINT_PREFIX, app

URI_PREFIX = ENDPOINT_PREFIX + 'logs/'


@app.get(URI_PREFIX + 'test')
def test():
    return {'status': 'successful'}


LOG_MANAGEMENT_ENDPOINTS_IMPORTED = True