# to run on old raspberry pis, use arm32v6/node:lts-alpine
FROM node:lts-bookworm AS builder
WORKDIR /build

COPY package*.json .
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src src/
COPY RTIBot-DB RTIBot-DB/
COPY resources resources/

RUN npm run tsc

FROM builder

ENV NODE_ENV=production
ENV CONFIG=Release


WORKDIR /app
VOLUME /data

COPY package*.json .
COPY --from=builder /build/dist /app/dist

RUN npm ci --omit=dev

ARG commitId
ARG branch
ENV COMMIT_ID=$commitId
ENV BRANCH=$branch

CMD [ "node", "dist/src/App.js" ]
