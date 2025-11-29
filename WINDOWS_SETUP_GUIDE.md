# 🏥 THAZIRI - Windows Network Setup Guide

## 📋 System Requirements

### Minimum Requirements:
- **Windows**: 7, 8, 8.1, 10, or 11 (32-bit or 64-bit)
- **RAM**: 4 GB minimum (8 GB recommended)
- **Storage**: 2 GB free space
- **Network**: Local Area Network (LAN) connection
- **Processor**: Dual-core 2.0 GHz or highe

### Network Requirements:
- All computers must be on the same local network
- Windows Firewall may need configuration (instructions included)
- Port 5432 must be available on the server PC

---

## 🖥️ PART 1: MAIN SERVER PC SETUP

### Step 1: Transfer Database from Mac
1. **On your Mac**, export the database:
   ```bash
   npm run db:export-for-windows
   ```
2. Find the export file in `/Applications/allah/export/` folder
3. Copy this file to a USB drive or network share
4. Transfer to the Windows server PC

### Step 2: Install Thaziri Server
1. Copy the installer file: `Thaziri-Setup-1.0.0-x64.exe` (or -ia32 for 32-bit)
2. **Right-click** the installer and select **"Run as Administrator"**
3. Follow the installation wizard:
   - Accept the license agreement
   - Choose installation directory (default: `C:\Program Files\Thaziri`)
   - Select "Create desktop shortcut" ✓
   - Click Install

### Step 3: Configure as Server
1. Launch Thaziri from desktop shortcut
2. **First Launch Setup**:
   - A dialog will appear: "Configure Database Mode"
   - Click **"Server (Main PC)"**
3. The system will show:
   - Your server IP address (e.g., 192.168.1.100)
   - Port: 5432
   - Database location: `C:\ProgramData\Thaziri\database\thaziri.db`
4. **Write down this IP address** - you'll need it for client PCs!

