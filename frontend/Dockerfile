FROM node:16

ENV WEBSERVER_PORT=80

WORKDIR /explori/webserver

COPY package*.json .
RUN npm install

COPY public/ public/
COPY src/ src/
COPY tsconfig.json .
# replace with the following once .dockerignore exists
#COPY . .

# TODO: port forwarding not working, uses port 3000 apparently
CMD npm run start -- --port ${WEBSERVER_PORT}
