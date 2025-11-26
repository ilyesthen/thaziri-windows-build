# Thaziri - Professional Clinic Management System

A modern, professional desktop application for clinic management built with Electron, React, TypeScript, and Prisma.

## 🚀 Tech Stack

- **[Electron](https://electronjs.org/)** - Cross-platform desktop app framework
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server with HMR
- **[React](https://reactjs.org/)** - Modern UI library with hooks
- **[TypeScript](https://typescriptlang.org/)** - Type-safe JavaScript
- **[Prisma](https://prisma.io/)** - Type-safe ORM for database access
- **[SQLite](https://www.sqlite.org/)** - Embedded relational database

## 📁 Project Structure

```
allah/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Main window management & OS integration
│   │   └── database.ts # Type-safe database service layer
│   ├── preload/        # Preload scripts for secure IPC
│   │   └── index.ts    # Context bridge for renderer communication
│   └── renderer/       # React renderer process
│       ├── index.html  # HTML entry point
│       ├── main.tsx    # React app entry point
│       └── src/
│           ├── App.tsx          # Main React component
│           ├── App.css          # Component styles
│           ├── TaskManager.tsx  # Task management component
│           ├── TaskManager.css  # Task manager styles
│           └── index.css        # Global styles
├── prisma/            # Database schema and migrations
│   ├── schema.prisma  # Prisma schema definition
│   └── migrations/    # Database migrations
├── resources/         # Static assets and icons
├── build/            # Build output directory
└── .github/          # GitHub configuration
    └── copilot-instructions.md
```

## 🛠️ Development

### Prerequisites

- Node.js 18+ or 20+
- npm or yarn

### Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   This starts the Vite dev server with hot module replacement.

3. **Run Electron App**
   ```bash
   npm run electron:dev
   ```
   This runs both the Vite dev server and Electron concurrently.

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run electron:dev` - Start both Vite and Electron in development mode
- `npm run build` - Build the app for production
- `npm run preview` - Preview the production build
- `npm run dist` - Create distributable packages
- `npm run pack` - Package the app (without creating installers)

## 🏗️ Build & Distribution

### Development Build
```bash
npm run build
```

### Production Distribution
```bash
npm run dist
```

This creates distributables for your current platform in the `release/` directory:
- **macOS**: `.dmg` installer
- **Windows**: `.exe` installer (both x64 and ia32)
- **Linux**: `.AppImage` package

### GitHub Actions Automated Builds

This project includes GitHub Actions workflows for automated Windows builds:

- **Windows x64**: 64-bit installer for Windows 7, 8, 10, and 11
- **Windows ia32**: 32-bit installer for Windows 7, 8, 10, and 11 (32-bit systems)

Builds are automatically triggered on push to main/master branch. Download the installers from the "Actions" tab or Releases page.

## 🌐 LAN Setup for Multi-User Environment

Thaziri supports a LAN-based setup where one PC hosts the database and other PCs connect to it.

**See [LAN_SETUP.md](./LAN_SETUP.md) for detailed instructions.**

### Quick Overview:

1. **Server PC**: Install Thaziri and share the data folder
2. **Client PCs**: Install Thaziri and configure database path to point to server

This allows multiple users to work with the same patient database simultaneously.

## 🔧 Configuration

### Electron Builder

The app uses electron-builder for packaging. Configuration is in `package.json` under the `build` field.

### Vite Configuration

Vite configuration is in `vite.config.ts` with:
- React plugin for JSX support
- Electron plugin for main/preload processes
- TypeScript path aliases
- Development server settings

### TypeScript

- `tsconfig.json` - Main TypeScript configuration
- `tsconfig.node.json` - Node.js specific settings

## 🔐 Security Features

- **Context Isolation**: Enabled for secure renderer process
- **Node Integration**: Disabled in renderer for security
- **Preload Script**: Secure IPC communication bridge
- **CSP Headers**: Content Security Policy in HTML
- **External Link Handling**: Opens external links in default browser

## 🎨 Features

- ✅ Hot Module Replacement (HMR) for fast development
- ✅ TypeScript support with strict type checking
- ✅ Modern React with hooks and functional components
- ✅ Secure IPC communication between processes
- ✅ **SQLite Database with Prisma ORM**
- ✅ **Type-safe Database API**
- ✅ **Strongly-typed IPC handlers**
- ✅ **Task Management System with CRUD operations**
- ✅ Cross-platform desktop application
- ✅ Professional project structure and configuration
- ✅ Built-in file dialog integration
- ✅ App information API (version, platform, etc.)
- ✅ Beautiful gradient UI with modern design

## 🗄️ Database Architecture

### Schema Models

The application includes four main database models:

1. **User** - Application users with email and name
2. **Note** - Notes with tags and user association
3. **Task** - Tasks with priority, completion status, and due dates
4. **Tag** - Tags for organizing notes with custom colors

### Type-Safe API Layer

All database operations are:
- **Type-safe** - Full TypeScript support from database to UI
- **Secure** - IPC handlers validate and sanitize inputs
- **Async** - Non-blocking operations with proper error handling
- **Structured** - Organized by entity (users, notes, tasks, tags)

## 🤝 Development Guidelines

1. **Main Process** (`src/main/`) - Handles window management, OS integration, and system APIs
2. **Renderer Process** (`src/renderer/`) - Contains the React UI components
3. **Preload Scripts** (`src/preload/`) - Secure bridge between main and renderer processes

### Adding New IPC Handlers

1. Add handler in `src/main/index.ts`:
   ```typescript
   ipcMain.handle('my-api', async () => {
     // Your logic here
   })
   ```

2. Expose in `src/preload/index.ts`:
   ```typescript
   const electronAPI = {
     myApi: () => ipcRenderer.invoke('my-api')
   }
   ```

3. Use in React components:
   ```typescript
   const result = await window.electronAPI.myApi()
   ```

## 🗃️ Database Usage

### Using the Database API in React

The database API is available through `window.electronAPI.db`:

```typescript
// Create a new task
const task = await window.electronAPI.db.tasks.create({
  title: 'My Task',
  description: 'Task description',
  priority: 'high',
  userId: 1
})

// Get all tasks
const tasks = await window.electronAPI.db.tasks.getAll()

// Update a task
await window.electronAPI.db.tasks.update(taskId, {
  completed: true
})

// Delete a task
await window.electronAPI.db.tasks.delete(taskId)
```

### Managing Database Migrations

```bash
# Create a new migration after schema changes
npx prisma migrate dev --name description_of_changes

# Generate Prisma Client after schema changes
npx prisma generate

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Open Prisma Studio to view/edit data
npx prisma studio
```

### Database Service Layer

All database operations are defined in `src/main/database.ts`:

- **Singleton Pattern** - Single Prisma Client instance
- **Connection Pool** - Initialized in `app.whenReady()`
- **Error Handling** - Try-catch blocks in all IPC handlers
- **Type Safety** - TypeScript interfaces for all inputs/outputs

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

Built with modern web technologies and best practices for desktop application development.