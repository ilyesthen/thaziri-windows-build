# Thaziri Clinic Management - LAN Setup Guide

This guide explains how to set up Thaziri with a shared database over LAN, where one PC acts as the server with the main database and other PCs connect to it.

## Architecture

- **Server PC (Admin)**: Hosts the SQLite database
- **Client PCs**: Connect to the shared database via network path

## Setup Instructions

### 1. Server PC Setup (Admin/Main Database Host)

1. Install Thaziri on the server PC
2. The database will be created automatically at:
   - Windows: `C:\Users\[Username]\AppData\Roaming\thaziri\thaziri-database.db`

3. Share the Thaziri data folder:
   - Right-click the folder: `C:\Users\[Username]\AppData\Roaming\thaziri`
   - Select "Properties" → "Sharing" tab → "Advanced Sharing"
   - Check "Share this folder"
   - Set permissions: Allow "Full Control" for users who will access it
   - Note the network path (e.g., `\\SERVER-PC\thaziri`)

### 2. Client PC Setup

1. Install Thaziri on each client PC

2. Map the network drive (recommended):
   - Open File Explorer
   - Click "This PC" → "Map network drive"
   - Choose a drive letter (e.g., Z:)
   - Enter the folder path: `\\SERVER-PC\thaziri`
   - Check "Reconnect at sign-in"
   - Click "Finish"

3. Configure database path:
   - Navigate to: `C:\Users\[Username]\AppData\Roaming\thaziri`
   - Create a file named `database-config.json` with this content:
   ```json
   {
     "databasePath": "Z:\\thaziri-database.db"
   }
   ```
   - Replace `Z:` with your mapped drive letter

4. Start Thaziri - it will now use the shared database!

## Alternative: UNC Path (Without Mapping)

If you prefer not to map a network drive, use a UNC path directly in `database-config.json`:

```json
{
  "databasePath": "\\\\SERVER-PC\\thaziri\\thaziri-database.db"
}
```

**Important**: Use double backslashes (`\\\\`) in JSON files!

## Network Requirements

- All PCs must be on the same local network
- Windows Firewall on the server PC should allow file sharing:
  - Open Windows Firewall
  - Allow "File and Printer Sharing"
- Ensure the server PC is always on when others need to access the app

## Troubleshooting

### Cannot connect to database
1. Check network connectivity: Can you ping the server PC?
2. Verify the shared folder path is correct
3. Ensure you have read/write permissions on the shared folder
4. Check if the database file exists on the server

### Database locked errors
- SQLite allows multiple readers but only one writer at a time
- If you see "database is locked", someone else might be writing to it
- This is normal and the app will retry automatically

### Slow performance
- File-based databases over network can be slower than dedicated database servers
- For better performance, keep the network connection stable and use wired connections
- Consider using a dedicated database server (PostgreSQL/MySQL) for very large clinics

## Migration from Local to Network Database

If you already have data on a local PC and want to move to a network setup:

1. Close Thaziri on the local PC
2. Copy the database file from: `C:\Users\[Username]\AppData\Roaming\thaziri\thaziri-database.db`
3. Paste it to the server PC's shared folder
4. Configure all PCs (including the one you copied from) to use the network path

## Security Notes

- The database contains sensitive patient data
- Ensure proper network security and access controls
- Regularly backup the database file
- Consider encrypting the network share for additional security

## Backup Strategy

Create regular backups of the database:
1. Simply copy `thaziri-database.db` to a secure location
2. Recommended: Daily automated backups using Windows Task Scheduler
3. Keep multiple backup versions (daily, weekly, monthly)

## Support

For issues or questions, please refer to the main README or contact support.
