-- Plan Usage Tracking Table
-- Records daily scan usage for each plan

CREATE TABLE IF NOT EXISTS plan_usage_tracking (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL,
    scans_count INTEGER NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES custom_pricing_plans(id) ON DELETE CASCADE,
    UNIQUE(plan_id, DATE(recorded_at))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_plan_usage_plan_id ON plan_usage_tracking(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_usage_recorded_at ON plan_usage_tracking(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_usage_date ON plan_usage_tracking(DATE(recorded_at));

-- Add comment
COMMENT ON TABLE plan_usage_tracking IS 'Tracks daily scan usage for each custom pricing plan';
