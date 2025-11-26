const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🚀 Preparing Windows build from macOS...\n');

const prismaDir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client');
const prismaClientDir = path.join(__dirname, '..', 'node_modules', '@prisma', 'client');

console.log('📦 Prisma Cross-Platform Build Preparation');
console.log('==========================================\n');

// Step 1: Clean previous build artifacts
console.log('🧹 Cleaning previous build artifacts...');
const filesToClean = [
  path.join(prismaClientDir, '.prisma'),
  path.join(prismaClientDir, 'default.js'),
  path.join(prismaClientDir, 'default.d.ts'),
];

filesToClean.forEach(file => {
  if (fs.existsSync(file)) {
    fs.rmSync(file, { recursive: true, force: true });
    console.log(`  ✓ Cleaned: ${path.basename(file)}`);
  }
});

// Step 2: Generate Prisma Client with all binary targets
console.log('\n🔧 Generating Prisma Client with Windows binaries...');
try {
  execSync('npx prisma generate --schema=./prisma/schema.prisma', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('  ✓ Prisma Client generated successfully');
} catch (error) {
  console.error('  ✗ Failed to generate Prisma Client:', error.message);
  process.exit(1);
}

// Step 3: Create default.js and default.d.ts
console.log('\n📄 Creating default export files...');

const defaultJs = `module.exports = require('./index.js');`;
const defaultDts = `export * from './index';
export { PrismaClient as default } from './index';`;

fs.writeFileSync(path.join(prismaClientDir, 'default.js'), defaultJs);
console.log('  ✓ Created default.js');

fs.writeFileSync(path.join(prismaClientDir, 'default.d.ts'), defaultDts);
console.log('  ✓ Created default.d.ts');

// Step 4: Verify Windows query engine exists
console.log('\n⬇️  Checking for Windows query engine...');
const windowsEngine = path.join(prismaDir, 'query_engine-windows.dll.node');
if (fs.existsSync(windowsEngine)) {
  console.log('  ✓ Windows query engine already exists');
} else {
  console.error('  ✗ Windows query engine NOT found!');
  console.log('    Expected at:', windowsEngine);
  process.exit(1);
}

// Step 5: Copy .prisma directory to @prisma/client
console.log('\n🏗️  Setting up files for Electron Builder...');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied: ${path.basename(src)}`);
  }
}

// Copy all files from .prisma/client to @prisma/client
const prismaClientFiles = fs.readdirSync(prismaDir);
prismaClientFiles.forEach(file => {
  const srcPath = path.join(prismaDir, file);
  const destPath = path.join(prismaClientDir, file);
  
  const stats = fs.statSync(srcPath);
  if (stats.isDirectory()) {
    console.log(`  ✓ Copied directory: ${file}`);
    copyRecursive(srcPath, destPath);
  } else {
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✓ Copied: ${file}`);
  }
});

// Step 6: Verify everything is in place
console.log('\n✅ Verifying Windows build setup...');
const requiredFiles = [
  path.join(prismaClientDir, 'default.js'),
  path.join(prismaClientDir, 'default.d.ts'),
  path.join(prismaClientDir, 'index.js'),
  path.join(prismaClientDir, 'schema.prisma'),
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${path.basename(file)} exists`);
  } else {
    console.error(`  ✗ ${path.basename(file)} MISSING!`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('\n❌ Build preparation failed - missing required files');
  process.exit(1);
}

console.log('\n========================================');
console.log('✅ Windows build preparation completed!');
console.log('========================================\n');
console.log('You can now run:');
console.log('  npm run build:win      - Build for Windows 64-bit');
console.log('  npm run build:win32    - Build for Windows 32-bit');
console.log('  npm run build:win:all  - Build for all Windows architectures\n');
