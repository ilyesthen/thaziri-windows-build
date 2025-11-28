/**
 * Load PDF template image with perfect error handling
 * Works in both development (Mac/Windows) and production (Windows installer)
 */
export async function loadPDFTemplateImage(): Promise<ArrayBuffer> {
  const imageName = 'ffad17b0-7b80-424b-99e2-4173d59b7fcb-2.jpg';
  
  try {
    console.log('📸 Loading PDF template image for printing...');
    
    // METHOD 1: Try Electron resource API (PRODUCTION - most reliable)
    if (window.electronAPI?.readResourceAsBase64) {
      try {
        console.log('  🔧 Using Electron resource API (production mode)');
        const base64Data = await window.electronAPI.readResourceAsBase64(imageName);
        
        // Convert base64 data URL to ArrayBuffer
        const base64 = base64Data.split(',')[1]; // Remove "data:image/jpeg;base64," prefix
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log(`  ✅ Image loaded successfully via Electron (${bytes.length} bytes)`);
        return bytes.buffer;
      } catch (electronError) {
        console.warn('  ⚠️ Electron API failed, trying fallback methods:', electronError);
      }
    }
    
    // METHOD 2: Try fetch from various paths (DEVELOPMENT - Vite server)
    const fallbackPaths = [
      `/${imageName}`,                           // Vite dev server root
      `${window.location.origin}/${imageName}`,  // Full origin URL
      `./public/${imageName}`,                   // Relative path
    ];
    
    console.log('  🌐 Trying browser fetch methods...');
    for (const path of fallbackPaths) {
      try {
        console.log(`    Trying: ${path}`);
        const response = await fetch(path);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          console.log(`  ✅ Image loaded successfully via fetch from: ${path} (${buffer.byteLength} bytes)`);
          return buffer;
        }
      } catch (fetchErr) {
        // Silent continue to next path
        continue;
      }
    }
    
    // If we got here, all methods failed
    throw new Error('IMAGE_NOT_FOUND');
    
  } catch (error) {
    console.error('❌ CRITICAL: PDF template image loading failed!');
    console.error('Error details:', error);
    
    // Provide DETAILED error message based on error type
    let errorMessage = '';
    
    if ((error as Error).message === 'IMAGE_NOT_FOUND') {
      errorMessage = `❌ ERREUR: Image de modèle PDF introuvable\n\n` +
        `Fichier recherché: ${imageName}\n\n` +
        `CAUSES POSSIBLES:\n` +
        `1. L'application n'a pas été installée correctement\n` +
        `2. Le dossier 'public' n'est pas inclus dans le build\n` +
        `3. Les ressources ont été supprimées après installation\n\n` +
        `SOLUTIONS:\n` +
        `• Réinstallez l'application depuis l'installateur officiel\n` +
        `• Contactez le support technique si le problème persiste\n\n` +
        `Détails techniques:\n` +
        `- Environnement: ${process.env.NODE_ENV || 'production'}\n` +
        `- Protocol: ${window.location.protocol}\n` +
        `- Origin: ${window.location.origin}`;
    } else {
      errorMessage = `❌ ERREUR lors du chargement de l'image PDF\n\n` +
        `Message: ${(error as Error).message || 'Erreur inconnue'}\n\n` +
        `Cette erreur empêche l'impression/téléchargement des documents.\n` +
        `Veuillez contacter le support technique avec ce message d'erreur.`;
    }
    
    throw new Error(errorMessage);
  }
}
