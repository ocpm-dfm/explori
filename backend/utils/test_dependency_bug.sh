#!/bin/bash

BACKEND_DIR=$(dirname "$0")/..
VENV_DIR=~/.virtualenvs/explori-backend-test

rm -r "$VENV_DIR"
python3 -m venv "$VENV_DIR"
source "$VENV_DIR"/bin/activate
pip install -r "$BACKEND_DIR"/requirements.txt
PYTHONPATH="$BACKEND_DIR"/src/ python3 -m unittest discover -s "$BACKEND_DIR" -p '*_tests.py'
pip install pm4py==2.3.4
PYTHONPATH="$BACKEND_DIR"/src/ python3 -m unittest discover -s "$BACKEND_DIR" -p '*_tests.py'
