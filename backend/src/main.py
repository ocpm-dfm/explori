import os

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

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


import endpoints.pm
app.include_router(endpoints.pm.router)

import endpoints.log_management
app.include_router(endpoints.log_management.router)

import endpoints.session
app.include_router(endpoints.session.router)