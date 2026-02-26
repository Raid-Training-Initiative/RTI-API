FROM node:24.14.0-alpine@sha256:7fddd9ddeae8196abf4a3ef2de34e11f7b1a722119f91f28ddf1e99dcafdf114 AS builder

RUN apk upgrade --no-cache

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

USER 1000:1000

CMD [ "node", "dist/src/App.js" ]
