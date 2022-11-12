# Explori - Enhancing the Discovery of Directly Follows Multigraphs

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Installation
Goal: `docker compose up`, open link.

## Development

### Setting up the environment

Option 1: The lazy / JetBarins route

1. Install PyCharm and WebStorm
2. Clone this repository manually (by calling `git clone ...` in a folder)
3. In WebStorm: File > Open > Select the frontend folder, let Webstorm automatically install dependencies
4. Install Python 3.10 oder 3.11 on your system
5. In PyCharm: File > Open > Select backend folder, select Python 3.10, let PyCharm automatically install dependencies.
6. To run backend: Open the file "puycharm-launcher.py", click on the green arrow. Then on the upper right open the configuration settings and remove the "/src" from the working directory.

You might need to tell WebStorm / PyCharm that these projects are part of a larger repository, to do so, go into Settings > Version Control > Directory Mappings.


Option 2: Manual route

Not quite sure whether it is correct and / or complete.

1. Install Node.js and Python 3.11
2. Clone the repository
3. In the frontend folder run `npm install`.
4. In the backend folder run the following commands:

    a. `python -m venv venv`, this should create an virtual environment.

    b. Windows: `venv\Scripts\activate.bat`, most Linux shells: `source venv/bin/activate`

    c. `pip install -r requirements.txt`

Now, you can start the frontend server using `npm run start`, and the backend server using
`PYTHONPATH="src/" uvicorn main:app --host 0.0.0.0`.
