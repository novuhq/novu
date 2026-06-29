-- Add source column to requests table
-- Low-cardinality discriminator distinguishing the origin of a logged request.
-- Existing rows are all HTTP API requests, so the column defaults to 'http'.
-- Inbound-email request logs (written from the worker) set source = 'inbound_email'.
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS source LowCardinality(String) DEFAULT 'http';
