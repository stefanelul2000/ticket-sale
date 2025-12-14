const normalizeHex = (hex: string) => {
  if (!hex) return '#000000';
  let value = hex.trim().replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  return `#${value.slice(0, 6)}`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = normalizeHex(hex);
  const intVal = parseInt(normalized.replace('#', ''), 16);
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return [r, g, b];
};

export const withAlpha = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const mixWithWhite = (hex: string, weight: number) => {
  const [r, g, b] = hexToRgb(hex);
  const w = Math.max(0, Math.min(1, weight));
  const mix = (channel: number) => Math.round(channel + (255 - channel) * w);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};
