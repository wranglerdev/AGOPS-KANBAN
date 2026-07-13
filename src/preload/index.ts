import { contextBridge, ipcRenderer } from 'electron'

const api = {
  saveMarkdown: (defaultName: string, content: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveMarkdown', defaultName, content)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}

export type Api = typeof api
