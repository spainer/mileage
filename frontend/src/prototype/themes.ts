// PROTOTYPE ONLY — throwaway style drafts for the Garage layout.
export type StyleId = 'dark' | 'midnight'

export interface StyleDraft {
  id: StyleId
  label: string
  dark: boolean
  /** CSS variables applied to <html> to re-tint the Nuxt UI base. */
  vars: Record<string, string>
  /** Surface tokens used by the Garage layout. */
  card: string
  statTile: string
  licenseBadge: string
  addTile: string
}

export const styleDrafts: StyleDraft[] = [
  {
    id: 'dark',
    label: 'Dark',
    dark: true,
    vars: { '--ui-bg': '#020617', '--ui-bg-muted': '#0f172a' },
    card: 'border-slate-800 bg-slate-900 hover:border-blue-500/50',
    statTile: 'bg-slate-800/70',
    licenseBadge: 'bg-slate-800',
    addTile: 'border-slate-700 text-slate-400 hover:border-blue-400/60 hover:text-blue-300',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    dark: true,
    vars: { '--ui-bg': '#0b1120', '--ui-bg-muted': '#111a33' },
    card: 'border-blue-900/60 bg-blue-950/40 hover:border-blue-500/60',
    statTile: 'bg-blue-950/60',
    licenseBadge: 'bg-blue-950/60',
    addTile: 'border-blue-800/70 text-blue-300/70 hover:border-blue-400 hover:text-blue-200',
  },
]
