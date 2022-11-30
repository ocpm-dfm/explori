# Explori - Enhancing the Discovery of Directly Follows Multigraphs

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Installation
Goal: `docker compose up`, open link.

## Development

### Setting up the environment

Setting up Redis:

1. Install docker if not yet installed.
2. `docker run -d --name redis -p 6379:6379 redis:alpine`
3. If you need to start the server again at a later point (e.g. after a reboot), you can do so by executing `docker start redis`.

Option 1: The lazy / JetBarins route

1. Install PyCharm and WebStorm
2. Clone this repository manually (by calling `git clone ...` in a folder)
3. In WebStorm: File > Open > Select the frontend folder, let Webstorm automatically install dependencies
4. Install Python 3.10 or 3.11 on your system
5. In PyCharm: File > Open > Select backend folder, select Python 3.10, let PyCharm automatically install dependencies.
6. To run backend: Open the file "pycharm-launcher.py", click on the green arrow. Then on the upper right open the configuration settings and remove the "/src" from the working directory. Add ";DEV=1" to the environment variables.
7. On the upper left of the "Run/Debug Configurations" window, click the "+" and select "Python".
8. As the script path, choose `venv/bin/celery`.
9. As parameters set `-A worker.main.app worker --loglevel=INFO`
10. Set the working directory to the `backend` folder.

You might need to tell WebStorm / PyCharm that these projects are part of a larger repository, to do so, go into Settings > Version Control > Directory Mappings.


Option 2: Manual route

Not quite sure whether it is correct and / or complete.

1. Install Node.js and Python 3.11
2. Clone the repository
3. In the frontend folder run `npm install`.
4. In the backend folder run the following commands:

    a. `python -m venv venv`, this should create an virtual environment.

    b. Windows: `venv\Scripts\activate.bat` (or `...\activate.ps1` for powershell), most Linux shells: `source venv/bin/activate`

    c. `pip install -r requirements.txt`

To set development environment variable, type `export $DEV="1"` in bash terminal (wsl2). Verify that variable has been set using `echo $DEV`

Now, you can start the frontend server using `npm run start`, and the FastAPI server using
`PYTHONPATH="src/" uvicorn server.main:app --host 0.0.0.0 --port 8080` and a Celery worker using
`PYTHONPATH="src/" celery -A worker.main.app worker --loglevel=INFO`.
