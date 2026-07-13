export interface Api {
  saveMarkdown: (defaultName: string, content: string) => Promise<string | null>
}

declare global {
  interface Window {
    api: Api
  }
}
