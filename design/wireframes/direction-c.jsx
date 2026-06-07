// Direction C — "Spend-first"
// The home page is Spend. Categorize is a dedicated route you visit when the
// sidebar badge says you have pending txns. The spend view is laid out as a
// grid of small summary cards (most spent, biggest single txn, trending,
// remaining-to-categorize, etc.) on top of the hero number.

const SidebarC = ({ active = 'spend' }) => {
  const items = [
    { key: 'spend', glyph: '∑', label: 'Spend' },
    { key: 'inbox', glyph: '⟳', label: 'Categorize', badge: 23 },
    { key: 'cats', glyph: '#', label: 'Categories' },
  ];
  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: 'var(--ink)',
      color: 'var(--paper)',
      padding: '22px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ ...T.h2, fontSize: 22, color: 'var(--paper)' }}>
        spend.<span style={{ color: 'var(--accent)' }}>.</span>
      </div>
      <div style={{ ...T.label, color: 'var(--paper)', opacity: 0.5, marginTop: 8 }}>self-hosted</div>

      <div style={{ position: 'relative', marginTop: 8 }}>
        <div style={{
          position: 'relative',
          display: 'inline-flex',
          gap: 6,
          padding: '8px 12px',
          background: 'var(--paper)',
          color: 'var(--ink)',
          ...T.body,
        }}>
          <Sketch jitter={1} seed={500} strokeWidth={1.4} stroke="var(--paper)" />
          <span style={{ position: 'relative' }}>↑ Upload CSV</span>
        </div>
      </div>

      <div style={{ ...T.label, color: 'var(--paper)', opacity: 0.5, marginTop: 12 }}>NAVIGATE</div>
      {items.map(it => (
        <div key={it.key} style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px',
          ...T.body,
          color: active === it.key ? 'var(--paper)' : 'rgba(255,255,255,0.55)',
          fontWeight: active === it.key ? 700 : 400,
        }}>
          {active === it.key && (
            <span style={{ position: 'absolute', left: -16, top: 0, bottom: 0, width: 3, background: 'var(--accent)' }} />
          )}
          <span style={{ fontFamily: 'var(--font-marker)', fontSize: 16, width: 18 }}>{it.glyph}</span>
          <span style={{ flex: 1 }}>{it.label}</span>
          {it.badge && (
            <span style={{ ...T.mono, fontSize: 11, color: 'var(--ink)', background: 'var(--accent)', padding: '1px 6px', borderRadius: 10 }}>{it.badge}</span>
          )}
        </div>
      ))}

      <div style={{ flex: 1 }} />
      <div style={{ ...T.mono, fontSize: 11, opacity: 0.4 }}>v0.3 · local-only</div>
    </div>
  );
};

