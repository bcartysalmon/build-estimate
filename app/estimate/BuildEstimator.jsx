'use client';

/**
 * BuildEstimator.jsx
 * Implements the design system from Build Estimator Flow.html
 *
 * Colors:  blue #2756FF · orange #FF6A2C · ink #0E1220 · paper #F7F6F2
 * Type:    SF system font stack (iOS native feel)
 * Drop in: app/estimate/page.jsx
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Design tokens (exact from design file) ───────────────────────────────────
const C = {
    blue: '#2756FF',
    blueDark: '#1B3FCC',
    blueSoft: '#EAF0FF',
    orange: '#FF6A2C',
    orangeSoft: '#FFEEE3',
    ink: '#0E1220',
    ink2: '#5A6075',
    ink3: '#9097A8',
    hair: '#E7E6E0',
    paper: '#F7F6F2',
    white: '#FFFFFF',
    emerald: '#10B981',
    purple: '#8B5CF6',
    amber: '#F59E0B',
};

const F = {
    body: '-apple-system, "SF Pro Text", system-ui, sans-serif',
    display: '-apple-system, "SF Pro Display", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, monospace',
};

// ─── Cost model ───────────────────────────────────────────────────────────────
const ROOM_COSTS = {
    kitchen: [28000, 38000],
    living: [9000, 14000],
    masterBed: [13000, 19000],
    bathroom: [16000, 24000],
    bed2: [9000, 14000],
    ensuite: [14000, 20000],
    laundry: [6000, 9000],
    alfresco: [12000, 18000],
    garage: [14000, 20000],
};

const FINISH_MULT = { basic: 1, standard: 1.4, premium: 1.9, luxury: 2.7 };

const ROOM_LABELS = {
    kitchen: 'Kitchen', living: 'Living area', masterBed: 'Master bed',
    bathroom: 'Bathroom', bed2: 'Bedroom 2', ensuite: 'Ensuite',
    laundry: 'Laundry', alfresco: 'Alfresco', garage: 'Garage',
};

const PROJECT_TYPES = [
    { id: 'full', label: 'Full Reno', sample: 'WHOLE HOME', icon: 'house' },
    { id: 'kitchen', label: 'Kitchen & Bath', sample: 'KEY ROOMS', icon: 'kitchen' },
    { id: 'extension', label: 'Extension', sample: 'NEW SQ M', icon: 'plus' },
    { id: 'newbuild', label: 'New Build', sample: 'START FRESH', icon: 'build' },
];

const FINISH_LEVELS = [
    { id: 'basic', label: 'Basic', mult: '1×' },
    { id: 'standard', label: 'Standard', mult: '1.4×' },
    { id: 'premium', label: 'Premium', mult: '1.9×' },
    { id: 'luxury', label: 'Luxury', mult: '2.7×' },
];

function calcEstimate(rooms, finish) {
    const m = FINISH_MULT[finish] || 1;
    let lo = 12000, hi = 18000;
    rooms.forEach(r => { const [l, h] = ROOM_COSTS[r] || [0, 0]; lo += l; hi += h; });
    return [Math.round(lo * m), Math.round(hi * m)];
}

function fmt(n) {
    return n >= 1000000 ? `$${(n / 1e6).toFixed(1)}m` : `$${Math.round(n / 1000)}k`;
}
function fmtFull(n) { return '$' + n.toLocaleString('en-AU'); }

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target, dur = 900) {
    const [val, setVal] = useState(0);
    const prev = useRef(0);
    const raf = useRef(null);
    useEffect(() => {
        const from = prev.current;
        let start = null;
        const tick = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / dur, 1);
            const e = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(from + (target - from) * e));
            if (p < 1) raf.current = requestAnimationFrame(tick);
            else prev.current = target;
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [target]); // eslint-disable-line
    return val;
}

// ─── Global animation styles ──────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes countPulse { 0%,100% { color: #10B981; } 50% { color: #0ea272; } }
  .be-screen { animation: slideUp 0.28s cubic-bezier(0.22,1,0.36,1); }
  .be-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .be-root { min-height: 100vh; background: ${C.paper}; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 0; }
  .be-phone { width: 100%; max-width: 390px; min-height: 100vh; display: flex; flex-direction: column; }
`;

// ─── Shared components ────────────────────────────────────────────────────────

function StatusBar({ dark = false }) {
    const c = dark ? '#fff' : C.ink;
    return (
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px 0', gap: 0, position: 'relative', zIndex: 20 }}>
            <span style={{ fontFamily: F.display, fontWeight: 590, fontSize: 17, color: c, flex: 1 }}>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* signal */}
                <svg width="18" height="12" viewBox="0 0 18 12">
                    <rect x="0" y="8" width="3" height="4" rx="0.7" fill={c} opacity="0.35" />
                    <rect x="4.5" y="5" width="3" height="7" rx="0.7" fill={c} opacity="0.6" />
                    <rect x="9" y="2.5" width="3" height="9.5" rx="0.7" fill={c} opacity="0.8" />
                    <rect x="13.5" y="0" width="3" height="12" rx="0.7" fill={c} />
                </svg>
                {/* wifi */}
                <svg width="16" height="12" viewBox="0 0 16 12">
                    <path d="M8 9.5C8.8 9.5 9.5 10.2 9.5 11S8.8 12.5 8 12.5 6.5 11.8 6.5 11 7.2 9.5 8 9.5Z" fill={c} />
                    <path d="M8 6.5C9.6 6.5 11 7.1 12.1 8.1L13.2 7C11.8 5.7 10 4.9 8 4.9S4.2 5.7 2.8 7L3.9 8.1C5 7.1 6.4 6.5 8 6.5Z" fill={c} opacity="0.6" />
                    <path d="M8 3.5C10.5 3.5 12.7 4.5 14.3 6.1L15.4 5C13.5 3.1 11 2 8 2S2.5 3.1 0.6 5L1.7 6.1C3.3 4.5 5.5 3.5 8 3.5Z" fill={c} opacity="0.35" />
                </svg>
                {/* battery */}
                <svg width="25" height="12" viewBox="0 0 25 12">
                    <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke={c} strokeOpacity="0.35" fill="none" />
                    <rect x="2" y="2" width="17" height="8" rx="2" fill={c} />
                    <path d="M23 4V8C23.8 7.7 24.5 6.9 24.5 6S23.8 4.3 23 4Z" fill={c} opacity="0.4" />
                </svg>
            </div>
        </div>
    );
}

