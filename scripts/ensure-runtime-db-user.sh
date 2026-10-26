#!/bin/sh
set -eu

: "${POSTGRES_HOST:=db}"
: "${POSTGRES_USER:?Set POSTGRES_USER}"
: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}"
: "${POSTGRES_DB:?Set POSTGRES_DB}"
: "${POSTGRES_APP_USER:?Set POSTGRES_APP_USER}"
: "${POSTGRES_APP_PASSWORD:?Set POSTGRES_APP_PASSWORD}"

if [ "$POSTGRES_APP_USER" = "$POSTGRES_USER" ]; then
  echo "POSTGRES_APP_USER must be different from the database bootstrap user." >&2
  exit 1
fi

export PGPASSWORD=$POSTGRES_PASSWORD
psql --no-psqlrc --set=ON_ERROR_STOP=1 \
  --host="$POSTGRES_HOST" --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" <<'SQL'
\getenv runtime_user POSTGRES_APP_USER
\getenv runtime_password POSTGRES_APP_PASSWORD
\getenv database_name POSTGRES_DB
\getenv owner_user POSTGRES_USER
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'runtime_user', :'runtime_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'runtime_user')
\gexec

ALTER ROLE :"runtime_user" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'runtime_password';
GRANT CONNECT ON DATABASE :"database_name" TO :"runtime_user";
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"runtime_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"runtime_user";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :"runtime_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_user" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"runtime_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_user" IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO :"runtime_user";
SQL
