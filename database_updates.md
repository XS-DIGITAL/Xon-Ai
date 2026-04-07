# Database Updates for Xon Ai Platform

Run the following SQL queries to set up the necessary tables for the API platform.

```sql
-- Create table for Groq API Keys
CREATE TABLE IF NOT EXISTS groq_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for Authorized Platform Keys
CREATE TABLE IF NOT EXISTS authorized_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unique_key VARCHAR(255) NOT NULL UNIQUE,
    client_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Usage tracking table
CREATE TABLE IF NOT EXISTS usage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auth_key_id INT,
    groq_key_id INT,
    model VARCHAR(100),
    prompt_tokens INT,
    completion_tokens INT,
    status_code INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auth_key_id) REFERENCES authorized_keys(id),
    FOREIGN KEY (groq_key_id) REFERENCES groq_keys(id)
);
```