function HomeBar({ dark = false }) {
    return (
        <div style={{ height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 8 }}>
            <div style={{ width: 139, height: 5, borderRadius: 100, background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.2)' }} />
        </div>
    );
}

function BackBtn({ onBack }) {
    return (
        <div onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 12, background: C.white,
            border: `1px solid ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
        }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 1L3 7l6 6" stroke={C.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
}

function StepDots({ idx, total = 4 }) {
    return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} style={{
                    width: i === idx ? 22 : 6, height: 6, borderRadius: 3,
                    background: i === idx ? C.blue : C.hair,
                    transition: 'all 0.2s',
                }} />
            ))}
        </div>
    );
}

function PrimaryBtn({ children, color = C.blue, onClick, disabled = false }) {
    return (
        <div onClick={!disabled ? onClick : undefined} style={{
            height: 56, borderRadius: 16, background: disabled ? C.hair : color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: disabled ? C.ink3 : '#fff',
            fontFamily: F.display, fontSize: 17, fontWeight: 600, letterSpacing: -0.2,
            boxShadow: disabled ? 'none' : `0 6px 18px ${color}38`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            userSelect: 'none',
        }}>{children}</div>
    );
}

function GhostBtn({ children, onClick }) {
    return (
        <div onClick={onClick} style={{
            height: 56, borderRadius: 16, background: 'transparent',
            border: `1.5px solid ${C.hair}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.ink, fontFamily: F.display, fontSize: 17, fontWeight: 600,
            cursor: 'pointer', userSelect: 'none',
        }}>{children}</div>
    );
}

function SectionLabel({ children }) {
    return (
        <div style={{
            fontFamily: F.body, fontSize: 13, color: C.ink2,
            textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600,
            marginBottom: 10, paddingLeft: 4,
        }}>{children}</div>
    );
}

// Progress strip at top of screen
function ProgressStrip({ step, total }) {
    return (
        <div style={{ height: 3, background: C.hair }}>
            <div style={{
                height: '100%', background: C.blue,
                width: `${(step / total) * 100}%`,
                borderRadius: '0 2px 2px 0',
                transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
        </div>
    );
}

// ─── Icon components ──────────────────────────────────────────────────────────
const Icons = {
    house: (color = C.ink) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 11l9-7 9 7v10H3z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            <path d="M10 22v-7h4v7" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        </svg>
    ),
    kitchen: (color = C.ink) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="10" width="18" height="11" stroke={color} strokeWidth="2" />
            <path d="M3 14h18M9 10V5h6v5" stroke={color} strokeWidth="2" />
        </svg>
    ),
    plus: (color = C.ink) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    ),
    build: (color = C.ink) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 22V10l8-6 8 6v12" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            <rect x="9" y="15" width="6" height="7" stroke={color} strokeWidth="2" />
        </svg>
    ),
    check: () => (
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4.5L4 7.5L10 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
};

