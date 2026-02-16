-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table (each event has one seating chart)
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE,
  location VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  seating_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert guest user for dev testing
-- Password: guest123 (hashed with bcrypt)
INSERT INTO users (email, password, name)
VALUES ('guest@test.com', '$2b$10$8K1p/a0dVkIqKjYQF0Q5aOKE6rZTkqNGMvVUJJQcAYrZkJuKvK5yO', 'Guest User')
ON CONFLICT (email) DO NOTHING;
