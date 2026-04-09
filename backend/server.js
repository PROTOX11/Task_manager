import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './app/routes/auth.routes.js';
import projectRoutes from './app/routes/project.routes.js';
import projectCollaborationRoutes from './app/routes/project.collaboration.routes.js';
import taskRoutes from './app/routes/task.routes.js';
import panelRoutes from './app/routes/panel.routes.js';
import requestRoutes from './app/routes/request.routes.js';
import notificationRoutes from './app/routes/notification.routes.js';
import zentrixaRoutes from './app/routes/zentrixa.routes.js';
import Project from './app/models/Project.js';
import {
  createAndBroadcastProjectChatMessage,
  getChatRoomKey,
  hasProjectAccess,
  parseChatToken,
  populateProjectMembers,
  setTypingState,
  subscribeSocketRoom,
  unsubscribeSocketRoom
} from './app/services/project-chat.service.js';
import { setRealtimeServer } from './app/services/realtime.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

dotenv.config();

mongoose.set('bufferCommands', false);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:4500'],
    credentials: true
  }
});

setRealtimeServer(io);

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
app.use('/api/projects', projectCollaborationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/panels', panelRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/zentrixa', zentrixaRoutes);

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

const sendSocketError = (socket, message) => {
  try {
    socket.emit('chat:error', { message });
  } catch {
    // ignore socket failures
  }
};

io.on('connection', async (socket) => {
  try {
    const projectId = socket.handshake.query.projectId?.toString() || '';
    const conversationWith = socket.handshake.query.conversationWith?.toString() || 'public';
    const token = socket.handshake.auth?.token?.toString() || socket.handshake.query.token?.toString() || '';

    const user = await parseChatToken(token);
    if (!user) {
      sendSocketError(socket, 'Invalid or missing token');
      socket.disconnect(true);
      return;
    }

    const project = await populateProjectMembers(Project.findById(projectId));
    if (!project) {
      sendSocketError(socket, 'Project not found');
      socket.disconnect(true);
      return;
    }

    if (!hasProjectAccess(project, user)) {
      sendSocketError(socket, 'Not authorized to view this project');
      socket.disconnect(true);
      return;
    }

    const roomKey = getChatRoomKey({
      projectId,
      conversationWith,
      userId: user._id.toString()
    });

    subscribeSocketRoom(roomKey, socket);
    socket.join(roomKey);
    socket.join(`user:${user._id.toString()}`);
    socket.emit('chat:ready', { roomKey });

    socket.on('chat:typing', async () => {
      try {
        setTypingState({
          projectId,
          senderId: user._id,
          senderName: user.name,
          recipientId: conversationWith === 'public' ? null : conversationWith
        });
        socket.to(roomKey).emit('chat:typing', {
          senderId: user._id.toString(),
          senderName: user.name
        });
      } catch (error) {
        sendSocketError(socket, error.message || 'Typing update failed');
      }
    });

    socket.on('chat:message', async (payload) => {
      try {
        const result = await createAndBroadcastProjectChatMessage({
          projectId,
          content: payload?.content,
          recipientId: conversationWith === 'public' ? null : conversationWith,
          user,
          mentionedUserIds: Array.isArray(payload?.mentionedUserIds) ? payload.mentionedUserIds : []
        });
        socket.emit('chat:message:ack', {
          messageId: result.message._id.toString()
        });
      } catch (error) {
        sendSocketError(socket, error.message || 'Invalid chat payload');
      }
    });

    socket.on('disconnect', () => {
      unsubscribeSocketRoom(roomKey, socket);
    });
  } catch (error) {
    sendSocketError(socket, error.message || 'WebSocket error');
    socket.disconnect(true);
  }
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

    server.listen(PORT, () => {
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
