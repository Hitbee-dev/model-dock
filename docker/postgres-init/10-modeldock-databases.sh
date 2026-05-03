set -e
: "${POSTGRES_USER:=modeldock}"
: "${LITELLM_POSTGRES_DB:=litellm}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  -v litellm_db="$LITELLM_POSTGRES_DB" \
  -v owner="$POSTGRES_USER" <<-'EOSQL'
  SELECT format('CREATE DATABASE %I', :'litellm_db')
  WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = :'litellm_db'
  )\gexec
  GRANT ALL PRIVILEGES ON DATABASE :"litellm_db" TO :"owner";
EOSQL
