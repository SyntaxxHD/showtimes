import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const cache = new Map<string, string>()

function loadIcon(name: string): string {
  if (cache.has(name)) {
    return cache.get(name)!
  }
  const path = join(
    import.meta.dir,
    '../../node_modules/lucide-static/icons',
    `${name}.svg`
  )
  const raw = readFileSync(path, 'utf-8')
  // Strip the comment line, keep only the <svg>...</svg>
  const svg = raw.replace(/<!--[^>]*-->\n?/, '').trim()
  cache.set(name, svg)
  return svg
}

interface IconProps {
  name: string
  size?: number
  class?: string
}

export const Icon = ({ name, size = 16, class: cls = '' }: IconProps) => {
  const svg = loadIcon(name)
  // Patch width/height/class on the root <svg> tag
  const patched = svg.replace(/<svg([^>]*)>/, (_match: string, attrs: string) => {
    const cleaned = attrs
      .replace(/\s*width="[^"]*"/, '')
      .replace(/\s*height="[^"]*"/, '')
      .replace(/\s*class="[^"]*"/, '')
    return `<svg${cleaned} width="${size}" height="${size}" class="icon${cls ? ' ' + cls : ''}">`
  })
  return <span dangerouslySetInnerHTML={{ __html: patched }} />
}
