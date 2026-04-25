-- Invoices Table
-- Stores all invoice records for payments

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    reference_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, overdue, cancelled
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES custom_pricing_plans(id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_invoice_plan_id ON invoices(plan_id);
CREATE INDEX IF NOT EXISTS idx_invoice_user_email ON invoices(user_email);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_reference_id ON invoices(reference_id);

-- Add comment
COMMENT ON TABLE invoices IS 'Stores invoice records for all custom pricing plan payments';
