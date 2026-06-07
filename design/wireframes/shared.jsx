// Shared wireframe primitives — sketchy boxes, scribbles, annotations, icons.
// All directions import from here via window globals.

const { useState, useEffect, useRef } = React;

// ── Sketchy SVG helpers ────────────────────────────────────────────────────
// A wobbly rect path generator — multiple points per side with slight jitter
// so strokes feel hand-drawn instead of CAD.
function wobblyRectPath(w, h, jitter = 1.4, seed = 1) {
  // Pseudo-random from seed (consistent across renders for a given seed)
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return (s / 233280) - 0.5;
  };
  const steps = 8;
  const pts = [];
  // top edge
  for (let i = 0; i <= steps; i++) pts.push([i * w / steps + rnd() * jitter, rnd() * jitter]);
  // right
  for (let i = 1; i <= steps; i++) pts.push([w + rnd() * jitter, i * h / steps + rnd() * jitter]);
  // bottom
  for (let i = 1; i <= steps; i++) pts.push([w - i * w / steps + rnd() * jitter, h + rnd() * jitter]);
  // left
  for (let i = 1; i < steps; i++) pts.push([rnd() * jitter, h - i * h / steps + rnd() * jitter]);
  return 'M ' + pts.map(p => p.join(',')).join(' L ') + ' Z';
}

// A sketchy box — fills the parent, the parent must be position:relative
function Sketch({ jitter = 1.4, seed = 1, stroke = 'currentColor', strokeWidth = 1.6, fill = 'transparent', radius = 0, dashed = false, doubleStroke = false, style = {} }) {
  const ref = useRef(null);
  const [d, setD] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => {
      const r = ref.current.getBoundingClientRect();
      setD({ w: r.width, h: r.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <svg ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', ...style }}>
      {d.w > 0 && (
        <>
          <path d={wobblyRectPath(d.w, d.h, jitter, seed)} stroke={stroke} strokeWidth={strokeWidth} fill={fill} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? '6 4' : undefined} />
          {doubleStroke && <path d={wobblyRectPath(d.w, d.h, jitter * 0.8, seed + 1)} stroke={stroke} strokeWidth={strokeWidth * 0.7} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" transform="translate(1.5,1.5)" />}
        </>
      )}
    </svg>
  );
}

// A sketchy underline — for headings
function SketchUnderline({ color = 'currentColor', strokeWidth = 2, seed = 1 }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => setW(ref.current.getBoundingClientRect().width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return (s / 233280) - 0.5; };
  const pts = [];
  for (let i = 0; i <= 12; i++) pts.push([i * w / 12, rnd() * 2]);
  return (
    <svg ref={ref} style={{ position: 'absolute', left: 0, right: 0, bottom: -6, width: '100%', height: 10, overflow: 'visible', pointerEvents: 'none' }}>
      {w > 0 && <path d={'M ' + pts.map(p => p.join(',')).join(' L ')} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />}
    </svg>
  );
}

// Sketchy circle (for icons, badges)
function SketchCircle({ size = 24, stroke = 'currentColor', strokeWidth = 1.6, fill = 'transparent', seed = 1, style = {} }) {
  let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return (s / 233280) - 0.5; };
  const pts = [];
  const r = size / 2 - 2;
  for (let i = 0; i <= 32; i++) {
    const ang = (i / 32) * Math.PI * 2;
    const rr = r + rnd() * 1.2;
    pts.push([size / 2 + Math.cos(ang) * rr, size / 2 + Math.sin(ang) * rr]);
  }
  return (
    <svg width={size} height={size} style={{ display: 'inline-block', flexShrink: 0, ...style }}>
      <path d={'M ' + pts.map(p => p.join(',')).join(' L ') + ' Z'} stroke={stroke} strokeWidth={strokeWidth} fill={fill} strokeLinejoin="round" />
    </svg>
  );
}

// Squiggly text line for placeholder body
function Squiggle({ width = 100, color = 'currentColor', strokeWidth = 1.4, seed = 1 }) {
  let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return (s / 233280) - 0.5; };
  const pts = [];
  for (let i = 0; i <= 20; i++) pts.push([i * width / 20, 4 + rnd() * 2.5]);
  return (
    <svg width={width} height={9} style={{ display: 'block' }}>
      <path d={'M ' + pts.map(p => p.join(',')).join(' L ')} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

// Placeholder text: stack of squiggle lines
function ScribbleLines({ lines = 3, width = 200, gap = 8, color = 'currentColor', strokeWidth = 1.4, lastShort = true, seedBase = 1 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Squiggle key={i} width={lastShort && i === lines - 1 ? width * 0.6 : width} color={color} strokeWidth={strokeWidth} seed={seedBase + i * 3} />
      ))}
    </div>
  );
}

