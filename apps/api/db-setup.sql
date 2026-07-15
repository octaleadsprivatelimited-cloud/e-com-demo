-- Creates a dedicated least-privilege app role + database for Poltica.
-- Safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'poltica_app') THEN
    CREATE ROLE poltica_app LOGIN PASSWORD 'CHANGE_ME_TO_A_SECURE_PASSWORD';
  ELSE
    ALTER ROLE poltica_app LOGIN PASSWORD 'CHANGE_ME_TO_A_SECURE_PASSWORD';
  END IF;
END
$$;
SELECT 'CREATE DATABASE poltica OWNER poltica_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'poltica')\gexec
