
#!/usr/bin/env node

/**
 * ELECTRON PACKAGER - SIMPLER ALTERNATIVE
 * Quick and simple, used by many open source projects
 */

const packager = require('electron-packager');
const path = require('path');

async function buildApp() {
  try {
    const appPaths = await packager({
      dir: '.',
      out: 'release',
      name: 'Thaziri',
      platform: 'win32',
      arch: ['x64', 'ia32'],
      electronVersion: '22.3.27',
      overwrite: true,
      asar: {
        unpack: '{**/.prisma/**/*,**/node_modules/.prisma/**/*}'
      },
      prune: false,
      icon: './resources/icon',
      win32metadata: {
        CompanyName: 'Thaziri Medical',
        FileDescription: 'Clinic Management System',
        OriginalFilename: 'Thaziri.exe',
        ProductName: 'Thaziri'
      },
      afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
        // Copy Prisma files
        const fs = require('fs-extra');
        const prismaSource = path.join(__dirname, 'node_modules', '.prisma');
        const prismaDest = path.join(buildPath, 'node_modules', '.prisma');
        
        fs.copy(prismaSource, prismaDest, (err) => {
          if (err) {
            console.error('Error copying Prisma:', err);
          } else {
            console.log('✅ Prisma files copied');
          }
          callback();
        });
      }]
    });
    
    console.log('✅ Build complete! Apps created at:', appPaths);
  } catch (err) {
    console.error('Build failed:', err);
  }
}

buildApp();
