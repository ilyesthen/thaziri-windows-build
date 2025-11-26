const fs = require('fs');
const path = require('path');

/**
 * Electron Builder afterPack hook
 * Ensures Prisma binaries are correctly placed in the packaged app
 */
exports.default = async function(context) {
  console.log('\n🔧 Running Professional Electron Builder Hook...');
  
  const appOutDir = context.appOutDir;
  const platform = context.electronPlatformName;
  
  // Only run for Windows builds
  if (platform !== 'win32') {
    console.log(`ℹ️  Skipping hook for ${platform}`);
    return;
  }
  
  console.log('🪟 Fixing Windows Prisma binaries...');
  
  // Source: node_modules/@prisma/client
  const sourceDir = path.join(context.packager.projectDir, 'node_modules', '@prisma', 'client');
  
  // Destination: packaged app resources
  const resourcesDir = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', '@prisma', 'client');
  
  // Files to copy
  const filesToCopy = [
    'query_engine-windows.dll.node',
    'schema.prisma',
    'index.js',
    'index.d.ts',
    'package.json'
  ];
  
  // Ensure destination directory exists
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }
  
  // Copy each file
  for (const file of filesToCopy) {
    const src = path.join(sourceDir, file);
    const dest = path.join(resourcesDir, file);
    
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✅ Copied ${file}`);
    } else {
      console.warn(`⚠️  ${file} not found at ${src}`);
    }
  }
  
  console.log('✅ Windows Prisma binaries fixed!');
};
