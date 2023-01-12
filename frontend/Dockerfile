ARG BUILD_ENV

FROM node:16 as common_pre_build
ONBUILD WORKDIR /explori/webserver

FROM common_pre_build as prod_build
ONBUILD COPY public/ public/
ONBUILD COPY src/ src/
ONBUILD COPY tsconfig.json .

FROM common_pre_build as dev_build

FROM ${BUILD_ENV}_build
COPY package.json .
COPY package-lock.json .
# TODO: add NODE_ENV=production once frontend (e.g. api.ts `API_BASE_URL`) supports production mode
RUN npm ci
CMD PORT=3000 npm run start
