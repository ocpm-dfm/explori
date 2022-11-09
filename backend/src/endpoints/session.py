from main import ENDPOINT_PREFIX, app

URI_PREFIX = ENDPOINT_PREFIX + 'session/'


@app.get(URI_PREFIX + 'test')
def test():
    return {'status': 'successful'}


SESSION_ENDPOINTS_IMPORTED = True