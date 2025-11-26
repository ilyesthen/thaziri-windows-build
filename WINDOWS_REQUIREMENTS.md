# Windows System Requirements

## Minimum Requirements

### Operating System
- **Windows 8.1** or later (64-bit or 32-bit)
- **Windows 10** (Recommended)
- **Windows 11** (Fully supported)

### Why Windows 8.1+?
Thaziri uses Electron 27, which requires Windows 8.1 or later. This is because:
- Windows 7 and 8.0 are no longer supported by Microsoft (End of Life)
- Modern security features require Windows 8.1+
- The Chromium engine (used by Electron) dropped support for older Windows versions

## Unsupported Windows Versions

❌ **Windows 7** - Not supported (Microsoft ended support in January 2020)  
❌ **Windows 8.0** - Not supported (Upgrade to Windows 8.1 for free)  
❌ **Windows Vista** - Not supported  
❌ **Windows XP** - Not supported  

## Error Messages on Unsupported Windows

If you try to install on Windows 7 or 8.0, you may see:

**French:**
```
Le point d'entrée de procédure DiscardVirtualMemory est introuvable 
dans la bibliothèque de liens dynamiques KERNEL32.dll.
```

**English:**
```
The procedure entry point DiscardVirtualMemory could not be located 
in the dynamic link library KERNEL32.dll.
```

**Arabic:**
```
تعذر تحديد موقع نقطة إدخال الإجراء DiscardVirtualMemory
في مكتبة الارتباط الديناميكي KERNEL32.dll
```

This means your Windows version is too old to run this application.

## Solutions

### Option 1: Upgrade Windows (Recommended)
- **Free upgrade from Windows 7/8 to Windows 10** may still be available
- Purchase Windows 10 or 11 license
- Consider upgrading your computer hardware if needed

### Option 2: Use Legacy Build (Windows 7 Support)
If you must use Windows 7, we can create a special legacy build with Electron 22.

**To request a legacy build:**
1. Confirm you're using Windows 7
2. We'll create a separate installer using older Electron version
3. Note: Legacy builds receive limited support

## How to Check Your Windows Version

### Method 1: Run Command
1. Press `Windows Key + R`
2. Type: `winver`
3. Press Enter
4. A window will show your Windows version

### Method 2: System Properties
1. Right-click "This PC" or "My Computer"
2. Click "Properties"
3. Look for "Windows edition"

### Method 3: Command Prompt
1. Open Command Prompt
2. Type: `systeminfo | findstr /B /C:"OS Name" /C:"OS Version"`
3. Press Enter

## Hardware Requirements

### Minimum
- **Processor:** 1 GHz or faster
- **RAM:** 2 GB (4 GB recommended)
- **Disk Space:** 500 MB for application + database storage
- **Display:** 1024x768 resolution minimum

### Recommended
- **Processor:** Intel Core i3 or equivalent (2 GHz+)
- **RAM:** 4 GB or more
- **Disk Space:** 1 GB for application + expandable database
- **Display:** 1920x1080 resolution for best experience

## Network Requirements (for LAN setup)

- **Network:** Local Area Network (LAN)
- **File Sharing:** Windows File and Printer Sharing enabled
- **Firewall:** Allow Thaziri through Windows Firewall
- **Admin PC:** Must be always on for client PCs to work

## Installation Notes

### Windows 7 Users
If you're on Windows 7:
1. **Security Risk:** Windows 7 is no longer receiving security updates
2. **Upgrade Path:** Consider upgrading to Windows 10/11
3. **Legacy Build:** Contact support for a Windows 7-compatible build

### Windows 8.0 Users
If you're on Windows 8.0:
1. **Free Upgrade:** Update to Windows 8.1 for free from Microsoft
2. **Quick Fix:** Windows 8.1 update takes ~1 hour
3. **Compatible:** Windows 8.1 is fully compatible with Thaziri

## Troubleshooting

### Error: "DiscardVirtualMemory not found"
**Cause:** Windows version is too old (Windows 7 or 8.0)  
**Solution:** Upgrade to Windows 8.1 or later, or request legacy build

### Error: "Application won't start"
**Cause:** Missing Visual C++ Redistributables  
**Solution:** Download and install [Microsoft Visual C++ Redistributables](https://aka.ms/vs/17/release/vc_redist.x64.exe)

### Error: "Database connection failed"
**Cause:** Permissions or network issues  
**Solution:** Check LAN_SETUP.md guide

## Legacy Build Process (Windows 7)

If you need Windows 7 support, here's what we'll do:

1. **Create separate branch** with Electron 22
2. **Build for Windows 7** compatibility
3. **Test on Windows 7** virtual machine
4. **Provide separate installer** labeled "Legacy"

**Note:** Legacy builds will:
- ✅ Run on Windows 7
- ❌ Miss some modern features
- ❌ Have older security model
- ❌ Receive limited updates

## Contact Support

If you have questions about Windows compatibility:
- Check this document first
- Review error messages carefully
- Note your exact Windows version
- Contact support with details

## License Compatibility

Thaziri is compatible with:
- Windows 8.1 Home
- Windows 8.1 Pro
- Windows 10 Home
- Windows 10 Pro
- Windows 10 Enterprise
- Windows 11 Home
- Windows 11 Pro
- Windows 11 Enterprise

All editions (Home, Pro, Enterprise) are supported as long as version is 8.1+.
