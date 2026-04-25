-- Create custom_pricing_plans table for storing admin-created custom pricing
CREATE TABLE IF NOT EXISTS custom_pricing_plans (
    id SERIAL PRIMARY KEY,
    pricing_request_id INT NOT NULL,
    user_id INT NOT NULL,
    custom_price DECIMAL(10, 2) NOT NULL,
    scans_per_month INT NOT NULL,
    features JSONB,
    -- JSON array of features included
    validity_days INT DEFAULT 365,
    -- How many days this pricing is valid
    payment_status VARCHAR(50) DEFAULT 'pending',
    -- pending, paid, expired
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    payment_link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    -- When this custom plan expires
    approved_by INT,
    -- Admin user_id who created this pricing
    approval_notes TEXT,
    FOREIGN KEY (pricing_request_id) REFERENCES pricing_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_pricing_user_id ON custom_pricing_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_pricing_status ON custom_pricing_plans(payment_status);
CREATE INDEX IF NOT EXISTS idx_custom_pricing_request_id ON custom_pricing_plans(pricing_request_id);
CREATE INDEX IF NOT EXISTS idx_custom_pricing_created_at ON custom_pricing_plans(created_at DESC);
