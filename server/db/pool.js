import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create pool only if DATABASE_URL is set
let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  // Mock pool for when DATABASE is not configured
  pool = {
    connect: async () => {
      throw new Error('Database not configured - set DATABASE_URL environment variable');
    },
    query: async () => {
      throw new Error('Database not configured - set DATABASE_URL environment variable');
    }
  };
}

export default pool;
