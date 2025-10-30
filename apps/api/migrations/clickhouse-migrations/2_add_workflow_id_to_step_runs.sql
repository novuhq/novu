-- Add workflow_id column to step_runs table
-- This column stores the workflow template ID for each step execution

ALTER TABLE step_runs
ADD COLUMN IF NOT EXISTS workflow_id String DEFAULT '';
