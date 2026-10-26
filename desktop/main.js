const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

const APP_URL = 'https://sec-car-rho.vercel.app/'

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let win

function createWindow() {
  Menu.setApplicationMenu(null)
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'SEC-CAR',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })

  win.loadURL(APP_URL)

  // Sin internet: pantalla de reintento
  win.webContents.on('did-fail-load', (_e, code, _d, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && url.startsWith(APP_URL)) {
      win.loadFile(path.join(__dirname, 'offline.html'))
    }
  })

  // Los enlaces externos (WhatsApp, etc.) se abren en el navegador
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_URL)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(APP_URL) && !url.startsWith('file://')) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
