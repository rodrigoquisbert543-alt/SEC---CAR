import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './App.css'
import { registerSW } from 'virtual:pwa-register'

// Registra el Service Worker (PWA + sincronización en segundo plano)
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('SEC-CAR listo para funcionar sin conexión.')
  },
  onNeedRefresh() {
    console.log('Nueva versión disponible. Recarga para actualizar.')
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)