import os

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

import server.endpoints.pm
import server.endpoints.log_management
import server.endpoints.session

import worker.main

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


app.include_router(server.endpoints.pm.router)

app.include_router(server.endpoints.log_management.router)

app.include_router(server.endpoints.session.router)
