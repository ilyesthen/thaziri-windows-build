module.exports = {
  "packagerConfig": {
    "asar": {
      "unpack": "**/.prisma/**/*"
    },
    "icon": "./resources/icon",
    "name": "Thaziri",
    "appBundleId": "com.thaziri.clinic",
    "win32metadata": {
      "CompanyName": "Thaziri Medical Systems",
      "FileDescription": "Thaziri Clinic Management System",
      "OriginalFilename": "Thaziri.exe",
      "ProductName": "Thaziri",
      "InternalName": "Thaziri"
    },
    "osxSign": {},
    "osxNotarize": {}
  },
  "rebuildConfig": {},
  "makers": [
    {
      "name": "@electron-forge/maker-squirrel",
      "config": {
        "name": "Thaziri",
        "authors": "Thaziri Medical",
        "exe": "Thaziri.exe",
        "setupIcon": "./resources/icon.ico",
        "loadingGif": "./resources/install.gif"
      }
    },
    {
      "name": "@electron-forge/maker-zip",
      "platforms": [
        "darwin",
        "win32"
      ]
    },
    {
      "name": "@electron-forge/maker-deb",
      "config": {
        "options": {
          "maintainer": "Thaziri Medical",
          "homepage": "https://thaziri.com"
        }
      }
    },
    {
      "name": "@electron-forge/maker-rpm",
      "config": {}
    },
    {
      "name": "@electron-forge/maker-wix",
      "config": {
        "ui": {
          "chooseDirectory": true
        },
        "manufacturer": "Thaziri Medical Systems"
      }
    }
  ],
  "publishers": [
    {
      "name": "@electron-forge/publisher-github",
      "config": {
        "repository": {
          "owner": "thaziri",
          "name": "clinic-app"
        },
        "prerelease": false,
        "draft": true
      }
    }
  ],
  "plugins": [
    {
      "name": "@electron-forge/plugin-webpack",
      "config": {
        "mainConfig": "./webpack.main.config.js",
        "renderer": {
          "config": "./webpack.renderer.config.js",
          "entryPoints": [
            {
              "html": "./public/index.html",
              "js": "./src/renderer/src/main.tsx",
              "name": "main_window",
              "preload": {
                "js": "./src/preload/index.ts"
              }
            }
          ]
        }
      }
    },
    {
      "name": "@electron-forge/plugin-auto-unpack-natives",
      "config": {}
    }
  ],
  "hooks": {}
};