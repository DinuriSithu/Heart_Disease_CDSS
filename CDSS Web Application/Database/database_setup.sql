CREATE ROLE cdss_app
WITH LOGIN
PASSWORD 'REPLACE_WITH_YOUR_PASSWORD';

CREATE DATABASE heart_disease_cdss
OWNER cdss_app;

GRANT CONNECT ON DATABASE heart_disease_cdss
TO cdss_app;