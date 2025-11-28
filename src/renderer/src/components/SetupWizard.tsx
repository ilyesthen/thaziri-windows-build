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
  const [setupMessage, setSetupMessage] = useState('');
  const [shareCreated, setShareCreated] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [discoveredServers, setDiscoveredServers] = useState<Array<{ name: string; ip: string; port: number; url: string }>>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

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
      // Auto-discover servers when entering client setup
      handleDiscoverServers();
    }
  };

  const handleAdminSetup = async () => {
    try {
      setConnectionStatus('testing');
      setErrorMessage('');
      
      // Step 1: Import existing database if provided
      if (importDbPath) {
        console.log('📥 Importing database from:', importDbPath);
        setSetupMessage('📥 Importation de la base de données...');
        
        const importResult = await window.electronAPI.importDatabase(importDbPath);
        if (!importResult.success) {
          setErrorMessage(`Erreur d'importation: ${importResult.error}`);
          setConnectionStatus('error');
          return;
        }
        
        console.log('✅ Database imported successfully');
      }
      
      // Step 2: Start the database server
      console.log('🚀 Starting database server...');
      setSetupMessage('🚀 Démarrage du serveur...');
      
      const serverResult = await window.electronAPI.server.start();
      
      if (!serverResult.success) {
        setErrorMessage(`Erreur: ${serverResult.error || 'Impossible de démarrer le serveur'}`);
        setConnectionStatus('error');
        return;
      }
      
      // Step 3: Save server info and complete
      setServerUrl(serverResult.url || '');
      
      let finalMessage = '✅ Configuration Admin terminée!\n\n';
      if (importDbPath) {
        finalMessage += '📥 Base de données importée\n';
      }
      finalMessage += `🌐 Serveur démarré:\n`;
      finalMessage += `   IP: ${serverResult.ip}\n`;
      finalMessage += `   Port: ${serverResult.port}\n`;
      finalMessage += `   URL: ${serverResult.url}\n\n`;
      finalMessage += '✅ Les PCs clients peuvent maintenant se connecter!';
      
      setSetupMessage(finalMessage);
      
      // Mark setup as complete
      await window.electronAPI.setupDatabase({ mode: 'admin', shareName });
      
      setConnectionStatus('success');
      setStep('complete');
    } catch (error) {
      console.error('Setup error:', error);
      setErrorMessage(`Erreur de configuration: ${error}`);
      setConnectionStatus('error');
    }
  };

  const handleDiscoverServers = async () => {
    setIsDiscovering(true);
    setConnectionStatus('testing');
    setErrorMessage('');
    setDiscoveredServers([]);

    try {
      console.log('📡 Discovering servers...');
      const result = await window.electronAPI.server.discover();
      
      if (result.success && result.servers && result.servers.length > 0) {
        setDiscoveredServers(result.servers);
        setConnectionStatus('idle');
      } else {
        setErrorMessage(result.error || 'Aucun serveur trouvé');
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Discovery error:', error);
      setErrorMessage(`Erreur de découverte: ${error}`);
      setConnectionStatus('error');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleConnectToServer = async (server: { name: string; ip: string; port: number; url: string }) => {
    setIsConnecting(true);
    setConnectionStatus('testing');
    setErrorMessage('');

    try {
      console.log(`🔌 Connecting to ${server.name}...`);
      const result = await window.electronAPI.server.connect(server.url);
      
      if (result.success) {
        // Save configuration
        await window.electronAPI.setupDatabase({ 
          mode: 'client', 
          databasePath: server.url 
        });
        
        setConnectionStatus('success');
        setSetupMessage(`✅ Connecté à: ${server.name}\n\nIP: ${server.ip}\nPort: ${server.port}`);
        setTimeout(() => setStep('complete'), 1500);
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Failed to connect');
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

              {/* Setup Progress Status */}
              {connectionStatus === 'testing' && setupMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-blue-800 font-medium whitespace-pre-line">{setupMessage}</span>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {connectionStatus === 'error' && errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <span className="text-red-800 font-medium block">Erreur de configuration</span>
                      <span className="text-red-700 text-sm whitespace-pre-line">{errorMessage}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Steps Info - Only show when not in progress */}
              {connectionStatus === 'idle' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Ce qui va se passer:</h4>
                  <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
                    <li>La base de données sera créée automatiquement</li>
                    <li>Le serveur démarrera et sera accessible sur le réseau</li>
                    <li>Vous recevrez les informations de connexion pour les clients</li>
                  </ol>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('mode-selection')}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  disabled={connectionStatus === 'testing'}
                >
                  Retour
                </button>
                <button
                  onClick={handleAdminSetup}
                  disabled={connectionStatus === 'testing'}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectionStatus === 'testing' ? 'Configuration...' : 'Continuer'}
                </button>
              </div>
            </div>
          )}

          {/* Client Setup Step - AUTO-DISCOVERY */}
          {step === 'client-setup' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Network className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Client PC Setup</h3>
                <p className="text-gray-600">Découverte automatique des serveurs</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Network className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Recherche en cours...</p>
                    <p>Le système recherche automatiquement les serveurs Thaziri sur le réseau</p>
                  </div>
                </div>
              </div>

              {/* Discovery Status */}
              {isDiscovering && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-blue-800 font-medium">📡 Scan du réseau en cours...</span>
                  </div>
                </div>
              )}

              {/* Discovered Servers List */}
              {!isDiscovering && discoveredServers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Serveurs disponibles ({discoveredServers.length}):</h4>
                  {discoveredServers.map((server, index) => (
                    <div
                      key={index}
                      className="border-2 border-green-200 rounded-lg p-4 hover:border-green-400 transition-colors cursor-pointer bg-white"
                      onClick={() => handleConnectToServer(server)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">{server.name}</div>
                          <div className="text-sm text-gray-600">
                            IP: {server.ip} • Port: {server.port}
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-1">{server.url}</div>
                        </div>
                        <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                          Connecter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error or No Servers */}
              {!isDiscovering && discoveredServers.length === 0 && errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <span className="text-red-800 font-medium block">Aucun serveur trouvé</span>
                      <span className="text-red-700 text-sm whitespace-pre-line">{errorMessage}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Connection Status */}
              {isConnecting && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-blue-800 font-medium">Connexion en cours...</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('mode-selection')}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  disabled={isConnecting || isDiscovering}
                >
                  Retour
                </button>
                <button
                  onClick={handleDiscoverServers}
                  disabled={isConnecting || isDiscovering}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDiscovering ? '🔍 Recherche...' : '🔄 Rechercher à nouveau'}
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
                <>
                  {/* Setup Result Message */}
                  {setupMessage && (
                    <div className={`${shareCreated ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4`}>
                      <div className="whitespace-pre-line text-sm text-gray-800">
                        {setupMessage}
                      </div>
                    </div>
                  )}

                  {/* Network Path Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-blue-900">
                      {shareCreated ? '✅ Chemin Réseau (Prêt à utiliser)' : '📋 Chemin Réseau'}
                    </h4>
                    
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">Copiez ce chemin:</span>
                        <button
                          onClick={() => copyToClipboard(uncPath || getNetworkPath())}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                        >
                          <Copy className="w-4 h-4" />
                          Copier
                        </button>
                      </div>
                      <code className="text-sm font-mono text-gray-900 block break-all">
                        {uncPath || getNetworkPath()}
                      </code>
                    </div>

                    <div className="text-sm text-blue-800 space-y-2">
                      <p className="font-medium">Prochaines étapes:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Installez Thaziri sur les PCs clients</li>
                        <li>Sélectionnez "PC Client" pendant la configuration</li>
                        <li>Collez le chemin réseau ci-dessus</li>
                        <li>Tous les PCs partageront la même base de données!</li>
                      </ol>
                    </div>
                  </div>
                </>
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
