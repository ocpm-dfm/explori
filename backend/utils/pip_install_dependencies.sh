#!/usr/bin/env sh

BACKEND_DIR=$(dirname "$0")/..

pip install -r "$BACKEND_DIR"/requirements.txt
pip install pm4py==2.3.4