// Annotation arrow + handwritten note — call out an element with a sketchy arrow.
function Annotation({ children, dir = 'right', style = {}, color = 'var(--accent)' }) {
  // dir: which side the arrow points FROM the note TO the target.
  // The note sits on the opposite side: dir=right means note is on the right with arrow pointing left.
  // For simplicity we just render the note + a little curve/arrow as decoration.
  return (
    <div className="annotation" data-dir={dir} style={{
      position: 'absolute',
      fontFamily: 'var(--font-hand)',
      fontSize: 14,
      color,
      lineHeight: 1.25,
      maxWidth: 180,
      transform: 'rotate(-2deg)',
      ...style
    }}>
      {children}
    </div>
  );
}

// Sketchy arrow — short curved line ending in arrow
function Arrow({ width = 60, height = 40, color = 'var(--accent)', style = {}, dir = 'down-right' }) {
  // we draw a simple curve in a viewbox
  const paths = {
    'down-right': 'M 4 4 C 20 8, 28 20, 50 32',
    'down-left': 'M 56 4 C 40 8, 32 20, 10 32',
    'up-right': 'M 4 36 C 20 32, 28 16, 50 8',
    'up-left': 'M 56 36 C 40 32, 32 16, 10 8',
    'right': 'M 4 20 C 20 16, 40 24, 50 20',
    'left': 'M 56 20 C 40 16, 20 24, 10 20',
    'down': 'M 30 4 C 26 14, 34 22, 30 36',
  };
  const heads = {
    'down-right': 'M 50 32 L 44 28 M 50 32 L 48 24',
    'down-left': 'M 10 32 L 16 28 M 10 32 L 12 24',
    'up-right': 'M 50 8 L 44 12 M 50 8 L 48 16',
    'up-left': 'M 10 8 L 16 12 M 10 8 L 12 16',
    'right': 'M 50 20 L 44 16 M 50 20 L 44 24',
    'left': 'M 10 20 L 16 16 M 10 20 L 16 24',
    'down': 'M 30 36 L 26 30 M 30 36 L 34 30',
  };
  return (
    <svg width={width} height={height} viewBox="0 0 60 40" style={{ overflow: 'visible', ...style }}>
      <path d={paths[dir]} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d={heads[dir]} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ── Wireframe widgets ──────────────────────────────────────────────────────
// Generic "button" — sketchy box + label
function WFButton({ children, primary = false, small = false, style = {}, jitter = 1.2, seed = 7 }) {
  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: small ? '4px 10px' : '8px 14px',
      fontFamily: 'var(--font-hand)',
      fontSize: small ? 13 : 15,
      color: primary ? 'var(--paper)' : 'var(--ink)',
      background: primary ? 'var(--ink)' : 'transparent',
      borderRadius: 6,
      whiteSpace: 'nowrap',
      ...style
    }}>
      <Sketch jitter={jitter} seed={seed} stroke={primary ? 'var(--ink)' : 'var(--ink)'} strokeWidth={1.5} />
      {children}
    </div>
  );
}

// "Pill" — for chips/categories
function WFPill({ children, dot, color, style = {}, seed = 3 }) {
  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      fontFamily: 'var(--font-hand)',
      fontSize: 13,
      color: 'var(--ink)',
      borderRadius: 999,
      ...style
    }}>
      <Sketch jitter={1} seed={seed} strokeWidth={1.3} />
      {dot && <span style={{ width: 8, height: 8, borderRadius: 999, background: color || 'var(--ink)', flexShrink: 0 }} />}
      {children}
    </div>
  );
}

