function sanitizeFileName(name: string): string {
  return (name.trim() || 'nota').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)
}

/** Baixa uma nota como arquivo Markdown via Blob/anchor. */
export function exportNoteMd(title: string, contentMd: string): void {
  const blob = new Blob([contentMd], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFileName(title)}.md`
  a.click()
  URL.revokeObjectURL(url)
}
