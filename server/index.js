import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './routes/auth.js';
import plannerRoutes from './routes/planner.js';
import foremanRoutes from './routes/foreman.js';
import subcontractorRoutes from './routes/subcontractor.js';

// DB
import createTables from './db/migrate.js';
import pool from './db/pool.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (для production)
app.use(express.static(path.join(__dirname, '../client/dist')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/foreman', foremanRoutes);
app.use('/api/subcontractor', subcontractorRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: 'not checked'
  };

  // Check database connection
  if (process.env.DATABASE_URL) {
    try {
      const result = await pool.query('SELECT NOW()');
      health.database = 'connected';
      health.dbTime = result.rows[0].now;
    } catch (error) {
      health.database = 'error';
      health.dbError = error.message;
    }
  } else {
    health.database = 'not configured';
    health.warning = 'Add PostgreSQL database in Railway';
  }

  res.json(health);
});

// Serve React app for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  WARNING: DATABASE_URL not set!');
      console.warn('⚠️  Add PostgreSQL database in Railway:');
      console.warn('⚠️  1. Click "New" → "Database" → "Add PostgreSQL"');
      console.warn('⚠️  2. Redeploy the application');
      console.log('');
      console.log('🚀 Server starting WITHOUT database (limited functionality)...');
      
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`⚠️  Database NOT connected - please add PostgreSQL`);
        console.log(`📍 Health: http://localhost:${PORT}/api/health`);
      });
      return;
    }

    // Create tables if they don't exist
    await createTables();
    console.log('✅ Database initialized');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`📍 Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('');
    console.error('📋 Troubleshooting steps:');
    console.error('1. Ensure PostgreSQL is added to Railway project');
    console.error('2. Check DATABASE_URL is set in environment variables');
    console.error('3. Wait for Railway to provision the database');
    process.exit(1);
  }
};

startServer();
