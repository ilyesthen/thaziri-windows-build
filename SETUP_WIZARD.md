# Setup Wizard - Professional LAN Configuration

## Overview

The Setup Wizard provides a professional, user-friendly way to configure Thaziri for network use. It runs automatically on first launch and guides users through either Admin (server) or Client setup.

## Features

✅ **Automatic First-Run Detection** - Shows wizard only when needed  
✅ **Two Setup Modes** - Admin PC (server) or Client PC  
✅ **Database Import** - Import existing database during admin setup  
✅ **Connection Testing** - Verifies network database access before saving  
✅ **Copy-Paste Network Path** - Easy sharing of connection details  
✅ **Visual Feedback** - Clear status indicators and error messages  
✅ **Professional UI** - Modern, intuitive interface  

## How It Works

### Admin PC Setup (Database Server)

1. **Launch Thaziri** for the first time
2. **Select "Admin PC (Server)"** in the wizard
3. **Optional:** Import existing database file
4. **Configure share name** (default: "ThaziriDB")
5. **Complete setup** - Database created automatically
6. **Share network path** with client PCs

**What Happens:**
- Database created at: `C:\Users\[User]\AppData\Roaming\Thaziri\thaziri-database.db`
- Setup completion marker saved
- No `database-config.json` file (uses local database)
- Network path displayed for sharing

### Client PC Setup

1. **Launch Thaziri** for the first time
2. **Select "Client PC"** in the wizard
3. **Enter network path** provided by admin PC
4. **Test connection** - Wizard verifies database access
5. **Save configuration** - Stored in `database-config.json`

**What Happens:**
- Connection tested before saving
- `database-config.json` created with network path
- Setup completion marker saved
- All data operations use admin PC's database

## Network Path Formats

### Option 1: UNC Path (Direct)
```
\\ADMIN-PC\ThaziriDB\thaziri-database.db
```

### Option 2: Mapped Drive (Recommended)
1. Map network drive to `\\ADMIN-PC\ThaziriDB` as Z:
2. Use path: `Z:\thaziri-database.db`

## File Structure

### Admin PC
```
C:\Users\[User]\AppData\Roaming\Thaziri\
├── thaziri-database.db        # Master database
└── setup-complete             # Setup marker
```

### Client PC
```
C:\Users\[User]\AppData\Roaming\Thaziri\
├── database-config.json       # Network path configuration
└── setup-complete             # Setup marker
```

### database-config.json Example
```json
{
  "databasePath": "\\\\ADMIN-PC\\ThaziriDB\\thaziri-database.db"
}
```

### setup-complete Example (Admin)
```json
{
  "mode": "admin",
  "completedAt": "2025-11-26T10:30:00.000Z",
  "shareName": "ThaziriDB"
}
```

### setup-complete Example (Client)
```json
{
  "mode": "client",
  "completedAt": "2025-11-26T10:35:00.000Z",
  "databasePath": "\\\\ADMIN-PC\\ThaziriDB\\thaziri-database.db"
}
```

## Technical Implementation

### IPC Handlers (Main Process)

```typescript
// Get computer name
ipcMain.handle('setup:getComputerName', async () => {
  return require('os').hostname()
})

// Save setup configuration
ipcMain.handle('setup:database', async (_, config) => {
  // Admin mode: No config file, use local database
  // Client mode: Save database-config.json with network path
})

// Test network database connection
ipcMain.handle('setup:testConnection', async (_, databasePath) => {
  // Verify file exists and is accessible
})

// Import existing database
ipcMain.handle('setup:importDatabase', async (_, sourcePath) => {
  // Copy database file to local database location
})

// Check if setup is complete
ipcMain.handle('setup:isComplete', async () => {
  // Returns setup status and configuration
})
```

### Preload API

