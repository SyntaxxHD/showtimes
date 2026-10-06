import type { FC, PropsWithChildren } from 'hono/jsx'
import type { CinemaInfo } from '../types.ts'
import { Icon } from './Icon.tsx'
import { ExternalLink } from './components.tsx'

interface LayoutProps {
  activePath?: string
  cinemaInfo: CinemaInfo
}

const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  activePath,
  cinemaInfo,
  children
}) => {
  const pageTitle = cinemaInfo.name
  return (
    <html lang='de'>
      <head>
        <meta charset='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <title>{pageTitle}</title>
        <link rel='stylesheet' href='/static/style.css' />
        <link
          rel='icon'
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%231c1c1c'/><circle cx='16' cy='16' r='10' fill='none' stroke='%239a9a7c' stroke-width='2'/><polygon points='13,11 23,16 13,21' fill='%239a9a7c'/></svg>"
        />
      </head>
      <body>
        <header class='site-header'>
          <a href='/program' class='site-logo' aria-label={`${cinemaInfo.name}`}>
            {cinemaInfo.logoWideImageUrl ? (
              <img
                src={cinemaInfo.logoWideImageUrl}
                alt={cinemaInfo.name}
                class='site-logo-img'
                height='48'
              />
            ) : (
              cinemaInfo.shortName
            )}
          </a>
          <nav class='site-nav'>
            <a href='/program' class={activePath === 'program' ? 'active' : ''}>
              <Icon name='clapperboard' size={15} />
              Programm
            </a>
            <a href='/analytics' class={activePath === 'analytics' ? 'active' : ''}>
              <Icon name='bar-chart-2' size={15} />
              Statistiken
            </a>
            <a href='/settings' class={activePath === 'settings' ? 'active' : ''}>
              <Icon name='settings' size={15} />
              Einstellungen
            </a>
          </nav>
        </header>
        <main class='site-main'>{children}</main>
        <footer class='site-footer'>
          <p>
            Daten von{' '}
            {cinemaInfo.websiteUrl ? (
              <ExternalLink href={cinemaInfo.websiteUrl}>{cinemaInfo.name}</ExternalLink>
            ) : (
              cinemaInfo.name
            )}{' '}
            via Cineamo API
          </p>
        </footer>
      </body>
    </html>
  )
}

export default Layout
