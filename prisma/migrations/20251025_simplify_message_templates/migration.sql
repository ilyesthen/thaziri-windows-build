-- Drop both old tables if they exist
DROP TABLE IF EXISTS "MessageTemplate";
DROP TABLE IF EXISTS message_templates;

-- Create simplified message_templates table with only id and content
CREATE TABLE message_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL
);
