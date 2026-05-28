-- FTS and filter performance indexes for revaluation request search.
-- Apply in staging/prod through your migration pipeline.

BEGIN;

-- Core list filtering indexes
CREATE INDEX IF NOT EXISTS idx_revaluation_requests_created_at
ON revaluation_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revaluation_requests_status
ON revaluation_requests (status);

CREATE INDEX IF NOT EXISTS idx_revaluation_requests_payment_status
ON revaluation_requests (payment_status);

CREATE INDEX IF NOT EXISTS idx_users_department
ON users (department);

-- Full text indexes for search fields
CREATE INDEX IF NOT EXISTS idx_users_full_name_fts
ON users USING GIN (to_tsvector('simple', coalesce(full_name, '')));

CREATE INDEX IF NOT EXISTS idx_users_email_fts
ON users USING GIN (to_tsvector('simple', coalesce(email, '')));

CREATE INDEX IF NOT EXISTS idx_users_reg_no_fts
ON users USING GIN (to_tsvector('simple', coalesce(reg_no, '')));

CREATE INDEX IF NOT EXISTS idx_marks_subject_name_fts
ON marks USING GIN (to_tsvector('simple', coalesce(subject_name, '')));

CREATE INDEX IF NOT EXISTS idx_marks_subject_code_fts
ON marks USING GIN (to_tsvector('simple', coalesce(subject_code, '')));

COMMIT;
