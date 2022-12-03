# Reasons for needing to call this script from inside the `backend/` directory:
# - In the Celery `Dockerfile` we need to copy files into the image. Those files can only come from inside the Docker
#   build context. That context (below: `docker build . <--`) is given relative to the location the `docker build`
#   command was issued from and we need to make sure that e.g. `data/` lies within it. But we don't want to keep all
#   files needed to run Celery in docker (currently only used on Windows) in the `backend/` directory itself.
# - Docker needs absolute paths for the source mount below. Such an absolute path can only be predictably extended
#   (to somehow point to `backend/src/`) without being hardcoded if we fix the folder the script is being called from.

docker build . -f dev_setup/celery/Dockerfile -t explori-celery

# - Mount source into the container to make sure changes to the code on the host are propagated into the container
#   without needing to rebuild the image and recreate the container.
# - Use mounts instead of volumes as -v doesn't work correctly on windows apparently
# - Use `pwd` to avoid hard coding absolute paths (which docker needs here)
docker create --mount type=bind,source="$(pwd)/src",target=/explori-celery/src/,readonly --name explori-celery explori-celery

docker network create explori-network
docker network connect explori-network explori-redis
docker network connect explori-network explori-celery
