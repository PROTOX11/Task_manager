import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './app/routes/auth.routes.js';
import projectRoutes from './app/routes/project.routes.js';
import taskRoutes from './app/routes/task.routes.js';
import panelRoutes from './app/routes/panel.routes.js';
import requestRoutes from './app/routes/request.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

mongoose.set('bufferCommands', false);

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4500'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing");
  process.exit(1);
}

console.log("ENV CHECK:", {
  MONGODB_URI: process.env.MONGODB_URI ? "FOUND ✅" : "MISSING ❌",
  PORT: process.env.PORT
});

// API routes (must match frontend: NEXT_PUBLIC_API_BASE_URL + /auth, /projects, …)
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/panels', panelRoutes);
app.use('/api/requests', requestRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  res.status(isMongoReady ? 200 : 503).json({
    status: isMongoReady ? 'OK' : 'DEGRADED',
    message: isMongoReady
      ? 'Server is running'
      : 'Server is running but MongoDB is not connected',
    database: isMongoReady ? 'connected' : 'disconnected',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Default 5000 — match frontend/next.config.mjs BACKEND_URL; override with PORT in .env
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

startServer();

console.log("MONGO URI:", process.env.MONGODB_URI);

export default app;