// ─── Screen 1 — Welcome ───────────────────────────────────────────────────────
function Welcome({ onStart }) {
    return (
        <div className="be-screen" style={{ background: C.white, height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <StatusBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px 0' }}>
                {/* Logo mark */}
                <div style={{
                    width: 56, height: 56, borderRadius: 16, background: C.blue,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 8, boxShadow: `0 8px 24px ${C.blue}30`,
                }}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <path d="M4 22V10l10-6 10 6v12" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
                        <path d="M10 22v-7h8v7" stroke={C.orange} strokeWidth="2.4" strokeLinejoin="round" />
                    </svg>
                </div>

                <div style={{ marginTop: 'auto', marginBottom: 28 }}>
                    <div style={{
                        fontFamily: F.display, fontSize: 44, lineHeight: '46px',
                        fontWeight: 700, letterSpacing: -1.2, color: C.ink,
                    }}>
                        Estimate<br />
                        <span style={{ color: C.orange }}>any build</span><br />
                        in minutes.
                    </div>
                    <div style={{
                        marginTop: 18, fontFamily: F.body, fontSize: 17,
                        lineHeight: '24px', color: C.ink2, letterSpacing: -0.2, maxWidth: 300,
                    }}>
                        Answer a few questions about your project and get a contractor-grade cost breakdown instantly.
                    </div>

                    {/* Trust pills */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
                        {['2,400+ Australian builds', 'Instant · No waiting', '$29 full report'].map(t => (
                            <div key={t} style={{
                                padding: '6px 12px', background: C.paper,
                                borderRadius: 100, fontFamily: F.mono, fontSize: 11,
                                color: C.ink2, letterSpacing: 0.3, fontWeight: 500,
                                border: `1px solid ${C.hair}`,
                            }}>{t}</div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 14 }}>
                    <PrimaryBtn color={C.blue} onClick={onStart}>Start a free estimate</PrimaryBtn>
                    <div style={{
                        textAlign: 'center', fontFamily: F.body, fontSize: 15,
                        color: C.ink2, padding: '8px 0',
                    }}>
                        Already have an estimate? <span style={{ color: C.blue, fontWeight: 600 }}>Sign in</span>
                    </div>
                </div>
            </div>
            <HomeBar />
        </div>
    );
}

// ─── Screen 2 — Project type ──────────────────────────────────────────────────
function TypeCard({ id, label, sample, icon, selected, onClick }) {
    const iconEl = Icons[icon];
    return (
        <div onClick={onClick} style={{
            flex: 1, aspectRatio: '1 / 1.05',
            background: selected ? C.ink : C.white,
            borderRadius: 22, padding: 16,
            border: selected ? 'none' : `1px solid ${C.hair}`,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            cursor: 'pointer', userSelect: 'none',
            transition: 'all 0.15s',
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: selected ? C.orange : C.paper,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {iconEl && iconEl(selected ? '#fff' : C.ink)}
            </div>
            <div>
                <div style={{
                    fontFamily: F.display, fontSize: 17, fontWeight: 600,
                    color: selected ? '#fff' : C.ink, letterSpacing: -0.3,
                }}>{label}</div>
                <div style={{
                    fontFamily: F.mono, fontSize: 11, marginTop: 4,
                    color: selected ? 'rgba(255,255,255,0.55)' : C.ink3,
                    letterSpacing: 0.3, textTransform: 'uppercase',
                }}>{sample}</div>
            </div>
        </div>
    );
}

function PickType({ data, onChange, onContinue, onBack }) {
    return (
        <div className="be-screen" style={{ background: C.paper, height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <StatusBar />
            <ProgressStrip step={1} total={4} />
            <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <BackBtn onBack={onBack} />
                <StepDots idx={0} total={4} />
                <div style={{ width: 36 }} />
            </div>

            <div style={{ flex: 1, padding: '32px 24px 0' }}>
                <div style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, letterSpacing: -0.8, color: C.ink, lineHeight: '34px' }}>
                    What are we<br />building?
                </div>
                <div style={{ fontFamily: F.body, fontSize: 15, color: C.ink2, marginTop: 8, letterSpacing: -0.1 }}>
                    Pick the closest match. Refine the details next.
                </div>

                <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {PROJECT_TYPES.slice(0, 2).map(p => (
                            <TypeCard key={p.id} {...p}
                                selected={data.projectType === p.id}
                                onClick={() => onChange({ projectType: p.id })}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {PROJECT_TYPES.slice(2, 4).map(p => (
                            <TypeCard key={p.id} {...p}
                                selected={data.projectType === p.id}
                                onClick={() => onChange({ projectType: p.id })}
                            />
                        ))}
                    </div>
                </div>

                {/* Something else row */}
                <div style={{
                    marginTop: 20, padding: '14px 16px',
                    background: C.white, border: `1px solid ${C.hair}`,
                    borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: 8, background: C.blueSoft,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {Icons.plus(C.blue)}
                        </div>
                        <div style={{ fontFamily: F.body, fontSize: 15, color: C.ink, fontWeight: 500 }}>Something else</div>
                    </div>
                    <svg width="10" height="13" viewBox="0 0 10 13" fill="none">
                        <path d="M1.5 1.5L7 6.5l-5.5 5" stroke={C.ink3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            <div style={{ padding: '0 24px 14px' }}>
                <PrimaryBtn color={C.blue} onClick={onContinue} disabled={!data.projectType}>Continue</PrimaryBtn>
            </div>
            <HomeBar />
        </div>
    );
}

// ─── Screen 3 — Scope & rooms + finish ───────────────────────────────────────
function Chip({ label, selected, color = C.blue, onClick }) {
    return (
        <div onClick={onClick} style={{
            padding: '10px 16px', borderRadius: 100,
            background: selected ? color : C.white,
            color: selected ? '#fff' : C.ink,
            border: selected ? 'none' : `1px solid ${C.hair}`,
            fontFamily: F.body, fontSize: 14, fontWeight: 500,
            letterSpacing: -0.1, whiteSpace: 'nowrap',
            cursor: 'pointer', userSelect: 'none', transition: 'all 0.12s',
        }}>{label}</div>
    );
}

function ScopeStep({ data, onChange, onContinue, onBack }) {
    const toggleRoom = (id) => {
        const curr = data.rooms || [];
        onChange({ rooms: curr.includes(id) ? curr.filter(r => r !== id) : [...curr, id] });
    };

    const rooms = data.rooms || [];
    const [lo, hi] = calcEstimate(rooms, data.finish || 'standard');
    const animLo = useCountUp(lo, 600);
    const animHi = useCountUp(hi, 600);

    return (
        <div className="be-screen" style={{ background: C.paper, height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <StatusBar />
            <ProgressStrip step={2} total={4} />
            <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <BackBtn onBack={onBack} />
                <StepDots idx={1} total={4} />
                <div style={{ width: 36 }} />
            </div>

            <div style={{ flex: 1, padding: '28px 24px 0', overflowY: 'auto' }}>
                <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, letterSpacing: -0.7, color: C.ink, lineHeight: '32px' }}>
                    Tell us about<br />your project.
                </div>

                {/* Rooms */}
                <div style={{ marginTop: 24 }}>
                    <SectionLabel>Rooms included</SectionLabel>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.entries(ROOM_LABELS).map(([id, label]) => (
                            <Chip key={id} label={label}
                                selected={rooms.includes(id)}
                                color={C.blue}
                                onClick={() => toggleRoom(id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Finish level */}
                <div style={{ marginTop: 22 }}>
                    <SectionLabel>Finish level</SectionLabel>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {FINISH_LEVELS.map(f => (
                            <Chip key={f.id} label={`${f.label} ${f.mult}`}
                                selected={data.finish === f.id}
                                color={C.orange}
                                onClick={() => onChange({ finish: f.id })}
                            />
                        ))}
                    </div>
                </div>

                {/* Running estimate */}
                {rooms.length > 0 && (
                    <div style={{
                        marginTop: 22, padding: '16px 18px',
                        background: C.white, border: `1px solid ${C.hair}`,
                        borderRadius: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div>
                            <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Running estimate</div>
                            <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink3, marginTop: 2 }}>{rooms.length} room{rooms.length !== 1 ? 's' : ''} · {FINISH_LEVELS.find(f => f.id === data.finish)?.label} finish</div>
                        </div>
                        <div style={{ fontFamily: F.mono, fontSize: 20, fontWeight: 600, color: C.emerald, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(animLo)}–{fmt(animHi)}
                        </div>
                    </div>
                )}

                <div style={{ height: 16 }} />
            </div>

            <div style={{ padding: '0 24px 14px', background: C.paper }}>
                <PrimaryBtn color={C.blue} onClick={onContinue} disabled={rooms.length === 0}>
                    Continue with {rooms.length} room{rooms.length !== 1 ? 's' : ''}
                </PrimaryBtn>
            </div>
            <HomeBar />
        </div>
    );
}

// ─── Screen 4 — Address ───────────────────────────────────────────────────────
function AddressStep({ data, onChange, onContinue, onBack }) {
    const [query, setQuery] = useState(data.address || '');
    const [prefilled, setPrefilled] = useState(!!data.propertyData);

    const simulatePrefill = () => {
        // TODO: Replace with CoreLogic / PropTrack API call
        onChange({
            address: query,
            propertyData: { landArea: '380 m²', yearBuilt: '1965', dwelling: 'Terrace', storeys: '2' },
        });
        setPrefilled(true);
    };

    const timelines = ['ASAP', 'In 1–3 months', 'In 3–6 months', 'Just researching'];

    return (
        <div className="be-screen" style={{ background: C.paper, height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <StatusBar />
            <ProgressStrip step={3} total={4} />
            <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <BackBtn onBack={onBack} />
                <StepDots idx={2} total={4} />
                <div style={{ width: 36 }} />
            </div>

            <div style={{ flex: 1, padding: '28px 24px 0', overflowY: 'auto' }}>
                <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, letterSpacing: -0.7, color: C.ink, lineHeight: '32px' }}>
                    Where & when?
                </div>
                <div style={{ fontFamily: F.body, fontSize: 15, color: C.ink2, marginTop: 8, letterSpacing: -0.1 }}>
                    Local rates and council rules adjust your estimate.
                </div>

                {/* Address input */}
                <div style={{ marginTop: 24 }}>
                    <SectionLabel>Property address</SectionLabel>
                    <div style={{
                        height: 56, padding: '0 18px', background: C.white,
                        border: `1.5px solid ${query.length > 4 ? C.blue : C.hair}`,
                        borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'border-color 0.15s',
                    }}>
                        <input
                            value={query}
                            onChange={e => { setQuery(e.target.value); setPrefilled(false); onChange({ address: e.target.value, propertyData: null }); }}
                            onKeyDown={e => e.key === 'Enter' && query.length > 4 && simulatePrefill()}
                            placeholder="Start typing your address…"
                            style={{
                                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                                fontFamily: F.display, fontSize: 16, color: C.ink,
                            }}
                        />
                        {query.length > 4 && !prefilled && (
                            <div onClick={simulatePrefill} style={{ color: C.blue, fontFamily: F.body, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Look up</div>
                        )}
                    </div>
                </div>

                {/* Pre-fill result */}
                {prefilled && data.propertyData && (
                    <div style={{
                        marginTop: 12, padding: '14px 16px',
                        background: C.blueSoft, borderRadius: 14,
                        border: `1px solid ${C.blue}30`,
                    }}>
                        <div style={{ fontFamily: F.body, fontSize: 12, color: C.blue, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>✓</span> Pre-filled from CoreLogic
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                            {Object.entries({ 'Land area': data.propertyData.landArea, 'Year built': data.propertyData.yearBuilt, 'Dwelling': data.propertyData.dwelling, 'Storeys': data.propertyData.storeys }).map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                                    <span style={{ color: C.ink3 }}>{k}</span>
                                    <span style={{ color: C.blue, fontWeight: 500 }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline */}
                <div style={{ marginTop: 20 }}>
                    <SectionLabel>Start timeline</SectionLabel>
                    <div style={{ background: C.white, border: `1px solid ${C.hair}`, borderRadius: 16, overflow: 'hidden' }}>
                        {timelines.map((label, i) => {
                            const selected = data.timeline === label || (!data.timeline && i === 0);
                            return (
                                <div key={label} onClick={() => onChange({ timeline: label })} style={{
                                    height: 52, padding: '0 18px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    borderBottom: i < timelines.length - 1 ? `1px solid ${C.hair}` : 'none',
                                    cursor: 'pointer',
                                }}>
                                    <span style={{ fontFamily: F.body, fontSize: 16, color: C.ink, fontWeight: selected ? 600 : 400 }}>{label}</span>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: 11,
                                        background: selected ? C.blue : 'transparent',
                                        border: selected ? 'none' : `1.5px solid ${C.hair}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {selected && Icons.check()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ height: 16 }} />
            </div>

            <div style={{ padding: '0 24px 14px' }}>
                <PrimaryBtn color={C.blue} onClick={onContinue} disabled={!data.address || data.address.length < 4}>
                    Calculate my estimate
                </PrimaryBtn>
            </div>
            <HomeBar />
        </div>
    );
}

// ─── Screen 5 — Calculating ───────────────────────────────────────────────────
function Calculating({ onDone }) {
    const [step, setStep] = useState(0);

    const steps = [
        { label: 'Reading property data', done: false },
        { label: 'Pulling local build rates', done: false },
        { label: 'Pricing materials & labour', done: false },
        { label: 'Applying contingency', done: false },
    ];

    useEffect(() => {
        const timers = [
            setTimeout(() => setStep(1), 600),
            setTimeout(() => setStep(2), 1200),
            setTimeout(() => setStep(3), 1800),
            setTimeout(() => setStep(4), 2400),
            setTimeout(() => onDone(), 2900),
        ];
        return () => timers.forEach(clearTimeout);
    }, []); // eslint-disable-line

    return (
        <div className="be-screen" style={{
            background: C.blue, height: '100%', display: 'flex', flexDirection: 'column', flex: 1,
            position: 'relative', overflow: 'hidden',
        }}>
            <StatusBar dark />

            {/* Decorative rings */}
            {[280, 380].map((size, i) => (
                <div key={i} style={{
                    position: 'absolute', top: i === 0 ? 90 : 40,
                    left: '50%', transform: 'translateX(-50%)',
                    width: size, height: size, borderRadius: size / 2,
                    border: `1px solid rgba(255,255,255,${i === 0 ? 0.12 : 0.06})`,
                    pointerEvents: 'none',
                }} />
            ))}

            {/* Orange glow */}
            <div style={{
                position: 'absolute', top: -60, right: -60,
                width: 240, height: 240, borderRadius: 120,
                background: `radial-gradient(circle, ${C.orange}40, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
                {/* Spinner */}
                <div style={{
                    width: 96, height: 96, borderRadius: 48,
                    background: 'rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                }}>
                    <div style={{
                        position: 'absolute', inset: 0, borderRadius: 48,
                        border: '3px solid rgba(255,255,255,0.15)',
                        borderTopColor: C.orange,
                        animation: 'spin 1.2s linear infinite',
                    }} />
                    <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
                        <path d="M4 22V10l10-6 10 6v12" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
                        <path d="M10 22v-7h8v7" stroke={C.orange} strokeWidth="2.4" strokeLinejoin="round" />
                    </svg>
                </div>

                <div style={{
                    marginTop: 28, fontFamily: F.display, fontSize: 26, fontWeight: 700,
                    color: '#fff', letterSpacing: -0.6, textAlign: 'center', lineHeight: '30px',
                }}>Crunching the<br />numbers…</div>

                <div style={{ marginTop: 36, width: '100%', maxWidth: 280 }}>
                    {steps.map((row, i) => {
                        const done = i < step;
                        const active = i === step;
                        return (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 0',
                                borderBottom: i < steps.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                            }}>
                                <div style={{
                                    width: 20, height: 20, borderRadius: 10, flexShrink: 0,
                                    background: done ? C.orange : active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.3s',
                                }}>
                                    {done && Icons.check()}
                                </div>
                                <div style={{
                                    fontFamily: F.body, fontSize: 15,
                                    color: done ? 'rgba(255,255,255,0.95)' : active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)',
                                    fontWeight: done ? 500 : 400,
                                    transition: 'all 0.3s',
                                }}>{row.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <HomeBar dark />
        </div>
    );
}

// ─── Screen 6 — Estimate result ───────────────────────────────────────────────
function BreakdownRow({ label, amount, pct, color, blurred }) {
    return (
        <div style={{
            padding: '14px 0', borderBottom: `1px solid ${C.hair}`,
            filter: blurred ? 'blur(4px)' : 'none',
            userSelect: blurred ? 'none' : 'auto',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                    <div style={{ fontFamily: F.body, fontSize: 15, color: C.ink, fontWeight: 500 }}>{label}</div>
                </div>
                <div style={{ fontFamily: F.display, fontSize: 16, color: C.ink, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {amount}
                </div>
            </div>
            <div style={{ height: 4, background: C.paper, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
            </div>
        </div>
    );
}

function EstimateResult({ data, onGetReport, onSave }) {
    const [lo, hi] = calcEstimate(data.rooms || [], data.finish || 'standard');
    const animLo = useCountUp(lo, 1400);
    const animHi = useCountUp(hi, 1400);

    const items = [
        { label: 'Kitchen & joinery', amount: fmt(Math.round(lo * 0.24)), pct: 35, color: C.blue, blurred: true },
        { label: 'Bathrooms', amount: fmt(Math.round(lo * 0.16)), pct: 22, color: C.orange, blurred: true },
        { label: 'Demolition & site', amount: fmt(Math.round(lo * 0.07)), pct: 10, color: C.purple, blurred: true },
        { label: 'Electrical', amount: fmt(Math.round(lo * 0.08)), pct: 13, color: C.emerald, blurred: true },
        { label: 'Plumbing', amount: fmt(Math.round(lo * 0.09)), pct: 14, color: C.amber, blurred: true },
        { label: 'Contingency (10%)', amount: fmt(Math.round(lo * 0.05)), pct: 6, color: C.ink3, blurred: true },
    ];

    return (
        <div className="be-screen" style={{ background: C.paper, height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <StatusBar />
            <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 12, background: C.white,
                    border: `1px solid ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9 1L3 7l6 6" stroke={C.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: C.ink }}>Your estimate</div>
                <div style={{
                    width: 36, height: 36, borderRadius: 12, background: C.white,
                    border: `1px solid ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                }}>
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                        <path d="M7 1v10M3 7l4 4 4-4M1 14h12" stroke={C.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            <div style={{ flex: 1, padding: '20px 20px 0', overflowY: 'auto' }}>
                {/* Hero total card */}
                <div style={{
                    background: C.ink, borderRadius: 24, padding: '22px 22px 20px',
                    color: '#fff', position: 'relative', overflow: 'hidden',
                }}>
                    {/* Orange glow */}
                    <div style={{
                        position: 'absolute', top: -40, right: -40,
                        width: 160, height: 160, borderRadius: 80,
                        background: `radial-gradient(circle, ${C.orange}55, transparent 65%)`,
                        pointerEvents: 'none',
                    }} />

                    <div style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                        Estimated total
                    </div>
                    <div style={{
                        marginTop: 6, fontFamily: F.display, fontSize: 44, fontWeight: 700,
                        letterSpacing: -1.5, lineHeight: '46px', fontVariantNumeric: 'tabular-nums',
                    }}>
                        {fmtFull(animLo)}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            padding: '4px 10px', background: 'rgba(255,255,255,0.12)',
                            borderRadius: 100, fontFamily: F.mono, fontSize: 11,
                            color: '#fff', letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600,
                        }}>Range</div>
                        <div style={{ fontFamily: F.body, fontSize: 14, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtFull(animLo)} – {fmtFull(animHi)}
                        </div>
                    </div>

                    {/* Stacked bar */}
                    <div style={{ marginTop: 18, display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                        {items.map((it, i) => (
                            <div key={i} style={{ flex: it.pct, background: it.color }} />
                        ))}
                    </div>
                </div>

                {/* Breakdown — blurred with lock overlay */}
                <div style={{ marginTop: 22, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, padding: '0 4px' }}>
                        <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Breakdown</div>
                        <div style={{ fontFamily: F.body, fontSize: 13, color: C.orange, fontWeight: 600 }}>Unlock $29</div>
                    </div>

                    <div style={{
                        marginTop: 10, padding: '0 18px', background: C.white,
                        borderRadius: 18, border: `1px solid ${C.hair}`,
                        position: 'relative', overflow: 'hidden',
                    }}>
                        {items.map((it, i) => (
                            <BreakdownRow key={i} {...it} blurred={true} />
                        ))}
                        {/* Lock overlay */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(247,246,242,0.5)', gap: 6,
                        }}>
                            <div style={{ fontSize: 22 }}>🔒</div>
                            <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink }}>Full breakdown included</div>
                            <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink2, textAlign: 'center', maxWidth: 200 }}>Trade-by-trade costs, PDF report & shareable link</div>
                        </div>
                    </div>
                </div>

                {/* Trust row */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                    {['2,400+ builds', 'Instant delivery', 'Builder-reviewed'].map(t => (
                        <div key={t} style={{ fontFamily: F.body, fontSize: 12, color: C.ink3 }}>{t}</div>
                    ))}
                </div>

                <div style={{ height: 12 }} />
            </div>

            <div style={{ padding: '12px 20px 14px', display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                    <GhostBtn onClick={onSave}>Save</GhostBtn>
                </div>
                <div style={{ flex: 1.6 }}>
                    <PrimaryBtn color={C.orange} onClick={onGetReport}>
                        Full report — $29
                    </PrimaryBtn>
                </div>
            </div>
            <HomeBar />
        </div>
    );
}

// ─── Screen 7 — Email save ────────────────────────────────────────────────────
function SaveEstimate({ data, onChange, onSubmit, onBack }) {
    const [lo, hi] = calcEstimate(data.rooms || [], data.finish || 'standard');
    const [loading, setLoading] = useState(false);
    const canSubmit = data.name?.trim().length > 1 && data.email?.includes('@');

    const handleSubmit = async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 900));
        setLoading(false);
        onSubmit();
    };

    return (
        <div className="be-screen" style={{ background: C.paper, height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <StatusBar />
            <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'center' }}>
                <BackBtn onBack={onBack} />
            </div>

            <div style={{ flex: 1, padding: '28px 24px 0' }}>
                <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, letterSpacing: -0.7, color: C.ink, lineHeight: '32px' }}>
                    Save your<br />estimate.
                </div>
                <div style={{ fontFamily: F.body, fontSize: 15, color: C.ink2, marginTop: 8, letterSpacing: -0.1 }}>
                    We'll send it as a free PDF — no spam, ever.
                </div>

                {/* Estimate pill */}
                <div style={{
                    marginTop: 20, padding: '14px 18px',
                    background: C.ink, borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <div style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Your estimate</div>
                        <div style={{ fontFamily: F.mono, fontSize: 20, fontWeight: 600, color: '#fff', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtFull(lo)} – {fmtFull(hi)}
                        </div>
                    </div>
                    <div style={{
                        padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 100,
                        fontFamily: F.mono, fontSize: 11, color: 'rgba(255,255,255,0.6)',
                    }}>FREE</div>
                </div>

                {/* Inputs */}
                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                        { placeholder: 'Your name', key: 'name', type: 'text' },
                        { placeholder: 'Email address', key: 'email', type: 'email' },
                    ].map(field => (
                        <div key={field.key} style={{
                            height: 56, padding: '0 18px', background: C.white,
                            border: `1.5px solid ${data[field.key]?.length > 0 ? C.blue : C.hair}`,
                            borderRadius: 16, display: 'flex', alignItems: 'center',
                            transition: 'border-color 0.15s',
                        }}>
                            <input
                                type={field.type}
                                placeholder={field.placeholder}
                                value={data[field.key] || ''}
                                onChange={e => onChange({ [field.key]: e.target.value })}
                                style={{
                                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                                    fontFamily: F.display, fontSize: 16, color: C.ink,
                                }}
                            />
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 12, fontFamily: F.body, fontSize: 13, color: C.ink3, textAlign: 'center' }}>
                    No password needed · Unsubscribe any time
                </div>

                {/* Upgrade nudge */}
                <div style={{
                    marginTop: 20, padding: '16px 18px',
                    background: C.white, border: `1px solid ${C.hair}`,
                    borderRadius: 16,
                }}>
                    <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink }}>Want the full breakdown?</div>
                    <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink2, marginTop: 4, lineHeight: '18px' }}>Get a trade-by-trade report with every cost line for just $29 — ready to share with your broker or builder.</div>
                    <div style={{ marginTop: 12 }}>
                        <PrimaryBtn color={C.orange}>Full report — $29</PrimaryBtn>
                    </div>
                </div>
            </div>

            <div style={{ padding: '14px 24px 14px' }}>
                <PrimaryBtn color={C.blue} onClick={handleSubmit} disabled={!canSubmit || loading}>
                    {loading ? 'Sending…' : 'Send my free PDF →'}
                </PrimaryBtn>
            </div>
            <HomeBar />
        </div>
    );
}

// ─── Screen 8 — Success ───────────────────────────────────────────────────────
function Success({ data }) {
    const [lo, hi] = calcEstimate(data.rooms || [], data.finish || 'standard');
    return (
        <div className="be-screen" style={{ background: C.paper, height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <StatusBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
                {/* Check circle */}
                <div style={{
                    width: 72, height: 72, borderRadius: 36,
                    background: C.emerald, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 8px 24px ${C.emerald}40`, marginBottom: 24,
                }}>
                    <svg width="32" height="26" viewBox="0 0 32 26" fill="none">
                        <path d="M2 13L12 23L30 3" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                <div style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: -0.8, textAlign: 'center', lineHeight: '34px' }}>
                    On its way!
                </div>
                <div style={{ fontFamily: F.body, fontSize: 16, color: C.ink2, marginTop: 12, textAlign: 'center', lineHeight: '22px', maxWidth: 280 }}>
                    Your estimate PDF is heading to <span style={{ color: C.blue, fontWeight: 600 }}>{data.email || 'your inbox'}</span>.
                </div>

                {/* Estimate card */}
                <div style={{
                    marginTop: 28, width: '100%', padding: '18px 20px',
                    background: C.ink, borderRadius: 20, position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60,
                        background: `radial-gradient(circle, ${C.orange}40, transparent 70%)`,
                    }} />
                    <div style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Your estimate</div>
                    <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 600, color: '#fff', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtFull(lo)} – {fmtFull(hi)}
                    </div>
                </div>

                <div style={{ marginTop: 24, width: '100%' }}>
                    <PrimaryBtn color={C.orange}>Upgrade to full report — $29</PrimaryBtn>
                </div>
                <div style={{ marginTop: 10, width: '100%' }}>
                    <GhostBtn>Start a new estimate</GhostBtn>
                </div>
            </div>
            <HomeBar />
        </div>
    );
}

// ─── Main orchestrator ────────────────────────────────────────────────────────
export default function BuildEstimator() {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        projectType: null,
        rooms: [],
        finish: 'standard',
        address: '',
        propertyData: null,
        timeline: null,
        name: '',
        email: '',
    });

    const update = useCallback(patch => setForm(prev => ({ ...prev, ...patch })), []);
    const next = () => setStep(s => s + 1);
    const back = () => setStep(s => Math.max(0, s - 1));

    return (
        <>
            <style>{GLOBAL_CSS}</style>
            <div className="be-root">
                <div className="be-phone">
                    {step === 0 && <Welcome onStart={next} />}
                    {step === 1 && <PickType data={form} onChange={update} onContinue={next} onBack={back} />}
                    {step === 2 && <ScopeStep data={form} onChange={update} onContinue={next} onBack={back} />}
                    {step === 3 && <AddressStep data={form} onChange={update} onContinue={next} onBack={back} />}
                    {step === 4 && <Calculating onDone={next} />}
                    {step === 5 && (
                        <EstimateResult
                            data={form}
                            onGetReport={() => alert('Stripe checkout — coming next!')}
                            onSave={next}
                        />
                    )}
                    {step === 6 && <SaveEstimate data={form} onChange={update} onSubmit={next} onBack={() => setStep(5)} />}
                    {step === 7 && <Success data={form} />}
                </div>
            </div>
        </>
    );
}
