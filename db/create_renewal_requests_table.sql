-- Renewal Requests Table
-- Tracks plan renewal requests

CREATE TABLE IF NOT EXISTS renewal_requests (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    renewal_days INTEGER NOT NULL,
    pro_rated_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, paid, cancelled
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    payment_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES custom_pricing_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_renewal_plan_id ON renewal_requests(plan_id);
CREATE INDEX IF NOT EXISTS idx_renewal_user_id ON renewal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_renewal_status ON renewal_requests(status);
CREATE INDEX IF NOT EXISTS idx_renewal_created_at ON renewal_requests(created_at DESC);

-- Add comment
COMMENT ON TABLE renewal_requests IS 'Tracks plan renewal requests and their payment status';
