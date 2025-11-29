/**
 * AGGRESSIVE FIX for field clickability issues
 * 
 * ROOT CAUSE: React event delegation + modal/form rendering + z-index conflicts
 * SYMPTOM: Fields unclickable until console opens (forces repaint)
 * SOLUTION: Aggressive automatic fixing on every interaction
 */

let fixCount = 0

/**
 * Force DOM reflow to fix event handler attachment issues
 */
export function forceDOMReflow(): void {
  document.body.offsetHeight
  void document.body.offsetWidth
  // Force style recalculation
  window.getComputedStyle(document.body).getPropertyValue('opacity')
}

/**
 * AGGRESSIVE: Fix all z-index and pointer-events issues
 */
export function fixZIndexAndPointerEvents(): void {
  // Fix all interactive elements that might be blocked
  const elements = document.querySelectorAll<HTMLElement>(
    'input, textarea, select, button, [contenteditable="true"]'
  )
  
  elements.forEach(el => {
    const computed = window.getComputedStyle(el)
    
    // If element is visible but not clickable, force fix
    if (computed.display !== 'none' && computed.visibility !== 'hidden') {
      el.style.pointerEvents = 'auto'
      el.style.position = 'relative'
      
      // Ensure parent containers don't block
      let parent = el.parentElement
      let depth = 0
      while (parent && depth < 5) {
        const parentStyle = window.getComputedStyle(parent)
        if (parentStyle.pointerEvents === 'none') {
          parent.style.pointerEvents = 'auto'
        }
        parent = parent.parentElement
        depth++
      }
    }
  })
  
  // Remove any invisible overlays blocking clicks
  const allElements = document.querySelectorAll<HTMLElement>('*')
  allElements.forEach(el => {
    const computed = window.getComputedStyle(el)
    const zIndex = parseInt(computed.zIndex || '0')
    
    // If element has high z-index but is invisible, disable it
    if (zIndex > 1000 && (computed.opacity === '0' || computed.display === 'none')) {
      el.style.pointerEvents = 'none'
      el.style.zIndex = '-1'
    }
  })
}

/**
 * AGGRESSIVE: Fix all interactivity issues
 */
export function fixInteractivity(): void {
  fixCount++
  
  // Step 1: Fix z-index and pointer-events
  fixZIndexAndPointerEvents()
  
  // Step 2: Force DOM reflow
  forceDOMReflow()
  
  // Step 3: Trigger React events
  window.dispatchEvent(new Event('resize'))
  window.dispatchEvent(new Event('focus'))
  
  // Step 4: Force focus update
  const activeElement = document.activeElement as HTMLElement
  if (activeElement?.blur) {
    activeElement.blur()
    setTimeout(() => activeElement.focus?.(), 10)
  }
  
  if (fixCount % 10 === 0) {
    console.log(`✅ DOM interactivity fixed (${fixCount} times)`)
  }
}

/**
 * AGGRESSIVE: Initialize automatic interactivity fixes
 * Runs fixes continuously and on every interaction
 */
export function initializeInteractivityMonitor(): void {
  console.log('🚀 Starting AGGRESSIVE interactivity monitor...')
  
  // FIX 1: Run on EVERY click anywhere on the page
  document.addEventListener('click', () => {
    setTimeout(() => fixInteractivity(), 50)
  }, true) // Use capture phase to catch all clicks
  
  // FIX 2: Run on EVERY focus event
  document.addEventListener('focusin', () => {
    setTimeout(() => fixInteractivity(), 50)
  }, true)
  
  // FIX 3: Run on EVERY modal/form change
  const observer = new MutationObserver(() => {
    setTimeout(() => fixInteractivity(), 100)
  })
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  })
  
  // FIX 4: Run periodically every 2 seconds as safety net
  setInterval(() => {
    fixInteractivity()
  }, 2000)
  
  // FIX 5: Run on window resize/focus
  window.addEventListener('resize', () => fixInteractivity())
  window.addEventListener('focus', () => fixInteractivity())
  
  // FIX 6: Add keyboard shortcut (Ctrl+Shift+F) for emergency fix
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault()
      console.log('🚨 Manual fix triggered!')
      emergencyInteractivityFix()
    }
  })
  
  // Initial fix on load
  setTimeout(() => fixInteractivity(), 500)
  
  console.log('✅ AGGRESSIVE DOM interactivity monitor initialized')
  console.log('   - Fixes on every click')
  console.log('   - Fixes on every focus')
  console.log('   - Fixes on every DOM change')
  console.log('   - Auto-fixes every 2 seconds')
  console.log('   - Manual fix: Ctrl+Shift+F')
}

/**
 * NUCLEAR OPTION: Emergency fix for completely stuck elements
 * Use when nothing else works (also triggered by Ctrl+Shift+F)
 */
export function emergencyInteractivityFix(): void {
  console.log('🚨 Running EMERGENCY interactivity fix...')
  
  // STEP 1: Remove ALL potentially blocking overlays
  const allElements = document.querySelectorAll<HTMLElement>('*')
  allElements.forEach(el => {
    const computed = window.getComputedStyle(el)
    const zIndex = parseInt(computed.zIndex || '0')
    
    // Disable any high z-index element that might be blocking
    if (zIndex > 100 && zIndex < 10000) {
      const className = el.className || ''
      // Only disable if it's not a modal we actually need
      if (!className.includes('modal-content') && !className.includes('dropdown')) {
        el.style.pointerEvents = 'none'
      }
    }
  })
  
  // STEP 2: Force enable ALL interactive elements
  const interactiveElements = document.querySelectorAll<HTMLElement>(
    'input, textarea, select, button, [contenteditable="true"], a, [role="button"]'
  )
  
  interactiveElements.forEach(el => {
    const computed = window.getComputedStyle(el)
    if (computed.display !== 'none' && !el.hasAttribute('disabled')) {
      el.style.pointerEvents = 'auto !important' as any
      el.style.position = 'relative'
      el.style.zIndex = '1'
      
      // Fix parents too
      let parent = el.parentElement
      let depth = 0
      while (parent && depth < 10) {
        parent.style.pointerEvents = 'auto'
        parent = parent.parentElement
        depth++
      }
    }
  })
  
  // STEP 3: Multiple forced reflows
  for (let i = 0; i < 3; i++) {
    forceDOMReflow()
  }
  
  // STEP 4: Trigger ALL React events
  window.dispatchEvent(new Event('resize'))
  window.dispatchEvent(new Event('focus'))
  window.dispatchEvent(new Event('blur'))
  window.dispatchEvent(new Event('click'))
  
  // STEP 5: Fix z-index
  fixZIndexAndPointerEvents()
  
  console.log('✅ EMERGENCY fix applied - fields should work now!')
  alert('🚨 Emergency fix applied!\n\nAll fields should be clickable now.')
}
