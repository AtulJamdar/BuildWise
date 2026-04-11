-- Run this SQL once to create the invitations table used by the invite flow.
CREATE TABLE invitations (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending'
);
