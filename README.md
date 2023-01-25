# Explori - Enhancing the Discovery of Directly Follows Multigraphs

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Requirements
- docker, docker-compose

## Getting started
- Syntax:
  - `./app.sh --start optional/path/to/event/logs/`: start app in production mode and optionally specify path to a folder containing event logs to mount into the application
  - `./app.sh --start-dev`: start app in development mode
  - `./app.sh --stop`: stop app
  - `./app.sh --remove`: remove created containers, networks

## Development - Backend

### Requirements
- python >=3.10 (for running native variant)
- docker, docker-compose (for running docker variant)

### 0. Installing dependencies (if at least one component of the following is run in "native" mode)
- `cd backend/`
- Create a new virtual environment: `python -m venv ./venv`
- Activate said environment
  - Windows: `venv\Scripts\activate.bat` (or `activate.ps1` for powershell)
  - Most Linux shells: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

### 1. Redis (only docker)
- `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build --detach redis`

### 2. Celery

#### Native (this does __not__ work on Windows as Celery doesn't fully support Windows)
- `cd backend/`
- `PYTHONPATH="src/" celery -A worker.main.app worker --loglevel=INFO`

#### Docker
- `docker-compose build _backend_base && docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build --detach celery`

It is sufficient to restart the docker container when updating celery worker related code on the host machine as the code 
is mounted into the container. There's no need to rebuild the image or recreate the container, 
a simple restart is enough.

### 3. Fastapi

#### Native
- `cd backend/`
- Start the backend server: `PYTHONPATH="src/" DEV=1 uvicorn server.main:app --host 0.0.0.0`
- See backend address in terminal output

#### Docker
`docker-compose build _backend_base && docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build --detach fastapi`

### 4. Testing the backend API
- __Assuming__ step 4 above signaled Uvicorn running at `http://0.0.0.0:8000`: The fastapi openapi can be found at `http://0.0.0.0:8000/docs`

### Backend IDE Alternative
- Install Jetbrains PyCharm
- In PyCharm: `File > Open` and select `backend/` folder, select Python 3.10, let PyCharm automatically install dependencies
- To have a run target for the backend
  - Open the file `pycharm-launcher.py`
  - Click on the green arrow
  - On the upper right open the configuration settings
    - Set the working directory to the `backend/` directory (without `src/` at the end)
    - Add `;DEV=1` to the environment variables
- To have a run target for Celery (this does __not__ work on Windows, as Celery doesn't officially support Windows. See `Celery using Docker` above)
  - On the upper left of the "Run/Debug Configurations" window
    - Click the "+" and select "Python"
    - As the script path, choose `venv/bin/celery`
    - As parameters set `-A worker.main.app worker --loglevel=INFO`
    - Set the working directory to the `backend/` directory
- You might need to tell PyCharm that these projects are part of a larger repository, to do so, go into Settings > Version Control > Directory Mappings

## Development - Frontend

### Requirements
- Nodejs

### 0. Installing dependenciesn (if at least one component of the following is run in "native" mode)
- `cd frontend/`
- Install dependencies: `npm install`.

### 1. Webserver

#### Native
- `cd frontend/`
- Start the frontend server: `npm run start`

#### Docker
- `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build --detach webserver`

### Frontend IDE Alternative
- Install Jetbrains WebStorm
- In WebStorm: `File > Open` and select the frontend folder, let Webstorm automatically install dependencies
- You might need to tell WebStorm that these projects are part of a larger repository, to do so, go into Settings > Version Control > Directory Mappings
