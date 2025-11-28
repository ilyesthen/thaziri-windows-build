/**
 * Load PDF template image with fallback paths for production and development
 * Works with both Vite dev server and built Electron app
 */
export async function loadPDFTemplateImage(): Promise<ArrayBuffer> {
  try {
    const imageName = 'ffad17b0-7b80-424b-99e2-4173d59b7fcb-2.jpg';
    
    // Try multiple paths for robustness
    const possiblePaths = [
      `/${imageName}`, // Vite dev server / built app
      `${window.location.origin}/${imageName}`, // Full URL
      `./public/${imageName}`, // Relative to app
    ];
    
    console.log('📸 Loading PDF template image...');
    
    for (const path of possiblePaths) {
      try {
        console.log(`  Trying path: ${path}`);
        const response = await fetch(path);
        if (response.ok) {
          console.log(`  ✅ Image loaded successfully from: ${path}`);
          return await response.arrayBuffer();
        }
      } catch (err) {
        console.log(`  ❌ Failed to load from ${path}:`, err);
        continue;
      }
    }
    
    throw new Error('PDF template image not found in any location');
  } catch (error) {
    console.error('❌ Error loading PDF template:', error);
    throw new Error('Impossible de charger l\'image du modèle PDF. Vérifiez que le fichier existe.');
  }
}
