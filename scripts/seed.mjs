import { createPool } from '@vercel/postgres';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

// Load .env.local
config({ path: '.env.local' });

async function seed() {
  console.log('🌱 Seeding database...');

  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL not found in .env.local');
    console.error('   Run: npm run setup');
    process.exit(1);
  }

  const pool = createPool({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    // Create users table
    console.log('Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create events table
    console.log('Creating events table...');
    await pool.query(`
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
    `);

    // Create guest user
    console.log('Creating guest user...');
    const hashedPassword = await bcrypt.hash('guest123', 10);

    await pool.query(`
      INSERT INTO users (email, password, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET password = $2;
    `, ['guest@test.com', hashedPassword, 'Guest User']);

    console.log('');
    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('🔑 Test account:');
    console.log('   Email: guest@test.com');
    console.log('   Password: guest123');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

seed();
