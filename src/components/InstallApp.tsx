import { useEffect, useState } from 'react'

const REPO = 'https://github.com/rodrigoquisbert543-alt/SEC---CAR/releases/download/instaladores'
const URL_WINDOWS = `${REPO}/SEC-CAR-Setup.exe`
const URL_ANDROID = `${REPO}/SEC-CAR.apk`

type InstallEvent = Event & { prompt: () => Promise<void> }

const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true ||
  /Electron/i.test(navigator.userAgent) ||
  !!(window as any).Capacitor?.isNativePlatform?.()

export default function InstallApp() {
  const [abierto, setAbierto] = useState(false)
  const [evento, setEvento] = useState<InstallEvent | null>(null)
  const ua = navigator.userAgent
  const esIOS = /iPhone|iPad|iPod/i.test(ua)
  const esAndroid = /Android/i.test(ua)

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvento(e as InstallEvent) }
    const onInstalled = () => { setEvento(null); setAbierto(false) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (yaInstalada()) return null

  return (
    <>
      <button className="nav-item" onClick={() => setAbierto(true)}>
        <span className="nav-icon">⬇</span>Instalar aplicación
      </button>
      {abierto && (
        <div className="modal-backdrop" onClick={() => setAbierto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title"><div><span className="eyebrow">INSTALAR</span><h2>SEC-CAR en tu dispositivo</h2></div></div>
            <p style={{ fontSize: 13 }}>Se abre como un programa más, sin entrar al navegador, y se actualiza sola.</p>
            <div style={{ display: 'grid', gap: 10, margin: '12px 0' }}>
              <a className="primary-button full" href={URL_WINDOWS} style={{ textAlign: 'center', textDecoration: 'none' }}>
                Descargar para Windows (.exe)
              </a>
              <a className="primary-button full" href={URL_ANDROID} style={{ textAlign: 'center', textDecoration: 'none' }}>
                Descargar para Android (.apk)
              </a>
              {evento && (
                <button className="status-toggle" onClick={async () => { await evento.prompt(); setEvento(null) }}>
                  Instalar directamente desde este navegador
                </button>
              )}
            </div>
            {esAndroid && <div className="payment-note">Android: al abrir el .apk, permite “instalar apps de esta fuente” cuando el teléfono lo pida.</div>}
            {esIOS && <div className="payment-note">iPhone/iPad: abre esta página en Safari, pulsa Compartir y luego “Agregar a pantalla de inicio”.</div>}
            {!esIOS && !esAndroid && <div className="payment-note">Windows: ejecuta SEC-CAR-Setup.exe. Si aparece un aviso azul de SmartScreen, pulsa “Más información” y “Ejecutar de todas formas”.</div>}
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button className="status-toggle" onClick={() => setAbierto(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
