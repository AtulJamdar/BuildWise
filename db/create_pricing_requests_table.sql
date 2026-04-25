-- Create pricing_requests table for storing customer custom pricing requests
CREATE TABLE IF NOT EXISTS pricing_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    team_size INT,
    scans_per_month INT,
    specific_features TEXT,
    budget_min DECIMAL(10, 2),
    budget_max DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'pending',
    -- Status: pending, approved, rejected, paid
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_notes TEXT,
    reviewed_by INT,
    -- Admin user_id who reviewed
    reviewed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pricing_requests_user_id ON pricing_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_status ON pricing_requests(status);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_created_at ON pricing_requests(created_at DESC);