// ── Spend: dashboard home ──────────────────────────────────────────────────
const C_Spend = () => {
  const max = Math.max(...SAMPLE_CATS.map(c => c.total));
  return (
    <Frame>
      <SidebarC active="spend" />
      <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ ...T.h1 }}>Hi.</div>
            <div style={{ ...T.label, marginTop: 4 }}>here's the damage for May 2026.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <WFPill seed={510}>● This month</WFPill>
            <WFPill seed={511}>vs April</WFPill>
            <WFPill seed={512}>≡ filters</WFPill>
          </div>
        </div>

        {/* Big hero metric + delta */}
        <div style={{ position: 'relative', padding: '20px 24px', background: 'var(--paper-soft)', display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          <Sketch jitter={1.3} seed={520} strokeWidth={1.8} />
          <div style={{ position: 'relative' }}>
            <div style={{ ...T.label }}>total spent</div>
            <div style={{ fontFamily: 'var(--font-marker)', fontSize: 80, lineHeight: 0.95, color: 'var(--ink)' }}>R 20,450</div>
          </div>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            <div style={{ ...T.label }}>vs. April</div>
            <div style={{ ...T.h2, color: 'var(--accent)' }}>↓ R 1,240</div>
            <div style={{ ...T.mono }}>6% under last month</div>
          </div>
          <div style={{ position: 'relative', flex: 1, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <svg viewBox="0 0 200 60" preserveAspectRatio="none" style={{ width: '100%', height: 60 }}>
              {/* dashed reference line */}
              <line x1="0" y1="22" x2="200" y2="22" stroke="var(--ink-soft)" strokeDasharray="3 3" strokeWidth="1" />
              <path d="M 0 44 C 20 36, 40 50, 60 32 C 80 18, 100 40, 120 24 C 140 12, 160 34, 180 18 L 200 14" stroke="var(--ink)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <circle cx="200" cy="14" r="3.5" fill="var(--accent)" />
            </svg>
            <div style={{ ...T.mono, fontSize: 10, display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span>
            </div>
          </div>
        </div>

        {/* Summary cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Biggest', value: 'R 3,450', sub: 'Discovery Health · 8 May' },
            { label: 'Trending up', value: 'Dining', sub: '+22% vs Apr', accent: true },
            { label: 'Most txns', value: 'Groceries', sub: '12 this month' },
            { label: 'To categorize', value: '23', sub: 'pending in inbox', accent: true },
          ].map((c, i) => (
            <div key={i} style={{ position: 'relative', padding: '14px 16px' }}>
              <Sketch jitter={0.9} seed={530 + i} strokeWidth={1.4} fill="var(--paper)" />
              <div style={{ position: 'relative', ...T.label }}>{c.label}</div>
              <div style={{ position: 'relative', ...T.h2, marginTop: 6, color: c.accent ? 'var(--accent)' : 'var(--ink)' }}>{c.value}</div>
              <div style={{ position: 'relative', ...T.mono, fontSize: 11, marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Categories breakdown + biggest txns split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
          <div style={{ position: 'relative', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
            <Sketch jitter={0.9} seed={550} strokeWidth={1.4} />
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ ...T.h3 }}>By category</div>
              <div style={{ ...T.mono }}>most → least</div>
            </div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SAMPLE_CATS.slice(0, 6).map((c, i) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: c.color }} />
                  <span style={{ ...T.body, width: 90 }}>{c.name}</span>
                  <div style={{ position: 'relative', flex: 1, height: 14 }}>
                    <div style={{ position: 'relative', width: (c.total / max * 100) + '%', height: '100%' }}>
                      <Sketch jitter={0.5} seed={560 + i} strokeWidth={1.2} fill={c.color} stroke={c.color} />
                    </div>
                  </div>
                  <span style={{ ...T.mono, width: 70, textAlign: 'right' }}>R {c.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
            <Sketch jitter={0.9} seed={580} strokeWidth={1.4} />
            <div style={{ position: 'relative', ...T.h3, marginBottom: 8 }}>Biggest this month</div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {SAMPLE_TXNS.filter(t => t.amount < 0).slice(0, 5).map((t, i) => (
                <div key={i} style={{ padding: '6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--ink-soft)' }}>
                  <div>
                    <div style={{ ...T.body, fontSize: 13 }}>{t.desc.slice(0, 22)}</div>
                    <div style={{ ...T.mono, fontSize: 10 }}>{t.date}</div>
                  </div>
                  <div style={{ ...T.mono }}>R {Math.abs(t.amount).toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Annotation style={{ top: 130, right: 30, transform: 'rotate(3deg)' }}>
          home page = spend.<br />categorize lives in a tab<br />with a pending badge
        </Annotation>
      </div>
    </Frame>
  );
};

// ── Categorize: list-style with one row "focused" ─────────────────────────
const C_Categorize = () => {
  const cats = SAMPLE_CATS.slice(0, 8);
  return (
    <Frame>
      <SidebarC active="inbox" />
      <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ ...T.h1 }}>23 to categorize</div>
            <div style={{ ...T.label, marginTop: 4 }}>j/k moves the focus · 1–8 assigns the focused row</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <WFPill seed={600}>filter: all</WFPill>
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '6px 18px',
          ...T.label,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontSize: 11,
          color: 'var(--ink-soft)',
          borderBottom: '1.5px solid var(--ink-soft)',
        }}>
          <span style={{ width: 50, cursor: 'pointer' }}>Date ↓</span>
          <span style={{ flex: 1, cursor: 'pointer' }}>Description</span>
          <span style={{ width: 90, textAlign: 'right', cursor: 'pointer' }}>Amount</span>
          <span style={{ ...T.mono, fontSize: 11, color: 'var(--ink-soft)' }}>Status</span>
        </div>

        {/* The list — focus on row 3 */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SAMPLE_TXNS.map((t, i) => {
            const focused = i === 2;
            return (
              <div key={i} style={{
                position: 'relative',
                padding: focused ? '14px 18px' : '8px 18px',
                display: 'flex', alignItems: 'center', gap: 16,
                background: focused ? 'var(--accent-soft)' : 'transparent',
                borderBottom: '1px dashed var(--ink-soft)',
              }}>
                {focused && <Sketch jitter={0.9} seed={610} strokeWidth={1.6} />}
                <span style={{ position: 'relative', ...T.mono, width: 50, color: 'var(--ink-soft)' }}>{t.date}</span>
                <span style={{ position: 'relative', ...T.body, flex: 1, fontWeight: focused ? 600 : 400 }}>{t.desc}</span>
                <span style={{ position: 'relative', ...T.mono, width: 90, textAlign: 'right', color: t.amount < 0 ? 'var(--ink)' : '#5a9c5a' }}>
                  {t.amount < 0 ? '−' : '+'}R {Math.abs(t.amount).toFixed(2)}
                </span>
                {focused ? (
                  <span style={{ position: 'relative', ...T.mono, color: 'var(--accent)' }}>← assign below</span>
                ) : (
                  <span style={{ position: 'relative', ...T.mono, color: 'var(--ink-soft)' }}>uncat.</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Sticky chip rail */}
        <div style={{ position: 'relative', padding: '12px 16px', background: 'var(--paper)' }}>
          <Sketch jitter={1.1} seed={650} strokeWidth={1.6} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...T.label }}>assign focused row to:</span>
            {cats.map((c, i) => (
              <div key={c.name} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', ...T.body }}>
                <Sketch jitter={0.6} seed={660 + i} strokeWidth={1.3} />
                <span style={{ position: 'relative', ...T.mono, color: 'var(--accent)', fontWeight: 700 }}>{i + 1}</span>
                <span style={{ position: 'relative', width: 8, height: 8, borderRadius: 999, background: c.color }} />
                <span style={{ position: 'relative' }}>{c.name}</span>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <WFButton small seed={680}>+ new</WFButton>
          </div>
        </div>
      </div>
    </Frame>
  );
};

// ── Categories drawer (slides in from the right, opens from any page) ─────
const C_CategoriesDrawer = () => {
  return (
    <Frame>
      <SidebarC active="cats" />
      <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, opacity: 0.35 }}>
        <div style={{ ...T.h1 }}>Spend</div>
        <div style={{ ...T.body }}>(background screen — drawer is open over the top)</div>
      </div>
      {/* scrim */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,15,0.35)' }} />
      {/* drawer */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 400, background: 'var(--paper)', display: 'flex', flexDirection: 'column', borderLeft: '1.5px solid var(--ink)', padding: '24px 24px', gap: 14, boxShadow: '-12px 0 30px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...T.h2 }}>Categories</div>
          <div style={{ ...T.mono, fontSize: 14, cursor: 'pointer' }}>✕</div>
        </div>
        <div style={{ ...T.label }}>8 buckets · drag to reorder · the order is the keyboard shortcut</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'hidden' }}>
          {SAMPLE_CATS.map((c, i) => (
            <div key={c.name} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
              <Sketch jitter={0.6} seed={700 + i} strokeWidth={1.2} fill="var(--paper-soft)" />
              <span style={{ position: 'relative', ...T.mono, color: 'var(--ink-soft)' }}>⋮⋮</span>
              <span style={{ position: 'relative', ...T.mono, color: 'var(--accent)', fontWeight: 700, width: 14 }}>{i + 1}</span>
              <span style={{ position: 'relative', width: 10, height: 10, borderRadius: 999, background: c.color }} />
              <span style={{ position: 'relative', ...T.body, flex: 1 }}>{c.name}</span>
              <span style={{ position: 'relative', ...T.mono, color: 'var(--ink-soft)' }}>{c.count}</span>
              <span style={{ position: 'relative', ...T.mono, opacity: 0.4, cursor: 'pointer' }} title="edit">✎</span>
              <span style={{ position: 'relative', ...T.mono, opacity: 0.4, cursor: 'pointer', color: '#c25a4a' }} title="delete">×</span>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px' }}>
          <div style={{ position: 'relative', flex: 1, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sketch jitter={0.8} seed={760} strokeWidth={1.4} dashed />
            <span style={{ position: 'relative', ...T.mono, color: 'var(--accent)', fontWeight: 700, width: 14 }}>9</span>
            <span style={{ position: 'relative', width: 10, height: 10, borderRadius: 999, background: 'var(--ink-soft)', opacity: 0.4 }} />
            <span style={{ position: 'relative', ...T.body, flex: 1, color: 'var(--ink-soft)', fontStyle: 'italic' }}>new category name…</span>
          </div>
          <div style={{ position: 'relative' }}>
            <WFButton primary small seed={762}>+ add</WFButton>
          </div>
        </div>

        <Annotation style={{ top: 12, left: -170, transform: 'rotate(-4deg)' }}>
          opens from ANY page<br />— sidebar button or ⌘K
          <Arrow dir="right" style={{ position: 'absolute', top: 14, left: 130 }} />
        </Annotation>
      </div>
    </Frame>
  );
};

Object.assign(window, { C_Spend, C_Categorize, C_CategoriesDrawer });
