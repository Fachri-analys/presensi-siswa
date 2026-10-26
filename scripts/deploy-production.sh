#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE=${ENV_FILE:-"$PROJECT_ROOT/.env.production"}
COMPOSE_FILE=${COMPOSE_FILE:-"$PROJECT_ROOT/docker-compose.production.yml"}
RELEASE_TAG=${RELEASE_TAG:-$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)}
BUILD_IMAGES=${BUILD_IMAGES:-true}
export RELEASE_TAG

if [ ! -f "$ENV_FILE" ]; then
  echo "Copy .env.production.example to $ENV_FILE and fill in the production values first." >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
case "$BUILD_IMAGES" in
  true) docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build ;;
  false) ;;
  *) echo "BUILD_IMAGES must be true or false." >&2; exit 1 ;;
esac
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile edge up -d --no-build --remove-orphans
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Deployment started. Check container health, then open the HTTPS domain configured in $ENV_FILE."
