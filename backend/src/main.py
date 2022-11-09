import os

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

ENDPOINT_PREFIX = '/api/v1/'
DEVELOPMENT_MODE = 'DEV' in os.environ

app = FastAPI()

if DEVELOPMENT_MODE:
    # Allows accessing the api from a different origin. Required for development purposes, since the frontend will
    # be served at localhost:3000, which is a different origin than localhost:8080.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )


import endpoints.all as endpoints
if endpoints.ALL_ENDPOINTS_IMPORTED:
    print('[Server] Finished registering all endpoints.')