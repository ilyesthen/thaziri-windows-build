-- CreateTable: actes_honoraires
-- Table for medical acts and their fees
CREATE TABLE actes_honoraires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    acte_pratique TEXT NOT NULL,
    honoraire_encaisser INTEGER NOT NULL DEFAULT 0,
    percentage_assistant_1 INTEGER NOT NULL DEFAULT 0,
    percentage_assistant_2 INTEGER NOT NULL DEFAULT 0
);

-- CreateTable: audit_log
-- Table for tracking user actions and changes
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    user_role VARCHAR(50),
    session_name TEXT,
    action_type VARCHAR(100),
    details TEXT,
    FOREIGN KEY (user_id) REFERENCES User (id)
);

-- Create index on audit_log for faster querying by user and timestamp
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_action_type ON audit_log(action_type);
