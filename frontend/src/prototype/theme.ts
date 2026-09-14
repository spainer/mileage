// PROTOTYPE ONLY — throwaway code.
// The locked-in design surface: dark slate with a blue accent.
// `vars` re-tint the Nuxt UI base while the prototype route is active;
// the surface classes are used by WallView.

export const theme = {
  vars: { '--ui-bg': '#020617', '--ui-bg-muted': '#0f172a' },
  card: 'border-slate-800 bg-slate-900 hover:border-blue-500/50',
  statTile: 'bg-slate-800/70',
  addTile: 'border-slate-700 text-slate-400 hover:border-blue-400/60 hover:text-blue-300',
}

export function applyTheme() {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
  root.classList.add('dark')
}

export function clearTheme() {
  const root = document.documentElement
  for (const key of Object.keys(theme.vars)) {
    root.style.removeProperty(key)
  }
  root.classList.remove('dark')
}
