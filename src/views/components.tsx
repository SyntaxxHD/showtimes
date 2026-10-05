import type { FC, PropsWithChildren } from 'hono/jsx'

import { Icon } from './Icon.tsx'

interface FilterChipProps {
  href: string
  active: boolean
  extraClass?: string
  children?: unknown
}

export const FilterChip: FC<FilterChipProps> = ({ href, active, extraClass, children }) => {
  const cls = ['chip', extraClass, active ? 'active' : ''].filter(Boolean).join(' ')

  return <a href={href} class={cls}>{children}</a>
}

interface FilterRowProps {
  icon: string
  label: string
}

export const FilterRow: FC<PropsWithChildren<FilterRowProps>> = ({ icon, label, children }) => (
  <div class='filter-row'>
    <span class='filter-label'>
      <Icon name={icon} size={13} />
      {label}
    </span>
    {children}
  </div>
)

interface ViewBtnProps {
  href: string
  active: boolean
  icon: string
  title: string
  children?: unknown
}

export const ViewBtn: FC<ViewBtnProps> = ({ href, active, icon, title, children }) => (
  <a href={href} class={`view-btn ${active ? 'active' : ''}`} title={title}>
    <Icon name={icon} size={14} /> {children}
  </a>
)

interface StatTileProps {
  value: string | number
  label: string
}

export const StatTile: FC<StatTileProps> = ({ value, label }) => (
  <div class='stat-tile'>
    <span class='stat-value'>{value}</span>
    <span class='stat-label'>{label}</span>
  </div>
)

export const EmptyState: FC<PropsWithChildren> = ({ children }) => <p class='empty'>{children}</p>

interface ExternalLinkProps {
  href: string
  class?: string
  children?: unknown
}

export const ExternalLink: FC<ExternalLinkProps> = ({ href, class: cls, children }) => (
  <a href={href} target='_blank' rel='noopener' class={cls}>{children}</a>
)

interface PageSectionProps {
  title: string
  class?: string
}

export const PageSection: FC<PropsWithChildren<PageSectionProps>> = ({ title, class: cls, children }) => (
  <section class={cls}>
    <h2>{title}</h2>
    {children}
  </section>
)

export function roomColorClass(name: string): string {
  return `room-${name.toLowerCase()}`
}

export function roomColClass(name: string): string {
  return `room-col-${name.toLowerCase()}`
}
