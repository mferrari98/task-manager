# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Stop server gracefully (closes connections and saves data)
npm stop

# Install dependencies
npm install
```

**Note**: This project has no build step, linting, or testing configured. It uses vanilla JavaScript with no transpilation.

## Architecture Overview

This is a full-stack JavaScript task management application with real-time collaboration capabilities designed for local network deployment.

### Tech Stack
- **Backend**: Node.js + Express.js + Socket.io
- **Database**: SQLite3 (file-based, no external DB needed)
- **Frontend**: Vanilla JavaScript ES6+ + Bootstrap 5
- **Real-time**: Socket.io for live updates between users

### Key Architecture Patterns

**Single Page Application**: The frontend is a single HTML file (`frontend/index.html`) with all UI handled by a single JavaScript class (`TaskManager` in `frontend/js/app.js`).

**Session-based Authentication**: Simple username-based authentication with role-based access control (Admin/Worker roles). No passwords - uses name-based login.

**Real-time Collaboration**: All task operations broadcast updates to connected clients via Socket.io. Users see live changes, presence indicators, and notifications.

**Database Schema**: Three main tables:
- `users`: User management with roles
- `tasks`: Task data with assignments and status tracking
- `updates`: Progress tracking with comments and timestamps

### File Structure and Key Components

```
backend/
├── server.js          # Main server entry point with Express and Socket.io setup
├── models/
│   ├── database.js    # SQLite connection and table initialization
│   ├── User.js        # User data model operations
│   └── Task.js        # Task data model operations
├── api/
│   ├── auth.js        # Authentication endpoints and session management
│   ├── tasks.js       # Task CRUD operations with real-time events
│   └── users.js       # User management (admin-only)
└── middleware/
    └── auth.js        # Role-based access control middleware

frontend/
├── index.html         # Single-page application structure
├── js/app.js         # Main application logic (TaskManager class, 1300+ lines)
└── css/style.css     # Custom styles and Bootstrap overrides
```

### Development Workflow

1. **Start Development**: `npm run dev` uses nodemon for auto-restart on changes
2. **Database**: SQLite database (`tasks.db`) created automatically on first run
3. **Default Access**: Login as `admin` (no password) for full access
4. **Real-time Testing**: Open multiple browser tabs to see live collaboration
5. **Network Testing**: Access via `http://[IP]:3000` from other devices on same network

### Key Implementation Details

**Socket.io Events**: Real-time features use these main events:
- `taskCreated`, `taskUpdated`, `taskDeleted` - Task changes
- `userConnected`, `userDisconnected` - Presence tracking
- `taskViewing` - Shows who is viewing which tasks

**Frontend State Management**: The `TaskManager` class handles all UI state and rendering. No framework - uses direct DOM manipulation with modern JavaScript.

**Role-based Permissions**:
- Admin: Full access to user management, all tasks, and system configuration
- Worker: Can view tasks, update progress, self-assign tasks, but not manage users

**Data Persistence**: All data persists in SQLite file. No data loss on server restart.

### Configuration

Environment variables (optional):
```bash
PORT=3000              # Server port
SESSION_SECRET=secret  # Session encryption key
CORS_ORIGIN=*          # CORS configuration
```

### Important Notes

- **No Build Process**: Direct file serving - no bundling, transpilation, or compilation needed
- **Local Network Focus**: Designed for trusted local networks, not public internet deployment
- **Session Storage**: In-memory sessions (lost on restart) - suitable for local use
- **Security**: Basic input validation and SQL injection prevention, but not production-hardened
- **Testing**: No test framework configured - add as needed for development

When modifying this codebase:
- Backend changes trigger automatic restart in dev mode
- Frontend changes require browser refresh
- Socket.io event handlers must maintain real-time synchronization
- Database operations use parameterized queries to prevent SQL injection