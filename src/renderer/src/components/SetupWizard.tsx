import React, { useState, useEffect } from 'react';
import { X, Server, Users, Network, CheckCircle, AlertCircle, Copy, Upload } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

type SetupMode = 'admin' | 'client' | null;
type SetupStep = 'welcome' | 'mode-selection' | 'admin-setup' | 'client-setup' | 'complete';

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<SetupStep>('welcome');
  const [mode, setMode] = useState<SetupMode>(null);
  const [serverPath, setServerPath] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [computerName, setComputerName] = useState('');
  const [shareName, setShareName] = useState('ThaziriDB');
  const [importDbPath, setImportDbPath] = useState('');
  const [uncPath, setUncPath] = useState('');

  useEffect(() => {
    // Get computer name for admin setup
    window.electronAPI.getComputerName().then(name => setComputerName(name));
  }, []);

  const handleModeSelection = (selectedMode: SetupMode) => {
    setMode(selectedMode);
    if (selectedMode === 'admin') {
      setStep('admin-setup');
    } else {
      setStep('client-setup');
    }
  };

  const handleAdminSetup = async () => {
    try {
      // Import existing database FIRST if provided
      if (importDbPath) {
        console.log('📥 Importing database from:', importDbPath);
        await window.electronAPI.importDatabase(importDbPath);
      }
      
      // Configure as admin (use local database)
      const result = await window.electronAPI.setupDatabase({ mode: 'admin', shareName });
      
      if (result.success && result.uncPath) {
        setUncPath(result.uncPath);
      }
      
      setStep('complete');
    } catch (error) {
      setErrorMessage(`Setup failed: ${error}`);
      setConnectionStatus('error');
    }
  };

  const handleClientSetup = async () => {
    setIsConnecting(true);
    setConnectionStatus('testing');
    setErrorMessage('');

    try {
      // Test connection to server
      const result = await window.electronAPI.testDatabaseConnection(serverPath);
      
      if (result.success) {
        // Save configuration
        await window.electronAPI.setupDatabase({ 
          mode: 'client', 
          databasePath: serverPath 
        });
        
        setConnectionStatus('success');
        setTimeout(() => setStep('complete'), 1500);
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Failed to connect to database');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(`Connection failed: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSelectDatabaseFile = async () => {
    const path = await window.electronAPI.selectFile({
      filters: [{ name: 'Database', extensions: ['db'] }]
    });
    if (path) {
      setImportDbPath(path);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getNetworkPath = () => {
    return `\\\\${computerName}\\${shareName}\\thaziri-database.db`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Thaziri Setup Wizard</h2>
              <p className="text-blue-100 mt-1">Configure your clinic management system</p>
            </div>
            <Network className="w-12 h-12 opacity-50" />
          </div>
        </div>

        <div className="p-6">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Server className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Thaziri!</h3>
                <p className="text-gray-600">
                  Let's configure your clinic management system for network use.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">What you'll need:</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>All computers on the same local network</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>One computer designated as the Admin/Server</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Network permissions for file sharing</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setStep('mode-selection')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mode Selection Step */}
          {step === 'mode-selection' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select Setup Type</h3>
                <p className="text-gray-600">Choose how this computer will be used</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Admin Option */}
                <button
                  onClick={() => handleModeSelection('admin')}
                  className="group border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200">
                    <Server className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Admin PC (Server)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    This computer will host the main database that other computers connect to.
                  </p>
                  <ul className="space-y-1 text-xs text-gray-500">
                    <li>✓ Hosts the master database</li>
                    <li>✓ Must be always running</li>
                    <li>✓ Shares data with clients</li>
                  </ul>
                </button>

                {/* Client Option */}
                <button
                  onClick={() => handleModeSelection('client')}
                  className="group border-2 border-gray-200 rounded-xl p-6 hover:border-green-500 hover:bg-green-50 transition-all text-left"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Client PC</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    This computer will connect to the admin PC's database.
                  </p>
                  <ul className="space-y-1 text-xs text-gray-500">
                    <li>✓ Connects to admin database</li>
                    <li>✓ Works with shared data</li>
                    <li>✓ Real-time synchronization</li>
                  </ul>
                </button>
              </div>
            </div>
          )}

          {/* Admin Setup Step */}
          {step === 'admin-setup' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Server className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Admin PC Setup</h3>
                <p className="text-gray-600">Configure this computer as the database server</p>
              </div>

              {/* Import Existing Database */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900">Import Existing Database (Optional)</h4>
                <p className="text-sm text-gray-600">
                  If you have an existing database file, you can import it now.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectDatabaseFile}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Select Database File
                  </button>
                  {importDbPath && (
                    <div className="flex-1 flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="truncate">{importDbPath}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Share Name Configuration */}
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">Network Share Name</span>
                  <input
                    type="text"
                    value={shareName}
                    onChange={(e) => setShareName(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ThaziriDB"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">
                    This name will be used to access the database from other computers
                  </span>
                </label>
              </div>

              {/* Next Steps Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">After Setup:</h4>
                <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
                  <li>The database will be created automatically</li>
                  <li>Windows will prompt you to share the folder - click "Share"</li>
                  <li>You'll get connection instructions for client PCs</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('mode-selection')}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleAdminSetup}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Client Setup Step */}
          {step === 'client-setup' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Client PC Setup</h3>
                <p className="text-gray-600">Connect to the admin PC's database</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Before you continue:</p>
                    <p>Make sure the Admin PC setup is complete and you have the network path.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">Database Network Path</span>
                  <input
                    type="text"
                    value={serverPath}
                    onChange={(e) => setServerPath(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="\\ADMIN-PC\ThaziriDB\thaziri-database.db"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">
                    Enter the UNC path provided by the Admin PC setup
                  </span>
                </label>
              </div>

              {/* Connection Status */}
              {connectionStatus !== 'idle' && (
                <div className={`rounded-lg p-4 ${
                  connectionStatus === 'testing' ? 'bg-blue-50 border border-blue-200' :
                  connectionStatus === 'success' ? 'bg-green-50 border border-green-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {connectionStatus === 'testing' && (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-blue-800 font-medium">Testing connection...</span>
                      </>
                    )}
                    {connectionStatus === 'success' && (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-800 font-medium">Connection successful!</span>
                      </>
                    )}
                    {connectionStatus === 'error' && (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <div className="flex-1">
                          <span className="text-red-800 font-medium block">Connection failed</span>
                          <span className="text-red-700 text-sm">{errorMessage}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Example format */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Expected Format:</h4>
                <code className="text-xs text-gray-600 block font-mono bg-white px-3 py-2 rounded border border-gray-200">
                  \\COMPUTER-NAME\ShareName\thaziri-database.db
                </code>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('mode-selection')}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  disabled={isConnecting}
                >
                  Back
                </button>
                <button
                  onClick={handleClientSetup}
                  disabled={!serverPath || isConnecting}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? 'Testing...' : 'Connect'}
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h3>
                <p className="text-gray-600">
                  {mode === 'admin' 
                    ? 'Your admin PC is now configured as the database server.'
                    : 'Successfully connected to the admin database.'}
                </p>
              </div>

              {mode === 'admin' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-blue-900">Share This With Client PCs:</h4>
                  
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">Network Path:</span>
                      <button
                        onClick={() => copyToClipboard(getNetworkPath())}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                    </div>
                    <code className="text-sm font-mono text-gray-900 block break-all">
                      {getNetworkPath()}
                    </code>
                  </div>

                  <div className="text-sm text-blue-800 space-y-2">
                    <p className="font-medium">Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Install Thaziri on client PCs</li>
                      <li>Select "Client PC" during setup</li>
                      <li>Enter the network path above</li>
                      <li>All PCs will share the same database!</li>
                    </ol>
                  </div>
                </div>
              )}

              <button
                onClick={onComplete}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Using Thaziri
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
