#!/bin/sh
docker-compose build --build-arg commitId="$(git rev-parse --short HEAD)" --build-arg branch="$(git rev-parse --abbrev-ref HEAD)"
docker-compose up -d --force-recreate