### Step 4: Import Mac Database
1. Place the export file in `C:\Thaziri\import\`
2. Open Command Prompt as Administrator:
   - Press `Windows + X`, select "Windows Terminal (Admin)" or "Command Prompt (Admin)"
3. Navigate to Thaziri directory:
   ```cmd
   cd "C:\Program Files\Thaziri"
   ```
4. Import the database:
   ```cmd
   thaziri.exe --import "C:\Thaziri\import\thaziri-export-2024-XX-XX.json"
   ```
5. Wait for "Import successful" message

### Step 5: Configure Windows Firewall
1. Open Windows Defender Firewall:
   - Press `Windows + S`, type "Windows Defender Firewall"
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change settings" (requires admin)
4. Click "Allow another app..."
5. Browse to `C:\Program Files\Thaziri\Thaziri.exe`
6. Click Add
7. Check both "Private" and "Public" boxes
8. Click OK

### Step 6: Verify Server Status
1. Open Thaziri
2. Login with your credentials
3. Check the bottom status bar - should show "Server Mode Active"
4. Test database access by viewing patient records

---

## 💻 PART 2: CLIENT PC SETUP

### Step 1: Install Thaziri Client
1. Copy the appropriate installer:
   - 64-bit Windows: `Thaziri-Setup-1.0.0-x64.exe`
   - 32-bit Windows: `Thaziri-Setup-1.0.0-ia32.exe`
2. **Right-click** installer and select **"Run as Administrator"**
3. Follow installation wizard (same as server)

### Step 2: Configure as Client
1. Launch Thaziri from desktop shortcut
2. **First Launch Setup**:
   - Dialog appears: "Configure Database Mode"
   - Click **"Client (Connected PC)"**
3. **Connection Setup**:
   - Choose "Manual Entry" or "Auto-Detect"
   
   **Manual Entry**:
   - Enter Server IP: (the IP you wrote down, e.g., 192.168.1.100)
   - Port: 5432
   - Click "Connect"
   
   **Auto-Detect**:
   - System will scan your network
   - Select the found server
   - Click "Connect"

### Step 3: Verify Connection
1. Login with your credentials
2. Check status bar - should show "Connected to Server: [IP]"
3. Verify you can see the same patient records as the server

### Step 4: Windows Firewall (if needed)
If connection fails, configure firewall same as server setup (Step 5 above)

---

## 🔧 TROUBLESHOOTING

### Cannot Connect to Server
1. **Check network connection**:
   - Open Command Prompt
   - Type: `ping [server-ip]` (e.g., `ping 192.168.1.100`)
   - Should see replies, not timeouts
   
2. **Check server is running**:
   - On server PC, ensure Thaziri is running
   - Check status shows "Server Mode Active"
   
3. **Firewall issues**:
   - Temporarily disable Windows Firewall to test
   - If it works, re-enable and configure properly
   
4. **Port conflict**:
   - Open Command Prompt as Admin
   - Type: `netstat -an | find "5432"`
   - If occupied, contact IT support

### Database Not Syncing
1. Restart both server and client applications
2. Check network connectivity
3. Verify all PCs are on same subnet

### Performance Issues
1. Ensure server PC meets recommended specs
2. Check network speed (minimum 100 Mbps recommended)
3. Limit concurrent connections to 10 clients

---

## 🔄 SWITCHING MODES

### Change Server to Client
1. Close Thaziri
2. Navigate to: `C:\ProgramData\Thaziri\`
3. Delete `db-config.json`
4. Restart Thaziri and reconfigure

### Change Client to Server
1. Follow same steps as above
2. Choose "Server" when prompted
3. Import database if needed

---

## 📱 DAILY OPERATIONS

### Server PC (Main)
1. **Start of Day**:
   - Turn on server PC first
   - Launch Thaziri
   - Verify "Server Mode Active"
   
2. **During Operations**:
   - Keep server PC running
   - Don't put to sleep/hibernate
   - Monitor for any connection issues
   
3. **End of Day**:
   - Ensure all clients disconnected
   - Backup database (automatic)
   - Can safely shut down

### Client PCs
1. **Start of Day**:
   - Ensure server is running first
   - Launch Thaziri
   - Verify connection to server
   
2. **During Operations**:
   - Work normally
   - Changes sync automatically
   - Can disconnect/reconnect anytime
   
3. **End of Day**:
   - Save any pending work
   - Close application normally

---

## 💾 BACKUP & RESTORE

### Automatic Backup (Server)
- Daily backups at 11:00 PM
- Stored in: `C:\ProgramData\Thaziri\backups\`
- Keeps last 30 days

### Manual Backup
1. On server PC, open Thaziri
2. Go to Settings → Database
3. Click "Backup Now"
4. Choose location to save

### Restore from Backup
1. Stop all client connections
2. On server PC, go to Settings → Database
3. Click "Restore"
4. Select backup file
5. Confirm restoration
6. Restart all clients

---

## 🔐 SECURITY NOTES

1. **User Accounts**:
   - Each user has unique login
   - Passwords are encrypted
   - Admin can reset passwords

2. **Network Security**:
   - Use private network only
   - Don't expose to internet
   - Consider VPN for remote access

3. **Data Protection**:
   - Regular backups essential
   - Keep server PC secure
   - Use UPS for power protection

---

## 📞 SUPPORT CONTACTS

For technical assistance:
- Check logs at: `C:\ProgramData\Thaziri\logs\`
- Error codes reference in application Help menu
- Network diagnostics: Settings → Network Test

---

## ✅ SETUP CHECKLIST

### Server PC:
- [ ] Installer copied
- [ ] Run as Administrator
- [ ] Selected "Server Mode"
- [ ] IP address noted
- [ ] Database imported
- [ ] Firewall configured
- [ ] Test login successful

### Each Client PC:
- [ ] Installer copied
- [ ] Run as Administrator  
- [ ] Selected "Client Mode"
- [ ] Server IP entered
- [ ] Connection verified
- [ ] Test login successful
- [ ] Can view patient records

### Network:
- [ ] All PCs on same network
- [ ] Can ping server from clients
- [ ] Port 5432 available
- [ ] No IP conflicts

---

## 🎉 CONGRATULATIONS!

Your Thaziri network is now configured. The system will:
- Share one central database across all PCs
- Sync changes in real-time
- Maintain data integrity
- Support multiple concurrent users

Remember to perform regular backups and keep the server PC running during business hours!
