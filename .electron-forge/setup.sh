
#!/bin/bash

echo "⚡ Installing Electron Forge..."
echo "==============================="

# Install Electron Forge
npm install --save-dev @electron-forge/cli
npm install --save-dev @electron-forge/maker-squirrel
npm install --save-dev @electron-forge/maker-zip
npm install --save-dev @electron-forge/maker-deb
npm install --save-dev @electron-forge/maker-rpm
npm install --save-dev @electron-forge/maker-wix
npm install --save-dev @electron-forge/publisher-github
npm install --save-dev @electron-forge/plugin-webpack
npm install --save-dev @electron-forge/plugin-auto-unpack-natives

echo "✅ Electron Forge installed!"

# Import existing project
npx electron-forge import

echo "✅ Project imported to Electron Forge!"
echo ""
echo "🚀 Available commands:"
echo "  npm run start        - Run in development"
echo "  npm run package      - Package app without making installers"
echo "  npm run make         - Create distributables"
echo "  npm run publish      - Publish to GitHub/S3/etc"
