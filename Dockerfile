# to run on old raspberry pis, use arm32v6/node:lts-alpine
FROM node:12.14.1-stretch AS builder
WORKDIR /build
COPY ["package.json", "package-lock.json*", "tsconfig.json", "./"]
RUN npm install --silent
RUN npm install --silent --global typescript
COPY src src/
COPY RTIBot-DB RTIBot-DB/
RUN tsc -p tsconfig.json

FROM node:12.14.1-stretch
ENV NODE_ENV production
ENV CONFIG Release
WORKDIR /usr/src/app
RUN npm install --silent --global pm2
RUN mkdir /data
COPY --from=builder /build .
COPY ["Config.json", "ConfigDebug.json", "./"]

CMD [ "pm2-runtime", "dist/src/App.js" ]