import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type ThemeId = 'navy' | 'graphite' | 'moss' | 'petroleum';

interface ThemeOption {
  id: ThemeId;
  name: string;
  preview: string;
  vars: {
    background: string;
    card: string;
    border: string;
  };
}

const THEMES: ThemeOption[] = [
  {
    id: 'navy',
    name: 'Azul Marinho',
    preview: '#1a1d2e',
    vars: { background: '230 22% 8%', card: '230 25% 14%', border: '232 31% 25%' },
  },
  {
    id: 'graphite',
    name: 'Grafite',
    preview: '#202024',
    vars: { background: '240 4% 9%', card: '240 5% 14%', border: '240 4% 19%' },
  },
  {
    id: 'moss',
    name: 'Verde Musgo',
    preview: '#141f1a',
    vars: { background: '138 22% 7%', card: '156 19% 10%', border: '152 21% 15%' },
  },
  {
    id: 'petroleum',
    name: 'Azul Petróleo',
    preview: '#161b22',
    vars: { background: '215 28% 7%', card: '215 21% 11%', border: '213 17% 16%' },
  },
];

const STORAGE_KEY = 'crm-theme-preference';

export function applyThemePalette(themeId: ThemeId) {
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--background', theme.vars.background);
  root.style.setProperty('--kanban-bg', theme.vars.background);
  root.style.setProperty('--card', theme.vars.card);
  root.style.setProperty('--popover', theme.vars.card);
  root.style.setProperty('--kanban-column', theme.vars.card);
  root.style.setProperty('--kanban-card', theme.vars.card);
  root.style.setProperty('--border', theme.vars.border);
  root.style.setProperty('--input', theme.vars.border);
  root.dataset.palette = themeId;
}

export function ThemePaletteToggle() {
  const [active, setActive] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return 'navy';
    return (localStorage.getItem(STORAGE_KEY) as ThemeId) || 'navy';
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      applyThemePalette(active);
    }
    localStorage.setItem(STORAGE_KEY, active);
  }, [active]);

  // Re-apply when dark mode toggles
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('dark')) {
        applyThemePalette(active);
      } else {
        // clear inline overrides so light theme tokens apply
        const root = document.documentElement;
        ['--background', '--kanban-bg', '--card', '--popover', '--kanban-column', '--kanban-card', '--border', '--input'].forEach(v => root.style.removeProperty(v));
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [active]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
          title="Tema visual"
        >
          <Palette className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Tema visual</p>
        <div className="space-y-0.5">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => { setActive(theme.id); setOpen(false); }}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/10 transition-colors text-left"
            >
              <span
                className="w-5 h-5 rounded-full border border-border shrink-0"
                style={{ backgroundColor: theme.preview }}
              />
              <span className="flex-1 text-sm text-foreground">{theme.name}</span>
              {active === theme.id && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