```typescript
window.electronAPI.getComputerName()
window.electronAPI.setupDatabase({ mode, databasePath?, shareName? })
window.electronAPI.testDatabaseConnection(databasePath)
window.electronAPI.importDatabase(sourcePath)
window.electronAPI.isSetupComplete()
window.electronAPI.selectFile({ filters })
```

### Database Path Resolution (database.ts)

```typescript
function getDatabasePath(): string {
  if (isProduction()) {
    const configPath = path.join(userDataPath, 'database-config.json')
    
    // Check for client configuration
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (config.databasePath) {
        console.log('📡 Using network database:', config.databasePath)
        return path.normalize(config.databasePath)
      }
    }
    
    // Default: Use local database (admin mode)
    console.log('💾 Using local database')
    return path.join(userDataPath, 'thaziri-database.db')
  }
}
```

## User Flow

### First Launch (No Setup)
```
App Launch → Check setup-complete → Not found → Show Setup Wizard
```

### Admin PC Flow
```
Welcome Screen
    ↓
Mode Selection → Select "Admin PC"
    ↓
Admin Setup
  - Optional: Import Database
  - Configure Share Name
    ↓
Complete
  - Database created
  - Network path displayed
  - Ready to use
```

### Client PC Flow
```
Welcome Screen
    ↓
Mode Selection → Select "Client PC"
    ↓
Client Setup
  - Enter Network Path
  - Test Connection
    ↓
Connection Test
  - Success: Save config
  - Failure: Show error, retry
    ↓
Complete
  - Connected to admin database
  - Ready to use
```

## Error Handling

### Connection Test Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| `Path not found` | Network path doesn't exist | Verify admin PC is running and path is correct |
| `Permission denied` | No access to network share | Check Windows share permissions |
| `Database file not found` | File missing at path | Ensure admin setup is complete |

### Common Issues

**"Cannot connect to database"**
- ✅ Verify admin PC is powered on
- ✅ Check network connectivity (ping admin PC)
- ✅ Ensure Windows file sharing is enabled
- ✅ Verify share permissions (Full Control)

**"Setup wizard appears again"**
- ✅ Check if `setup-complete` file exists
- ✅ Verify file permissions in AppData folder

## Resetting Setup

To run the setup wizard again:

1. Close Thaziri
2. Navigate to: `C:\Users\[User]\AppData\Roaming\Thaziri`
3. Delete `setup-complete` file
4. Optional: Delete `database-config.json` for client PCs
5. Relaunch Thaziri

## Network Requirements

- **Same Local Network** - All PCs must be on the same LAN
- **File Sharing Enabled** - Windows File and Printer Sharing
- **Firewall Rules** - Allow file sharing through firewall
- **Admin PC Always Running** - Server PC must be on for clients to work
- **Share Permissions** - Full Control for all users

## Security Considerations

- Use Windows user authentication for network shares
- Configure share permissions appropriately
- Consider VPN for remote access
- Regular database backups recommended
- Monitor network access logs

## Benefits Over Manual Configuration

1. ✅ **No Manual File Editing** - GUI-based configuration
2. ✅ **Connection Validation** - Tests before saving
3. ✅ **Error Prevention** - Validates paths and permissions
4. ✅ **User-Friendly** - Clear instructions and feedback
5. ✅ **Professional** - Modern, polished interface
6. ✅ **Time-Saving** - Quick setup in minutes
7. ✅ **Less Error-Prone** - Automated configuration

## Future Enhancements

Potential improvements:
- Auto-discovery of admin PCs on network
- QR code for easy client configuration
- Network diagnostics tool
- Automatic folder sharing setup
- Multiple admin PC support (read replicas)
- Real-time connection monitoring
- Setup wizard from settings (reconfiguration)

## Integration

The Setup Wizard integrates with:
- `database.ts` - Dynamic database path resolution
- Main process - IPC handlers for configuration
- Preload - Bridge between renderer and main
- First-run detection - Automatic display logic

This professional setup wizard eliminates manual configuration, reduces errors, and provides a seamless onboarding experience for network database setups.
