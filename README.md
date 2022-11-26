# Explori - Enhancing the Discovery of Directly Follows Multigraphs

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Installation
Goal: `docker compose up`, open link.

## Development - Backend

### Requirements
- Python >=3.10
- Docker

### 0. Changing directory 
- Change directory to backend: `cd backend/` **(also needed for the following steps!)**

### 1. Installing dependencies
- Create a new virtual environment: `python -m venv ./venv`
- Activate said environment
  - Windows: `venv\Scripts\activate.bat` (or `activate.ps1` for powershell)
  - Most Linux shells: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

### 2. Setting up Redis using Docker
- Create container: `docker create --name explori-redis -p 6379:6379 redis:alpine`
- Start container: `docker start explori-redis`

### 3. Setting up Celery
#### Celery "native" (this does __not__ work on Windows as Celery doesn't fully support Windows)
- `PYTHONPATH="src/" celery -A worker.main.app worker --loglevel=INFO`

#### Celery using Docker
__Important:__ Run the following commands from inside the `backend/` directory! See `dev_setup/celery/build_docker.sh` for more information about the why.
- Create container: `dev_setup/celery/build_docker.sh`
- Start container: `docker start explori-celery`

### 4. Running the backend
- Start the backend server: `PYTHONPATH="src/" DEV=1 uvicorn server.main:app --host 0.0.0.0`
- See backend address in terminal output

### 5. Testing the backend
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
- Python >=3.10
- Nodejs

### 0. Changing directory
- Change directory to frontend: `cd frontend/` **(also needed for the following steps!)**

### 1. Installing dependencies
- Install dependencies: `npm install`.

### 2. Running the frontend
- Start the frontend server: `npm run start`

### Frontend IDE Alternative
- Install Jetbrains WebStorm
- In WebStorm: `File > Open` and select the frontend folder, let Webstorm automatically install dependencies
- You might need to tell WebStorm that these projects are part of a larger repository, to do so, go into Settings > Version Control > Directory Mappings
