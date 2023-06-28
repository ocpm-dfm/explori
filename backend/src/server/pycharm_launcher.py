EMULATE_SERVER = False

HOSTNAME = 'localhost'
PORT = 8001

if __name__ == '__main__':
    if EMULATE_SERVER:
        import subprocess
        subprocess.run(f"PYTHONPATH=\"src/\" uvicorn server.main:app --host {HOSTNAME} --port {PORT}", shell=True)
    else:
        import uvicorn
        import main
        uvicorn.run(main.app, host=HOSTNAME, port=PORT)
