/** Built-in SoftGit themes — users pick any of these. */

export type ThemeId =
  | 'system'
  | 'light'
  | 'dark'
  | 'dim'
  | 'high-contrast'
  | 'sepia'
  | 'nord'
  | 'solarized-light'
  | 'solarized-dark'
  | 'dracula'
  | 'github-dark'
  | 'monokai'

export interface ThemeDefinition {
  id: ThemeId
  label: string
  description: string
  /** CSS variables applied to :root when selected */
  vars: Record<string, string>
  /** Approximate mode for OS chrome / invert heuristics */
  mode: 'light' | 'dark'
}

const baseLight = {
  '--color-canvas-default': '#ffffff',
  '--color-canvas-subtle': '#f6f8fa',
  '--color-canvas-inset': '#f6f8fa',
  '--color-border-default': '#d0d7de',
  '--color-border-muted': '#d8dee4',
  '--color-fg-default': '#1f2328',
  '--color-fg-muted': '#656d76',
  '--color-fg-subtle': '#6e7781',
  '--color-accent-fg': '#0969da',
  '--color-accent-emphasis': '#0969da',
  '--color-success-fg': '#1a7f37',
  '--color-success-emphasis': '#1f883d',
  '--color-danger-fg': '#d1242f',
  '--color-danger-emphasis': '#cf222e',
  '--color-attention-fg': '#9a6700',
  '--color-btn-bg': '#f6f8fa',
  '--color-btn-border': '#d0d7de',
  '--color-btn-primary-bg': '#1f883d',
  '--color-btn-primary-hover': '#1a7f37',
  '--color-btn-primary-text': '#ffffff',
  '--color-header-bg': '#f6f8fa',
  '--color-header-text': '#1f2328',
  '--color-counter-bg': '#eaeef2',
}

