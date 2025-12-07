import { useTheme } from '../../state/useTheme';

type Props = { allowed?: boolean };

export function ThemeControls({ allowed = false }: Props) {
  if (!allowed) return null;

  const { primary, secondary, background, setTheme } = useTheme();

  const apply = (label: string, value: string) => {
    setTheme({ [label]: value } as any);
    document.documentElement.style.setProperty(`--${label}`, value);
  };

  return (
    <div className="surface" style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <span>Primary</span>
        <input
          type="color"
          value={primary}
          onChange={(e) => apply('accent', e.target.value)}
          style={colorStyle}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <span>Secondary</span>
        <input
          type="color"
          value={secondary}
          onChange={(e) => apply('accent-2', e.target.value)}
          style={colorStyle}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <span>Background</span>
        <input
          type="color"
          value={background}
          onChange={(e) => apply('bg', e.target.value)}
          style={colorStyle}
        />
      </div>
    </div>
  );
}

const colorStyle: React.CSSProperties = {
  width: 52,
  height: 32,
  padding: 0,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'rgba(255,255,255,0.06)',
  cursor: 'pointer',
};
