-- Enable pg_net for async HTTP from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;

-- Schedule streak reminder at 20:00 UTC daily
SELECT cron.schedule(
  'streak-reminder-daily',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/streak-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);

-- Schedule leaderboard notifications hourly
SELECT cron.schedule(
  'leaderboard-notifications-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/leaderboard-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);