const baseDark = {
  '--color-canvas-default': '#0d1117',
  '--color-canvas-subtle': '#161b22',
  '--color-canvas-inset': '#010409',
  '--color-border-default': '#30363d',
  '--color-border-muted': '#21262d',
  '--color-fg-default': '#e6edf3',
  '--color-fg-muted': '#848d97',
  '--color-fg-subtle': '#6e7681',
  '--color-accent-fg': '#2f81f7',
  '--color-accent-emphasis': '#1f6feb',
  '--color-success-fg': '#3fb950',
  '--color-success-emphasis': '#238636',
  '--color-danger-fg': '#f85149',
  '--color-danger-emphasis': '#da3633',
  '--color-attention-fg': '#d29922',
  '--color-btn-bg': '#21262d',
  '--color-btn-border': '#30363d',
  '--color-btn-primary-bg': '#238636',
  '--color-btn-primary-hover': '#2ea043',
  '--color-btn-primary-text': '#ffffff',
  '--color-header-bg': '#161b22',
  '--color-header-text': '#e6edf3',
  '--color-counter-bg': '#30363d',
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'system',
    label: 'System',
    description: 'Follow your device light/dark preference',
    vars: {},
    mode: 'light',
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Classic light appearance',
    vars: { ...baseLight },
    mode: 'light',
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Classic dark appearance',
    vars: { ...baseDark },
    mode: 'dark',
  },
  {
    id: 'dim',
    label: 'Dim',
    description: 'Softer dark gray theme',
    vars: {
      ...baseDark,
      '--color-canvas-default': '#1c2128',
      '--color-canvas-subtle': '#252c35',
      '--color-canvas-inset': '#151a21',
      '--color-header-bg': '#252c35',
      '--color-border-default': '#3d444d',
      '--color-border-muted': '#2d333b',
    },
    mode: 'dark',
  },
  {
    id: 'high-contrast',
    label: 'High contrast',
    description: 'Maximum contrast for accessibility',
    vars: {
      ...baseDark,
      '--color-canvas-default': '#000000',
      '--color-canvas-subtle': '#0a0a0a',
      '--color-canvas-inset': '#000000',
      '--color-fg-default': '#ffffff',
      '--color-fg-muted': '#e0e0e0',
      '--color-border-default': '#ffffff',
      '--color-border-muted': '#aaaaaa',
      '--color-accent-fg': '#66b3ff',
      '--color-accent-emphasis': '#3399ff',
      '--color-header-bg': '#000000',
      '--color-header-text': '#ffffff',
      '--color-btn-bg': '#111111',
      '--color-btn-border': '#ffffff',
    },
    mode: 'dark',
  },
  {
    id: 'sepia',
    label: 'Sepia',
    description: 'Warm paper-like reading theme',
    vars: {
      ...baseLight,
      '--color-canvas-default': '#f4ecd8',
      '--color-canvas-subtle': '#ebe3cf',
      '--color-canvas-inset': '#e6dcc4',
      '--color-fg-default': '#5b4636',
      '--color-fg-muted': '#7a6552',
      '--color-border-default': '#c4b49a',
      '--color-border-muted': '#d4c7b0',
      '--color-accent-fg': '#8b5a2b',
      '--color-accent-emphasis': '#a0522d',
      '--color-header-bg': '#ebe3cf',
      '--color-header-text': '#5b4636',
      '--color-btn-bg': '#ebe3cf',
      '--color-btn-border': '#c4b49a',
      '--color-btn-primary-bg': '#8b5a2b',
      '--color-btn-primary-hover': '#6f4520',
    },
    mode: 'light',
  },
  {
    id: 'nord',
    label: 'Nord',
    description: 'Cool arctic palette',
    vars: {
      ...baseDark,
      '--color-canvas-default': '#2e3440',
      '--color-canvas-subtle': '#3b4252',
      '--color-canvas-inset': '#242933',
      '--color-fg-default': '#eceff4',
      '--color-fg-muted': '#d8dee9',
      '--color-border-default': '#4c566a',
      '--color-border-muted': '#434c5e',
      '--color-accent-fg': '#88c0d0',
      '--color-accent-emphasis': '#81a1c1',
      '--color-success-fg': '#a3be8c',
      '--color-success-emphasis': '#a3be8c',
      '--color-danger-fg': '#bf616a',
      '--color-danger-emphasis': '#bf616a',
      '--color-header-bg': '#3b4252',
      '--color-header-text': '#eceff4',
      '--color-btn-bg': '#434c5e',
      '--color-btn-border': '#4c566a',
      '--color-btn-primary-bg': '#5e81ac',
      '--color-btn-primary-hover': '#81a1c1',
    },
    mode: 'dark',
  },
  {
    id: 'solarized-light',
    label: 'Solarized Light',
    description: 'Ethan Schoonover’s light palette',
    vars: {
      ...baseLight,
      '--color-canvas-default': '#fdf6e3',
      '--color-canvas-subtle': '#eee8d5',
      '--color-canvas-inset': '#eee8d5',
      '--color-fg-default': '#657b83',
      '--color-fg-muted': '#93a1a1',
      '--color-border-default': '#93a1a1',
      '--color-border-muted': '#eee8d5',
      '--color-accent-fg': '#268bd2',
      '--color-accent-emphasis': '#268bd2',
      '--color-header-bg': '#eee8d5',
      '--color-header-text': '#657b83',
      '--color-btn-bg': '#eee8d5',
      '--color-btn-border': '#93a1a1',
      '--color-btn-primary-bg': '#859900',
      '--color-btn-primary-hover': '#586e75',
    },
    mode: 'light',
  },
  {
    id: 'solarized-dark',
    label: 'Solarized Dark',
    description: 'Ethan Schoonover’s dark palette',
    vars: {
      ...baseDark,
      '--color-canvas-default': '#002b36',
      '--color-canvas-subtle': '#073642',
      '--color-canvas-inset': '#002b36',
      '--color-fg-default': '#839496',
      '--color-fg-muted': '#657b83',
      '--color-border-default': '#586e75',
      '--color-border-muted': '#073642',
      '--color-accent-fg': '#268bd2',
      '--color-accent-emphasis': '#268bd2',
      '--color-header-bg': '#073642',
      '--color-header-text': '#93a1a1',
      '--color-btn-bg': '#073642',
      '--color-btn-border': '#586e75',
      '--color-btn-primary-bg': '#859900',
      '--color-btn-primary-hover': '#586e75',
    },
    mode: 'dark',
  },
  {
    id: 'dracula',
    label: 'Dracula',
    description: 'Popular purple-tinted dark theme',
    vars: {
      ...baseDark,
      '--color-canvas-default': '#282a36',
      '--color-canvas-subtle': '#21222c',
      '--color-canvas-inset': '#191a21',
      '--color-fg-default': '#f8f8f2',
      '--color-fg-muted': '#bd93f9',
      '--color-border-default': '#44475a',
      '--color-border-muted': '#343746',
      '--color-accent-fg': '#8be9fd',
      '--color-accent-emphasis': '#bd93f9',
      '--color-success-fg': '#50fa7b',
      '--color-success-emphasis': '#50fa7b',
      '--color-danger-fg': '#ff5555',
      '--color-danger-emphasis': '#ff5555',
      '--color-header-bg': '#21222c',
      '--color-header-text': '#f8f8f2',
      '--color-btn-bg': '#44475a',
      '--color-btn-border': '#6272a4',
      '--color-btn-primary-bg': '#bd93f9',
      '--color-btn-primary-hover': '#ff79c6',
      '--color-btn-primary-text': '#282a36',
    },
    mode: 'dark',
  },
  {
    id: 'github-dark',
    label: 'GitHub Dark',
    description: 'Closer to GitHub’s dark UI',
    vars: { ...baseDark },
    mode: 'dark',
  },
  {
    id: 'monokai',
    label: 'Monokai',
    description: 'Editor-inspired dark theme',
    vars: {
      ...baseDark,
      '--color-canvas-default': '#272822',
      '--color-canvas-subtle': '#1e1f1c',
      '--color-canvas-inset': '#1e1f1c',
      '--color-fg-default': '#f8f8f2',
      '--color-fg-muted': '#a6a69c',
      '--color-border-default': '#49483e',
      '--color-border-muted': '#3e3d32',
      '--color-accent-fg': '#66d9ef',
      '--color-accent-emphasis': '#a6e22e',
      '--color-success-fg': '#a6e22e',
      '--color-danger-fg': '#f92672',
      '--color-danger-emphasis': '#f92672',
      '--color-header-bg': '#1e1f1c',
      '--color-header-text': '#f8f8f2',
      '--color-btn-bg': '#3e3d32',
      '--color-btn-border': '#49483e',
      '--color-btn-primary-bg': '#a6e22e',
      '--color-btn-primary-hover': '#66d9ef',
      '--color-btn-primary-text': '#272822',
    },
    mode: 'dark',
  },
]

export const THEME_STORAGE_KEY = 'softgit_theme'

export function getStoredThemeId(): ThemeId {
  const v = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null
  if (v && THEMES.some((t) => t.id === v)) return v
  return 'system'
}

export function applyTheme(id: ThemeId) {
  const root = document.documentElement
  // Clear previous custom vars
  for (const t of THEMES) {
    for (const key of Object.keys(t.vars)) {
      root.style.removeProperty(key)
    }
  }
  root.classList.remove('dark')

  let theme = THEMES.find((t) => t.id === id) || THEMES[0]
  let mode = theme.mode

  if (id === 'system') {
    const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    theme = THEMES.find((t) => t.id === (preferDark ? 'dark' : 'light'))!
    mode = theme.mode
  }

  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v)
  }
  if (mode === 'dark') {
    root.classList.add('dark')
  }
  localStorage.setItem(THEME_STORAGE_KEY, id)
}