// ── Text-style helpers (just inline styles for ergonomics) ────────────────
const T = {
  hand: { fontFamily: 'var(--font-hand)' },
  print: { fontFamily: 'var(--font-print)' },
  h1: { fontFamily: 'var(--font-marker)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1 },
  h2: { fontFamily: 'var(--font-marker)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.15 },
  h3: { fontFamily: 'var(--font-marker)', fontSize: 16, color: 'var(--ink)', lineHeight: 1.2 },
  label: { fontFamily: 'var(--font-hand)', fontSize: 13, color: 'var(--ink-soft)' },
  body: { fontFamily: 'var(--font-hand)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 },
  mono: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)' },
};

// ── Frame: each direction puts its screens inside this ─────────────────────
// Just a thin sketchy outer frame + corner pin annotation.
function Frame({ children, title, subtitle, style = {} }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: 'var(--paper)',
      overflow: 'hidden',
      display: 'flex',
      ...style
    }}>
      {children}
    </div>
  );
}

// ── Bar chart placeholder ─────────────────────────────────────────────────
function BarRow({ label, value, max, color = 'var(--ink)', width = 200, seed = 1 }) {
  const w = (value / max) * width;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ ...T.body, width: 110, flexShrink: 0 }}>{label}</div>
      <div style={{ position: 'relative', width, height: 16 }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
          <Sketch jitter={0.6} seed={seed} strokeWidth={1.2} />
        </div>
        <div style={{ position: 'relative', width: w, height: '100%' }}>
          <Sketch jitter={0.6} seed={seed + 1} strokeWidth={1.4} fill={color} stroke={color} />
        </div>
      </div>
      <div style={{ ...T.mono, fontSize: 12, width: 60, textAlign: 'right' }}>R {value.toLocaleString()}</div>
    </div>
  );
}

// ── Sample data ───────────────────────────────────────────────────────────
const SAMPLE_TXNS = [
  { date: 'May 03', desc: 'WOOLWORTHS GARDENS', amount: -842.50 },
  { date: 'May 04', desc: 'UBER TRIP HELP.UBER.COM', amount: -127.00 },
  { date: 'May 05', desc: 'NETFLIX.COM 0277014', amount: -199.00 },
  { date: 'May 06', desc: 'CHECKERS HYPER', amount: -1240.75 },
  { date: 'May 06', desc: 'SALARY DEPOSIT', amount: 32500.00 },
  { date: 'May 07', desc: 'CITY OF CT ELECTRICITY', amount: -1450.00 },
  { date: 'May 07', desc: 'SHELL ULTRA CITY N1', amount: -650.00 },
  { date: 'May 08', desc: 'DISCOVERY HEALTH', amount: -3450.00 },
];

const SAMPLE_CATS = [
  { name: 'Groceries', color: '#7c9c7c', total: 6240, count: 12, mom: -8 },
  { name: 'Transport', color: '#c98a5a', total: 2180, count: 8, mom: 14 },
  { name: 'Bills', color: '#7c8ac9', total: 4900, count: 4, mom: 0 },
  { name: 'Dining', color: '#c97c7c', total: 1840, count: 11, mom: 22 },
  { name: 'Shopping', color: '#b07cc9', total: 980, count: 5, mom: -45 },
  { name: 'Health', color: '#5ab0c9', total: 3450, count: 2, mom: 0 },
  { name: 'Subs', color: '#c9b07c', total: 540, count: 3, mom: 0 },
  { name: 'Other', color: '#999', total: 320, count: 4, mom: 0 },
];

// Export everything
Object.assign(window, {
  Sketch, SketchUnderline, SketchCircle, Squiggle, ScribbleLines,
  Annotation, Arrow, WFButton, WFPill, Frame, BarRow,
  T, SAMPLE_TXNS, SAMPLE_CATS,
});
