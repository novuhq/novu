-- Add workflow_id column to step_runs table
-- This column stores the workflow template ID for each step execution
ALTER TABLE step_runs
ADD COLUMN IF NOT EXISTS workflow_id String DEFAULT '';


-- Add workflow_id column to traces table
-- This column stores the workflow template ID for each trace
ALTER TABLE traces
ADD COLUMN IF NOT EXISTS workflow_id String DEFAULT '';
