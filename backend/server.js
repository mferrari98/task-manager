const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const db = require('./models/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'task-manager-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Make io accessible to routes
app.set('io', io);

// Store connected users
const connectedUsers = new Map();

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Basic routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/tasks', require('./api/tasks'));
app.use('/api/users', require('./api/users'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their session room
  socket.on('user:join', (userData) => {
    socket.userId = userData.id;
    socket.userName = userData.name;
    socket.userRole = userData.role;

    connectedUsers.set(socket.id, {
      id: userData.id,
      name: userData.name,
      role: userData.role,
      socketId: socket.id,
      joinedAt: new Date()
    });

    // Join user to role-specific room
    socket.join(userData.role);

    // Broadcast updated user list
    io.emit('users:updated', Array.from(connectedUsers.values()));

    console.log(`User ${userData.name} (${userData.role}) joined session`);
  });

  // Handle task viewing for collaborative editing indication
  socket.on('task:viewing', (taskId) => {
    socket.join(`task:${taskId}`);
    socket.currentTask = taskId;

    // Notify others that this user is viewing the task
    socket.to(`task:${taskId}`).emit('task:viewer_joined', {
      taskId,
      user: {
        id: socket.userId,
        name: socket.userName,
        role: socket.userRole
      }
    });
  });

  // Handle task viewing stop
  socket.on('task:stop_viewing', (taskId) => {
    socket.leave(`task:${taskId}`);
    socket.currentTask = null;

    // Notify others that this user stopped viewing
    socket.to(`task:${taskId}`).emit('task:viewer_left', {
      taskId,
      user: {
        id: socket.userId,
        name: socket.userName,
        role: socket.userRole
      }
    });
  });

  // Handle real-time notifications
  socket.on('notification:read', (notificationId) => {
    socket.emit('notification:read_confirm', notificationId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove from connected users
    if (socket.userId) {
      connectedUsers.delete(socket.id);

      // If user was viewing a task, notify others
      if (socket.currentTask) {
        socket.to(`task:${socket.currentTask}`).emit('task:viewer_left', {
          taskId: socket.currentTask,
          user: {
            id: socket.userId,
            name: socket.userName,
            role: socket.userRole
          }
        });
      }
    }

    // Broadcast updated user list
    io.emit('users:updated', Array.from(connectedUsers.values()));
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.init();

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Task Manager server running on http://0.0.0.0:${PORT}`);
      console.log('Access from other devices on your network using your IP address');
      console.log('Default admin user: "admin"');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');

  // Close server first to stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }

    console.log('HTTP server closed');

    // Close database connections
    if (db.close) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          process.exit(1);
        }
        console.log('Database connections closed');
        console.log('Graceful shutdown completed');
        process.exit(0);
      });
    } else {
      console.log('Graceful shutdown completed');
      process.exit(0);
    }
  });

  // Force close if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
});

// Handle SIGTERM (for production environments)
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => {
    process.exit(1);
  });
});

startServer();