import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFile } from 'fs/promises'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'AGOPS Kanban',
    backgroundColor: '#f4f6fb',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // electron-vite injeta ELECTRON_RENDERER_URL em dev.
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && rendererUrl) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Salvar markdown via dialogo nativo. Retorna o caminho salvo ou null se cancelado.
ipcMain.handle(
  'dialog:saveMarkdown',
  async (_event, defaultName: string, content: string): Promise<string | null> => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exportar nota',
      defaultPath: defaultName.endsWith('.md') ? defaultName : `${defaultName}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (canceled || !filePath) return null
    await writeFile(filePath, content, 'utf-8')
    return filePath
  }
)

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
