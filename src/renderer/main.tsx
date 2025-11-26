import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './src/App.tsx'
import './src/brand.css'
import './src/index.css'

console.log('🚀 Renderer main.tsx loading...')
console.log('window.electronAPI:', window.electronAPI)

try {
  const root = document.getElementById('root')
  if (!root) {
    console.error('❌ Root element not found!')
  } else {
    console.log('✅ Root element found, rendering App...')
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    console.log('✅ React app rendered')
  }
} catch (error) {
  console.error('❌ Error rendering React app:', error)
}
