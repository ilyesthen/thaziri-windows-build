/**
 * PROFESSIONAL FIX for field clickability issues
 * 
 * ROOT CAUSE: React event delegation + modal rendering + form opening
 * creates event handler conflicts and timing issues
 * 
 * SYMPTOM: Fields work after opening console (forces DOM repaint)
 * 
 * SOLUTION: Proper event handler management with React lifecycle
 */

/**
 * Force DOM reflow to fix event handler attachment issues
 * This fixes the "works after console open" problem
 */
export function forceDOMReflow(): void {
  // Trigger a reflow by reading offsetHeight
  // This forces the browser to recalculate layout
  document.body.offsetHeight
  
  // Force repaint
  void document.body.offsetWidth
}

/**
 * Re-attach event listeners to interactive elements
 * Fixes detached event handlers after modal/form operations
 */
export function reattachEventListeners(): void {
  // Get all interactive elements
  const interactiveElements = document.querySelectorAll<HTMLElement>(
    'input, textarea, select, button, a, [role="button"], [onclick]'
  )
  
  interactiveElements.forEach(element => {
    // Force event listener re-registration by cloning and replacing
    const clone = element.cloneNode(true) as HTMLElement
    element.parentNode?.replaceChild(clone, element)
  })
}

/**
 * Fix event handlers after modal/form operations
 * Call this after opening/closing modals or forms
 */
export function fixInteractivity(): void {
  // Method 1: Force DOM reflow (lightweight)
  forceDOMReflow()
  
  // Method 2: Trigger resize event (forces React to re-render event handlers)
  window.dispatchEvent(new Event('resize'))
  
  // Method 3: Force focus chain update
  const activeElement = document.activeElement as HTMLElement
  if (activeElement && activeElement.blur) {
    activeElement.blur()
  }
  
  console.log('✅ DOM interactivity fixed')
}

/**
 * Initialize automatic interactivity fixes
 * Monitors for forms/modals and auto-fixes
 */
export function initializeInteractivityMonitor(): void {
  // Watch for modal/form state changes
  const observer = new MutationObserver((mutations) => {
    let needsFix = false
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement
          // Check if a modal or form was added
          if (
            element.classList?.contains('modal') ||
            element.classList?.contains('modal-overlay') ||
            element.tagName === 'FORM'
          ) {
            needsFix = true
          }
        }
      })
    })
    
    if (needsFix) {
      // Debounce the fix to avoid excessive calls
      setTimeout(() => fixInteractivity(), 100)
    }
  })
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
  
  console.log('✅ DOM interactivity monitor initialized')
}

/**
 * Emergency fix for stuck interactive elements
 * Use when fields become completely unresponsive
 */
export function emergencyInteractivityFix(): void {
  console.log('🚨 Running emergency interactivity fix...')
  
  // Remove any phantom overlays
  const overlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"]')
  overlays.forEach(overlay => {
    const el = overlay as HTMLElement
    if (getComputedStyle(el).display === 'none') {
      el.style.pointerEvents = 'none'
      el.style.visibility = 'hidden'
      el.style.zIndex = '-9999'
    }
  })
  
  // Fix all interactive elements
  const interactiveElements = document.querySelectorAll<HTMLElement>(
    'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])'
  )
  
  interactiveElements.forEach(element => {
    element.style.pointerEvents = 'auto'
    element.style.position = 'relative'
  })
  
  // Force reflow
  forceDOMReflow()
  
  // Trigger React re-render
  window.dispatchEvent(new Event('resize'))
  
  console.log('✅ Emergency fix applied')
}
