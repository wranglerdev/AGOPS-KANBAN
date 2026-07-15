import type { CSSProperties } from 'react'

/**
 * Ícone monocromático (Google Material Symbols, estilo Rounded).
 * Os SVGs ficam em `public/icons/<name>.svg` e são aplicados como `mask`,
 * de modo que o glifo herda `currentColor` — recolorindo junto com o tema
 * e o contexto (branco em .btn-primary, vermelho em .btn-danger, etc.).
 */
export function Icon({
  name,
  size = 20,
  className,
  style
}: {
  name: string
  size?: number
  className?: string
  style?: CSSProperties
}): JSX.Element {
  const url = `/icons/${name}.svg`
  return (
    <span
      aria-hidden="true"
      className={`icon${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: size,
        maskImage: `url(${url})`,
        WebkitMaskImage: `url(${url})`,
        ...style
      }}
    />
  )
}
