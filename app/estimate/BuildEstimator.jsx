'use client';
/**
 * BuildEstimator.jsx  —  Full 13-step questionnaire flow
 *
 * Stage 1 FREE  : Welcome → Address → Project scope → Rooms →
 *                 Room sizing → Ballpark + finish reveal
 * Payment gate  : $29 Stripe placeholder (pass-through for testing)
 * Stage 2 PAID  : Doc upload → Confirm details → Site conditions →
 *                 Council & permits → Demo scope → Living situation →
 *                 Structural → Generating → Report
 *
 * Colors: blue #2756FF · orange #FF6A2C · ink #0E1220 · paper #F7F6F2
 * Fonts:  SF Pro / system-ui · DM Mono for all numbers
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
    blue: '#2756FF', blueDark: '#1B3FCC', blueSoft: '#EAF0FF',
    orange: '#FF6A2C', orangeSoft: '#FFEEE3',
    ink: '#0E1220', ink2: '#5A6075', ink3: '#9097A8',
    hair: '#E7E6E0', paper: '#F7F6F2', white: '#FFFFFF',
    green: '#10B981', greenSoft: '#D1FAE5',
    amber: '#F59E0B', purple: '#8B5CF6',
};
const F = {
    body: '-apple-system,"SF Pro Text",system-ui,sans-serif',
    display: '-apple-system,"SF Pro Display",system-ui,sans-serif',
    mono: 'ui-monospace,"SF Mono",Menlo,monospace',
};

// ─── Cost model ───────────────────────────────────────────────────────────────
const ROOM_BASE = { kitchen: 14, living: 28, masterBed: 18, bathroom: 8, bed2: 12, bed3: 12, ensuite: 6, laundry: 5, alfresco: 20, garage: 18 };
const RATE = { kitchen: 2200, living: 420, masterBed: 380, bathroom: 2400, bed2: 350, bed3: 350, ensuite: 2200, laundry: 1400, alfresco: 680, garage: 680 };
const FINISH_M = { basic: 1.0, standard: 1.4, premium: 1.9, luxury: 2.7 };
const ROOM_LBL = { kitchen: 'Kitchen', living: 'Living area', masterBed: 'Master bed', bathroom: 'Bathroom', bed2: 'Bedroom 2', bed3: 'Bedroom 3', ensuite: 'Ensuite', laundry: 'Laundry', alfresco: 'Alfresco', garage: 'Garage' };
const SCOPE_ROOMS = { single: ['kitchen', 'bathroom', 'ensuite', 'living', 'masterBed'], multi: ['kitchen', 'living', 'masterBed', 'bathroom', 'bed2', 'ensuite', 'laundry', 'alfresco'], whole: Object.keys(ROOM_LBL) };
const FINISH_OPTS = [
    { id: 'basic', label: 'Basic', mult: '1×', desc: 'Flat-pack, laminate, carpet' },
    { id: 'standard', label: 'Standard', mult: '1.4×', desc: 'Semi-custom, stone-look, hybrid floors' },
    { id: 'premium', label: 'Premium', mult: '1.9×', desc: 'Stone benchtops, engineered timber' },
    { id: 'luxury', label: 'Luxury', mult: '2.7×', desc: 'Marble, custom joinery, herringbone' },
];
const SQM_RANGE = { kitchen: [8, 40], living: [15, 60], masterBed: [10, 40], bathroom: [4, 20], bed2: [8, 25], bed3: [8, 25], ensuite: [3, 14], laundry: [3, 12], alfresco: [10, 60], garage: [12, 50] };

function calcEst(rooms, sizes, finish) {
    const m = FINISH_M[finish] || 1.4;
    let lo = 14000, hi = 20000;
    rooms.forEach(r => { const sqm = sizes[r] || ROOM_BASE[r] || 10; lo += sqm * (RATE[r] || 400) * 0.85; hi += sqm * (RATE[r] || 400) * 1.2; });
    return [Math.round(lo * m / 1000) * 1000, Math.round(hi * m / 1000) * 1000];
}
function fmt(n) { return n >= 1000000 ? `$${(n / 1e6).toFixed(1)}m` : `$${Math.round(n / 1000)}k`; }
function fmtFull(n) { return '$' + n.toLocaleString('en-AU'); }

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target, dur = 800) {
    const [v, setV] = useState(target);
    const prev = useRef(target);
    const raf = useRef(null);
    useEffect(() => {
        const from = prev.current; let t0 = null;
        const tick = ts => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
            setV(Math.round(from + (target - from) * e));
            if (p < 1) raf.current = requestAnimationFrame(tick); else prev.current = target;
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [target]); // eslint-disable-line
    return v;
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  .BE * { box-sizing:border-box; margin:0; padding:0; }
  .BE { min-height:100vh; background:${C.paper}; display:flex; justify-content:center; }
  .BEw { width:100%; max-width:390px; min-height:100vh; display:flex; flex-direction:column; }
  .BEs { animation:up .26s cubic-bezier(.22,1,.36,1); flex:1; display:flex; flex-direction:column; }
  input:focus { outline:none; }
`;

// ─── Primitives ───────────────────────────────────────────────────────────────
function SBar({ dark = false }) {
    const c = dark ? '#fff' : C.ink;
    return (
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 22px 0', zIndex: 10 }}>
            <span style={{ fontFamily: F.display, fontWeight: 590, fontSize: 17, color: c, flex: 1 }}>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx=".7" fill={c} opacity=".35" /><rect x="4" y="4.5" width="3" height="6.5" rx=".7" fill={c} opacity=".6" /><rect x="8" y="2" width="3" height="9" rx=".7" fill={c} opacity=".8" /><rect x="12" y="0" width="3" height="11" rx=".7" fill={c} /></svg>
                <svg width="24" height="11" viewBox="0 0 24 11"><rect x=".5" y=".5" width="21" height="10" rx="3" stroke={c} strokeOpacity=".35" fill="none" /><rect x="2" y="2" width="16" height="7" rx="1.5" fill={c} /><path d="M22.5 3.8V7.2C23.3 6.9 24 6.1 24 5.5S23.3 4.1 22.5 3.8Z" fill={c} opacity=".4" /></svg>
            </div>
        </div>
    );
}
function HBar({ dark = false }) {
    return <div style={{ height: 30, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 6 }}><div style={{ width: 130, height: 5, borderRadius: 100, background: dark ? 'rgba(255,255,255,.65)' : 'rgba(0,0,0,.18)' }} /></div>;
}
function PBar({ step, total, color = C.blue }) {
    return <div style={{ height: 3, background: C.hair, marginTop: 4 }}><div style={{ height: '100%', width: `${(step / total) * 100}%`, background: color, borderRadius: '0 2px 2px 0', transition: 'width .4s cubic-bezier(.34,1.56,.64,1)' }} /></div>;
}
function SDots({ step, total, color = C.blue }) {
    return <div style={{ display: 'flex', gap: 5 }}>{Array.from({ length: total }).map((_, i) => <div key={i} style={{ width: i === step ? 20 : 5, height: 5, borderRadius: 3, background: i === step ? color : C.hair, transition: 'all .2s' }} />)}</div>;
}
function BackBtn({ onClick }) {
    return <div onClick={onClick} style={{ width: 36, height: 36, borderRadius: 12, background: C.white, border: `1px solid ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 1L3 7l6 6" stroke={C.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}
function NavRow({ onBack, stepIdx, totalSteps, color = C.blue, right = null }) {
    return <div style={{ padding: '12px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><BackBtn onClick={onBack} />{totalSteps && <SDots step={stepIdx} total={totalSteps} color={color} />}<div style={{ width: 36, display: 'flex', justifyContent: 'flex-end' }}>{right}</div></div>;
}
function H1({ children, sub }) {
    return <div style={{ padding: '22px 22px 0' }}><div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, letterSpacing: -.7, color: C.ink, lineHeight: '32px' }}>{children}</div>{sub && <div style={{ fontFamily: F.body, fontSize: 15, color: C.ink2, marginTop: 8, lineHeight: '21px', letterSpacing: -.1 }}>{sub}</div>}</div>;
}
function Lbl({ children }) {
    return <div style={{ fontFamily: F.body, fontSize: 12, color: C.ink2, textTransform: 'uppercase', letterSpacing: .6, fontWeight: 600, marginBottom: 9, paddingLeft: 2 }}>{children}</div>;
}
function Btn({ children, color = C.blue, onClick, disabled, style: s }) {
    return <div onClick={!disabled ? onClick : undefined} style={{ height: 54, borderRadius: 16, background: disabled ? C.hair : color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: disabled ? C.ink3 : '#fff', fontFamily: F.display, fontSize: 17, fontWeight: 600, letterSpacing: -.2, boxShadow: disabled ? 'none' : `0 5px 16px ${color}35`, cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none', transition: 'all .14s', ...s }}>{children}</div>;
}
function Ghost({ children, onClick, style: s }) {
    return <div onClick={onClick} style={{ height: 54, borderRadius: 16, background: 'transparent', border: `1.5px solid ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink2, fontFamily: F.display, fontSize: 17, fontWeight: 500, cursor: 'pointer', userSelect: 'none', ...s }}>{children}</div>;
}
function BRow({ children }) { return <div style={{ padding: '10px 22px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>{children}</div>; }
function Card({ children, style: s, onClick }) { return <div onClick={onClick} style={{ background: C.white, border: `1px solid ${C.hair}`, borderRadius: 16, padding: '14px 16px', ...s }}>{children}</div>; }
function Chip({ label, selected, color = C.blue, onClick, small }) {
    return <div onClick={onClick} style={{ padding: small ? '7px 13px' : '9px 15px', borderRadius: 100, background: selected ? color : C.white, color: selected ? '#fff' : C.ink, border: selected ? 'none' : `1px solid ${C.hair}`, fontFamily: F.body, fontSize: small ? 13 : 14, fontWeight: 500, letterSpacing: -.1, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', transition: 'all .12s' }}>{label}</div>;
}
function RadioRow({ label, sub, selected, onClick, last }) {
    return <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: last ? 'none' : `1px solid ${C.hair}`, cursor: 'pointer', background: selected ? C.blueSoft : 'transparent', transition: 'background .12s' }}>
        <div><div style={{ fontFamily: F.body, fontSize: 15, color: C.ink, fontWeight: selected ? 600 : 400 }}>{label}</div>{sub && <div style={{ fontFamily: F.body, fontSize: 12, color: C.ink3, marginTop: 2 }}>{sub}</div>}</div>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: selected ? C.blue : 'transparent', border: selected ? 'none' : `1.5px solid ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {selected && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
    </div>;
}
function Toggle({ label, sub, on, onToggle }) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}>
        <div><div style={{ fontFamily: F.body, fontSize: 15, fontWeight: 500, color: C.ink }}>{label}</div>{sub && <div style={{ fontFamily: F.body, fontSize: 12, color: C.ink3, marginTop: 2 }}>{sub}</div>}</div>
        <div onClick={onToggle} style={{ width: 50, height: 30, borderRadius: 15, background: on ? C.blue : C.hair, padding: 2, display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', alignItems: 'center', cursor: 'pointer', transition: 'all .2s' }}><div style={{ width: 26, height: 26, borderRadius: 13, background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.18)', transition: 'all .2s' }} /></div>
    </div>;
}
function ScopeCard({ icon, title, sub, selected, onClick }) {
    return <div onClick={onClick} style={{ flex: 1, background: selected ? C.ink : C.white, border: `1px solid ${selected ? C.ink : C.hair}`, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', userSelect: 'none', transition: 'all .15s', minHeight: 100 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: selected ? C.orange : C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        <div><div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: selected ? '#fff' : C.ink, letterSpacing: -.3 }}>{title}</div><div style={{ fontFamily: F.mono, fontSize: 10, color: selected ? 'rgba(255,255,255,.5)' : C.ink3, marginTop: 3, textTransform: 'uppercase', letterSpacing: .4 }}>{sub}</div></div>
    </div>;
}
function Slider({ value, min, max, onChange, color = C.blue }) {
    const pct = ((value - min) / (max - min)) * 100;
    return <div style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'center' }}>
        <div style={{ height: 5, background: C.hair, borderRadius: 3, width: '100%' }} />
        <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: 5, background: color, borderRadius: 3, width: `${pct}%` }} />
        <div style={{ position: 'absolute', left: `calc(${pct}% - 13px)`, width: 26, height: 26, borderRadius: 13, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }} />
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
    </div>;
}
function RunningPill({ lo, hi }) {
    const aLo = useCountUp(lo), aHi = useCountUp(hi);
    return <div style={{ padding: '8px 22px 0', background: `linear-gradient(to bottom,transparent,${C.paper} 35%)`, zIndex: 20 }}>
        <div style={{ background: C.ink, borderRadius: 14, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(14,18,32,.25)' }}>
            <div style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: .5 }}>Estimate</div>
            <div style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(aLo)} – {fmt(aHi)}</div>
        </div>
    </div>;
}
function AutoBadge({ label = 'Auto-detected' }) {
    return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.blueSoft, border: `1px solid ${C.blue}30`, borderRadius: 100, padding: '3px 10px', fontFamily: F.body, fontSize: 11, color: C.blue, fontWeight: 500 }}><span style={{ fontSize: 9 }}>⚡</span>{label}</div>;
}
function Chk() { return <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

// ─── SCREENS ──────────────────────────────────────────────────────────────────

// 0 · Welcome
function S0({ onStart }) {
    return <div className="BEs" style={{ background: C.white }}>
        <SBar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 26px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8, boxShadow: `0 8px 22px ${C.blue}30` }}>
                <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><path d="M4 22V10l10-6 10 6v12" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" /><path d="M10 22v-7h8v7" stroke={C.orange} strokeWidth="2.4" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ marginTop: 'auto', marginBottom: 26 }}>
                <div style={{ fontFamily: F.display, fontSize: 42, lineHeight: '44px', fontWeight: 700, letterSpacing: -1.2, color: C.ink }}>Estimate<br /><span style={{ color: C.orange }}>any build</span><br />in minutes.</div>
                <div style={{ marginTop: 16, fontFamily: F.body, fontSize: 16, lineHeight: '23px', color: C.ink2, letterSpacing: -.2, maxWidth: 290 }}>Answer a few questions and get a contractor-grade cost breakdown instantly.</div>
                <div style={{ display: 'flex', gap: 7, marginTop: 18, flexWrap: 'wrap' }}>
                    {['Free ballpark', '$29 full report', 'Instant · no waiting'].map(t => <div key={t} style={{ padding: '5px 11px', background: C.paper, border: `1px solid ${C.hair}`, borderRadius: 100, fontFamily: F.mono, fontSize: 11, color: C.ink2 }}>{t}</div>)}
                </div>
            </div>
            <div style={{ paddingBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Btn color={C.blue} onClick={onStart}>Start a free estimate</Btn>
                <div style={{ textAlign: 'center', fontFamily: F.body, fontSize: 14, color: C.ink2, padding: '6px 0' }}>Already started? <span style={{ color: C.blue, fontWeight: 600 }}>Sign in</span></div>
            </div>
        </div>
        <HBar />
    </div>;
}

// 1 · Address
function S1({ data, onChange, onContinue, onBack }) {
    const [q, setQ] = useState(data.address || '');
    const [done, setDone] = useState(!!data.propertyData);
    const lookup = () => {
        onChange({ address: q, propertyData: { landArea: '380 m²', yearBuilt: '1965', dwelling: 'Terrace', storeys: '2', council: 'Inner West Council', zone: 'R2 Low Density' } });
        setDone(true);
    };
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={1} total={7} />
        <NavRow onBack={onBack} stepIdx={0} totalSteps={7} />
        <H1 sub="We'll look up your property details automatically.">What's the address?</H1>
        <div style={{ flex: 1, padding: '20px 22px 0', overflowY: 'auto' }}>
            <div style={{ background: C.white, border: `1.5px solid ${q.length > 4 ? C.blue : C.hair}`, borderRadius: 14, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color .15s' }}>
                <input value={q} onChange={e => { setQ(e.target.value); setDone(false); onChange({ address: e.target.value, propertyData: null }); }} onKeyDown={e => e.key === 'Enter' && q.length > 4 && lookup()} placeholder="Start typing your address…" style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: F.display, fontSize: 16, color: C.ink }} />
                {q.length > 4 && !done && <div onClick={lookup} style={{ color: C.blue, fontFamily: F.body, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Look up</div>}
            </div>
            {done && data.propertyData && <div style={{ marginTop: 12, background: C.blueSoft, border: `1px solid ${C.blue}25`, borderRadius: 14, padding: '13px 15px' }}>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.blue, fontWeight: 600, marginBottom: 9 }}>✓ Property confirmed</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px' }}>
                    {[['Land area', data.propertyData.landArea], ['Year built', data.propertyData.yearBuilt], ['Dwelling', data.propertyData.dwelling], ['Council', data.propertyData.council]].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', fontFamily: F.body }}><span style={{ color: C.ink3 }}>{k}</span><span style={{ color: C.blue, fontWeight: 500 }}>{v}</span></div>
                    ))}
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.blue}20`, display: 'flex', justifyContent: 'space-between', fontFamily: F.body, fontSize: 13 }}><span style={{ color: C.ink3 }}>Project type</span><span style={{ color: C.blue, fontWeight: 600 }}>Renovation ✓</span></div>
            </div>}
        </div>
        <BRow><Btn color={C.blue} onClick={onContinue} disabled={!q || q.length < 4}>{done ? 'Looks right — continue' : 'Continue'}</Btn><div style={{ textAlign: 'center', fontFamily: F.body, fontSize: 12, color: C.ink3 }}>No account needed · Your data is never sold</div></BRow>
        <HBar />
    </div>;
}

// 1b · Name & email
function S1b({ data, onChange, onContinue, onBack }) {
    const ok = data.name?.trim().length > 1 && data.email?.includes('@');
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={2} total={7} />
        <NavRow onBack={onBack} stepIdx={1} totalSteps={7} />
        <H1 sub="We'll save your estimate and send you a copy as a free PDF.">Who are we estimating for?</H1>
        <div style={{ flex: 1, padding: '24px 22px 0' }}>
            {/* Name */}
            <div style={{ marginBottom: 12 }}>
                <Lbl>Your name</Lbl>
                <div style={{ background: C.white, border: `1.5px solid ${data.name?.length > 0 ? C.blue : C.hair}`, borderRadius: 14, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', transition: 'border-color .15s' }}>
                    <input
                        type="text"
                        placeholder="First and last name"
                        value={data.name || ''}
                        onChange={e => onChange({ name: e.target.value })}
                        style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: F.display, fontSize: 16, color: C.ink }}
                    />
                </div>
            </div>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
                <Lbl>Email address</Lbl>
                <div style={{ background: C.white, border: `1.5px solid ${data.email?.includes('@') ? C.blue : C.hair}`, borderRadius: 14, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', transition: 'border-color .15s' }}>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        value={data.email || ''}
                        onChange={e => onChange({ email: e.target.value })}
                        style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: F.display, fontSize: 16, color: C.ink }}
                    />
                </div>
            </div>
            {/* What they get */}
            <div style={{ background: C.white, border: `1px solid ${C.hair}`, borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 10 }}>What you'll receive</div>
                {[['📊', 'Free ballpark estimate PDF sent to your inbox'], ['🔒', 'Your details are never sold or shared'], ['⚡', 'Unlock the full $29 report any time'],].map(([icon, text]) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
                        <span style={{ fontFamily: F.body, fontSize: 13, color: C.ink2, lineHeight: '18px' }}>{text}</span>
                    </div>
                ))}
            </div>
        </div>
        <BRow>
            <Btn color={C.blue} onClick={onContinue} disabled={!ok}>Continue</Btn>
            <div style={{ textAlign: 'center', fontFamily: F.body, fontSize: 12, color: C.ink3 }}>No password needed · Unsubscribe any time</div>
        </BRow>
        <HBar />
    </div>;
}

// 2 · Project scope
function S2({ data, onChange, onContinue, onBack }) {
    const opts = [{ id: 'single', icon: '🍳', title: 'Single room', sub: '1 room refresh' }, { id: 'multi', icon: '🏠', title: 'Multi-room', sub: '2–5 rooms' }, { id: 'whole', icon: '🔨', title: 'Whole home', sub: 'Full gut reno' }];
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={3} total={7} />
        <NavRow onBack={onBack} stepIdx={2} totalSteps={7} />
        <H1 sub="Filters room options and sets sizing defaults.">How much are we tackling?</H1>
        <div style={{ flex: 1, padding: '24px 22px 0' }}>
            <div style={{ display: 'flex', gap: 10 }}>
                {opts.map(o => <ScopeCard key={o.id} {...o} selected={data.projectScope === o.id} onClick={() => onChange({ projectScope: o.id, rooms: [], roomSizes: {} })} />)}
            </div>
            {data.projectScope && <div style={{ marginTop: 14, padding: '12px 14px', background: C.white, border: `1px solid ${C.hair}`, borderRadius: 12, fontFamily: F.body, fontSize: 13, color: C.ink2, lineHeight: '18px' }}>
                {data.projectScope === 'single' && '→ Choose 1 room. Great for a kitchen or bathroom refresh.'}
                {data.projectScope === 'multi' && '→ Choose 2–5 rooms. The most common renovation scope.'}
                {data.projectScope === 'whole' && '→ All rooms available. Full internal renovation.'}
            </div>}
        </div>
        <BRow><Btn color={C.blue} onClick={onContinue} disabled={!data.projectScope}>Continue</Btn></BRow>
        <HBar />
    </div>;
}

// 3 · Rooms
function S3({ data, onChange, onContinue, onBack }) {
    const avail = SCOPE_ROOMS[data.projectScope] || SCOPE_ROOMS.multi;
    const rooms = data.rooms || [];
    const max = data.projectScope === 'single' ? 1 : 99;
    const [lo, hi] = calcEst(rooms, data.roomSizes || {}, data.finish || 'standard');
    const toggle = id => {
        if (rooms.includes(id)) onChange({ rooms: rooms.filter(r => r !== id) });
        else if (rooms.length < max) onChange({ rooms: [...rooms, id] });
    };
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={4} total={7} />
        <NavRow onBack={onBack} stepIdx={3} totalSteps={7} />
        <H1 sub={data.projectScope === 'single' ? 'Pick the one room you\'re refreshing.' : 'Tap to include. Estimate updates live.'}>Which rooms?</H1>
        <div style={{ flex: 1, padding: '22px 22px 0', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{avail.map(id => <Chip key={id} label={ROOM_LBL[id]} selected={rooms.includes(id)} color={C.blue} onClick={() => toggle(id)} />)}</div>
            {rooms.length > 0 && <div style={{ height: 64 }} />}
        </div>
        {rooms.length > 0 && <RunningPill lo={lo} hi={hi} />}
        <BRow><Btn color={C.blue} onClick={onContinue} disabled={rooms.length === 0}>Continue with {rooms.length} room{rooms.length !== 1 ? 's' : ''}</Btn></BRow>
        <HBar />
    </div>;
}

// 4 · Room sizing
function S4({ data, onChange, onContinue, onBack }) {
    const rooms = data.rooms || [];
    const sizes = data.roomSizes || {};
    const [lo, hi] = calcEst(rooms, sizes, data.finish || 'standard');
    const setSz = (r, v) => onChange({ roomSizes: { ...sizes, [r]: v } });
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={5} total={7} />
        <NavRow onBack={onBack} stepIdx={4} totalSteps={7} />
        <H1 sub="Defaults from typical Australian homes. Drag to adjust.">Room sizes</H1>
        <div style={{ flex: 1, padding: '20px 22px 0', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rooms.map(r => {
                    const [mn, mx] = SQM_RANGE[r] || [5, 40];
                    const val = sizes[r] || ROOM_BASE[r] || mn;
                    return <Card key={r} style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                            <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.ink }}>{ROOM_LBL[r]}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 600, color: C.ink }}>{val}</span><span style={{ fontFamily: F.body, fontSize: 13, color: C.ink3 }}>m²</span></div>
                        </div>
                        <Slider value={val} min={mn} max={mx} onChange={v => setSz(r, v)} color={C.blue} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 10, color: C.ink3, marginTop: 2 }}><span>{mn}m²</span><span>{mx}m²</span></div>
                    </Card>;
                })}
            </div>
            <div style={{ height: 64 }} />
        </div>
        <RunningPill lo={lo} hi={hi} />
        <BRow><Btn color={C.blue} onClick={onContinue}>Continue</Btn></BRow>
        <HBar />
    </div>;
}

// 5 · Ballpark reveal (free value moment)
function S5({ data, onChange, onPay, onSave }) {
    const rooms = data.rooms || [], sizes = data.roomSizes || {}, finish = data.finish || 'standard';
    const [lo, hi] = calcEst(rooms, sizes, finish);
    const aLo = useCountUp(lo, 1200), aHi = useCountUp(hi, 1200);
    const trades = [
        { label: 'Kitchen & joinery', pct: 0.26, color: C.blue }, { label: 'Bathrooms', pct: 0.18, color: C.orange },
        { label: 'Demolition & site', pct: 0.09, color: C.purple }, { label: 'Electrical', pct: 0.09, color: C.green },
        { label: 'Plumbing', pct: 0.10, color: C.amber }, { label: 'Painting & flooring', pct: 0.09, color: C.ink3 },
    ];
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar />
        <div style={{ padding: '12px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, color: C.ink }}>Your estimate</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink3 }}>{FINISH_OPTS.find(f => f.id === finish)?.label} finish</div>
        </div>
        <div style={{ flex: 1, padding: '14px 22px 0', overflowY: 'auto' }}>
            {/* Hero card */}
            <div style={{ background: C.ink, borderRadius: 22, padding: '20px 20px 18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, background: `radial-gradient(circle,${C.orange}50,transparent 65%)`, pointerEvents: 'none' }} />
                <div style={{ fontFamily: F.body, fontSize: 11, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Estimated total</div>
                <div style={{ fontFamily: F.mono, fontSize: 40, fontWeight: 700, letterSpacing: -1.5, color: '#fff', marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>{fmtFull(aLo)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <div style={{ padding: '3px 9px', background: 'rgba(255,255,255,.12)', borderRadius: 100, fontFamily: F.mono, fontSize: 10, color: 'rgba(255,255,255,.8)', letterSpacing: .5 }}>RANGE</div>
                    <div style={{ fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,.75)', fontVariantNumeric: 'tabular-nums' }}>{fmtFull(aLo)} – {fmtFull(aHi)}</div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
                    {trades.map((t, i) => <div key={i} style={{ flex: t.pct * 100, background: t.color, borderRadius: 2 }} />)}
                </div>
            </div>

            {/* Finish selector */}
            <div style={{ marginTop: 16 }}>
                <Lbl>Finish quality</Lbl>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {FINISH_OPTS.map(f => <Chip key={f.id} label={f.label} small selected={finish === f.id} color={C.orange} onClick={() => onChange({ finish: f.id })} />)}
                </div>
                {finish && <div style={{ marginTop: 7, fontFamily: F.body, fontSize: 12, color: C.ink3, paddingLeft: 2 }}>{FINISH_OPTS.find(f => f.id === finish)?.desc}</div>}
            </div>

            {/* $29 feature card */}
            <div style={{ marginTop: 16, background: C.ink, borderRadius: 20, padding: '20px 20px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, background: `radial-gradient(circle,${C.orange}35,transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ fontFamily: F.mono, fontSize: 11, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .14, marginBottom: 8 }}>Full detailed report</div>
                <div style={{ fontFamily: F.mono, fontSize: 42, fontWeight: 700, color: '#fff', letterSpacing: -1, lineHeight: 1 }}>$29</div>
                <div style={{ fontFamily: F.body, fontSize: 14, color: 'rgba(255,255,255,.55)', marginTop: 8, marginBottom: 20, lineHeight: '20px' }}>One-time payment. Instant delivery. No subscription.</div>
                {[['📋', 'Trade-by-trade cost breakdown'], ['📄', 'Downloadable PDF report'], ['🔗', 'Shareable link for broker or builder'], ['✏️', 'Edit any line item on screen'], ['♾️', 'Free re-runs if you change your mind']].map(([icon, text]) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{icon}</div>
                        <div style={{ fontFamily: F.body, fontSize: 15, color: 'rgba(255,255,255,.9)', lineHeight: '20px' }}>{text}</div>
                    </div>
                ))}
            </div>
            <div style={{ height: 8 }} />
        </div>
        <div style={{ padding: '8px 22px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Btn color={C.orange} onClick={onPay}>Get full report — $29</Btn>
            <Ghost onClick={onSave}>Save ballpark (free)</Ghost>
        </div>
        <HBar />
    </div>;
}

// 7 · Document upload
function S7({ data, onChange, onContinue, onBack }) {
    const [uploaded, setUploaded] = useState(!!data.hasDocument);
    const [processing, setProcessing] = useState(false);
    const handle = () => { setProcessing(true); setTimeout(() => { setProcessing(false); setUploaded(true); onChange({ hasDocument: true, docName: 'floor-plan.pdf' }); }, 1800); };
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={1} total={7} color={C.orange} />
        <NavRow onBack={onBack} stepIdx={0} totalSteps={7} color={C.orange} />
        <H1 sub="Optional — AI will extract room sizes and layout. You can always skip.">Upload a floor plan</H1>
        <div style={{ flex: 1, padding: '22px 22px 0' }}>
            {!uploaded && !processing && <div onClick={handle} style={{ border: `2px dashed ${C.hair}`, borderRadius: 18, padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer', background: C.white }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: C.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📄</div>
                <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: C.ink }}>Tap to upload</div>
                <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink3, textAlign: 'center' }}>Floor plan or building report — PDF, PNG or JPG</div>
            </div>}
            {processing && <div style={{ border: `1px solid ${C.hair}`, borderRadius: 18, padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, background: C.white }}>
                <div style={{ width: 52, height: 52, borderRadius: 26, border: `3px solid ${C.hair}`, borderTopColor: C.blue, animation: 'spin 1.2s linear infinite' }} />
                <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: C.ink }}>Reading document…</div>
                <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink3, textAlign: 'center' }}>AI is extracting room sizes and layout details</div>
            </div>}
            {uploaded && <div style={{ background: C.white, border: `1.5px solid ${C.green}`, borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>✓</div>
                <div><div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink }}>{data.docName}</div><div style={{ fontFamily: F.body, fontSize: 12, color: C.green, marginTop: 2 }}>AI extracted room structure — review on next screen</div></div>
            </div>}
            <div style={{ marginTop: 14, padding: '13px 15px', background: 'rgba(255,255,255,.6)', border: `1px dashed ${C.hair}`, borderRadius: 12, fontFamily: F.body, fontSize: 13, color: C.ink2, lineHeight: '19px' }}>
                <span style={{ color: C.ink, fontWeight: 500 }}>No document?</span> Tap "Skip" — you'll manually confirm details on the next screen.
            </div>
        </div>
        <BRow><Btn color={C.blue} onClick={onContinue}>{uploaded ? 'Continue with document' : 'Continue →'}</Btn><Ghost onClick={onContinue}>Skip upload</Ghost></BRow>
        <HBar />
    </div>;
}

// 8 · Confirm property details
function S8({ data, onChange, onContinue, onBack }) {
    const pd = data.propertyData || {};
    const setF = (k, v) => onChange({ propertyData: { ...pd, [k]: v } });
    const fields = [{ key: 'landArea', label: 'Land area', ph: 'e.g. 380 m²' }, { key: 'yearBuilt', label: 'Year built', ph: 'e.g. 1965' }, { key: 'dwelling', label: 'Dwelling type', ph: 'e.g. Terrace' }, { key: 'storeys', label: 'Storeys', ph: 'e.g. 2' }, { key: 'council', label: 'Council', ph: 'e.g. Inner West Council' }];
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={2} total={7} color={C.orange} />
        <NavRow onBack={onBack} stepIdx={1} totalSteps={7} color={C.orange} right={data.hasDocument ? <AutoBadge label="AI extracted" /> : null} />
        <H1 sub={data.hasDocument ? 'AI extracted these from your document — correct anything that\'s off.' : 'Review your property details and adjust if needed.'}>Confirm details</H1>
        <div style={{ flex: 1, padding: '20px 22px 0', overflowY: 'auto' }}>
            <Card>
                {fields.map((f, i) => <div key={f.key} style={{ padding: '10px 0', borderBottom: i < fields.length - 1 ? `1px solid ${C.hair}` : 'none' }}>
                    <div style={{ fontFamily: F.body, fontSize: 11, color: C.ink3, textTransform: 'uppercase', letterSpacing: .5, fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
                    <input value={pd[f.key] || ''} onChange={e => setF(f.key, e.target.value)} placeholder={f.ph} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: F.body, fontSize: 15, color: C.ink, fontWeight: 500 }} />
                </div>)}
            </Card>
            <div style={{ marginTop: 14 }}>
                <Lbl>Rooms in scope</Lbl>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {(data.rooms || []).map(r => <div key={r} style={{ padding: '6px 12px', background: C.white, border: `1px solid ${C.hair}`, borderRadius: 100, fontFamily: F.body, fontSize: 13, color: C.ink }}>{ROOM_LBL[r]} · {data.roomSizes?.[r] || ROOM_BASE[r]}m²</div>)}
                </div>
            </div>
        </div>
        <BRow><Btn color={C.blue} onClick={onContinue}>Looks right — continue</Btn></BRow>
        <HBar />
    </div>;
}

// 9 · Site conditions
function S9({ data, onChange, onContinue, onBack }) {
    const sc = data.siteConditions || {};
    const set = (k, v) => onChange({ siteConditions: { ...sc, [k]: v } });
    const access = [{ id: 'easy', label: 'Easy access', sub: 'Wide drive, flat site' }, { id: 'moderate', label: 'Some difficulty', sub: 'Narrow or sloped' }, { id: 'hard', label: 'Difficult access', sub: 'Very tight or steep' }];
    const restr = [{ key: 'crane', label: 'Crane restrictions', sub: 'Street or power lines' }, { key: 'skip', label: 'Skip bin restrictions', sub: 'Council permit needed' }, { key: 'heritage', label: 'Heritage area', sub: 'Additional approvals' }];
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={3} total={7} color={C.orange} />
        <NavRow onBack={onBack} stepIdx={2} totalSteps={7} color={C.orange} />
        <H1 sub="Site difficulty adds 5–15% to preliminary costs.">Site conditions</H1>
        <div style={{ flex: 1, padding: '20px 22px 0', overflowY: 'auto' }}>
            <Lbl>Site access</Lbl>
            <Card style={{ padding: 0, overflow: 'hidden' }}>{access.map((o, i) => <RadioRow key={o.id} label={o.label} sub={o.sub} selected={sc.access === o.id} onClick={() => set('access', o.id)} last={i === access.length - 1} />)}</Card>
            <div style={{ marginTop: 14 }}><Lbl>Restrictions</Lbl>
                <Card style={{ padding: 0, overflow: 'hidden' }}>{restr.map((r, i) => <div key={r.key} style={{ borderBottom: i < restr.length - 1 ? `1px solid ${C.hair}` : 'none' }}><Toggle label={r.label} sub={r.sub} on={!!sc[r.key]} onToggle={() => set(r.key, !sc[r.key])} /></div>)}</Card>
            </div>
        </div>
        <BRow><Btn color={C.blue} onClick={onContinue} disabled={!sc.access}>Continue</Btn></BRow>
        <HBar />
    </div>;
}

// 10 · Council & permits
function S10({ data, onChange, onContinue, onBack }) {
    const cd = data.councilData || {};
    const pd = data.propertyData || {};
    const set = (k, v) => onChange({ councilData: { ...cd, [k]: v } });
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={4} total={7} color={C.orange} />
        <NavRow onBack={onBack} stepIdx={3} totalSteps={7} color={C.orange} right={pd.council ? <AutoBadge /> : null} />
        <H1 sub="Permit costs are added as a provisional line item in your report.">Council & permits</H1>
        <div style={{ flex: 1, padding: '20px 22px 0', overflowY: 'auto' }}>
            {pd.council && <div style={{ marginBottom: 14, padding: '13px 15px', background: C.blueSoft, border: `1px solid ${C.blue}25`, borderRadius: 14 }}>
                <AutoBadge label="Detected from address" />
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {[['Council', pd.council], ['Zone', pd.zone || 'R2 Low Density']].map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.body, fontSize: 13 }}><span style={{ color: C.ink3 }}>{k}</span><span style={{ color: C.blue, fontWeight: 500 }}>{v}</span></div>)}
                </div>
            </div>}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
                <Toggle label="DA required" sub="Development Application needed" on={!!cd.da} onToggle={() => set('da', !cd.da)} />
                <div style={{ height: .5, background: C.hair }} />
                <Toggle label="Heritage overlay" sub="Property in conservation area" on={!!cd.heritage} onToggle={() => set('heritage', !cd.heritage)} />
                <div style={{ height: .5, background: C.hair }} />
                <Toggle label="Strata approval" sub="Body corporate sign-off needed" on={!!cd.strata} onToggle={() => set('strata', !cd.strata)} />
                <div style={{ height: .5, background: C.hair }} />
                <Toggle label="Include permit costs" sub="Added as provisional line item" on={cd.includePermits !== false} onToggle={() => set('includePermits', !cd.includePermits)} />
            </Card>
            {(cd.da || cd.heritage) && <div style={{ marginTop: 12, padding: '12px 14px', background: '#FFFBEE', border: '1px solid #F0CC70', borderRadius: 12, fontFamily: F.body, fontSize: 13, color: '#7A4800', lineHeight: '18px' }}>
                ⚠️ {cd.heritage ? 'Heritage overlay — additional approval likely required. Estimated permit cost: $3,500–$6,500.' : 'DA required. Estimated cost: $3,200–$5,800 added to report.'}
            </div>}
        </div>
        <BRow><Btn color={C.blue} onClick={onContinue}>Continue</Btn></BRow>
        <HBar />
    </div>;
}

// 11 · Demolition scope
function S11({ data, onChange, onContinue, onBack }) {
    const dm = data.demoScope || {};
    const year = parseInt(data.propertyData?.yearBuilt || '1970');
    const asbestos = year < 1985;
    const set = (k, v) => onChange({ demoScope: { ...dm, [k]: v } });
    const autoScope = data.projectScope === 'single' ? 'partial' : data.projectScope === 'whole' ? 'full' : 'partial';
    const opts = [{ id: 'none', label: 'No demolition', sub: 'Cosmetic work only' }, { id: 'partial', label: 'Partial strip-out', sub: 'Kitchen / bathrooms' }, { id: 'full', label: 'Full internal demo', sub: 'All rooms stripped back' }, { id: 'knockdown', label: 'Knockdown', sub: 'Entire structure removed' }];
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={5} total={7} color={C.orange} />
        <NavRow onBack={onBack} stepIdx={4} totalSteps={7} color={C.orange} right={<AutoBadge label="Pre-estimated" />} />
        <H1 sub="Pre-estimated from your project type and property age. Adjust if different.">Demo scope</H1>
        <div style={{ flex: 1, padding: '20px 22px 0', overflowY: 'auto' }}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>{opts.map((o, i) => <RadioRow key={o.id} label={o.label} sub={o.sub} selected={(dm.scope || autoScope) === o.id} onClick={() => set('scope', o.id)} last={i === opts.length - 1} />)}</Card>
            {asbestos && <div style={{ marginTop: 14, padding: '13px 15px', background: '#FFFBEE', border: '1px solid #F0CC70', borderRadius: 14 }}>
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: '#7A4800', marginBottom: 4 }}>⚠️ Asbestos provisional sum added</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: '#A86800', lineHeight: '17px', marginBottom: 10 }}>Properties built before 1985 commonly contain asbestos. A provisional cost of $4,500–$9,000 has been included.</div>
                <Toggle label="Include asbestos provisional" sub="Recommended for pre-1985 builds" on={dm.asbestos !== false} onToggle={() => set('asbestos', !dm.asbestos)} />
            </div>}
        </div>
        <BRow><Btn color={C.blue} onClick={onContinue}>Continue</Btn></BRow>
        <HBar />
    </div>;
}

// 12 · Living situation
function S12({ data, onChange, onContinue, onBack }) {
    const ls = data.livingSituation;
    const opt = (id, icon, title, desc) => (
        <div onClick={() => onChange({ livingSituation: id })} style={{ background: ls === id ? C.ink : C.white, border: `1px solid ${ls === id ? C.ink : C.hair}`, borderRadius: 18, padding: '18px 18px', cursor: 'pointer', transition: 'all .15s', marginBottom: 10 }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 600, color: ls === id ? '#fff' : C.ink }}>{title}</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: ls === id ? 'rgba(255,255,255,.6)' : C.ink2, marginTop: 5, lineHeight: '18px' }}>{desc}</div>
        </div>
    );
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={6} total={7} color={C.orange} />
        <NavRow onBack={onBack} stepIdx={5} totalSteps={7} color={C.orange} />
        <H1 sub="Staying on-site requires staged work — adds 8–12% to project cost.">Living situation</H1>
        <div style={{ flex: 1, padding: '24px 22px 0' }}>
            {opt('staying', '🏠', 'Staying on-site', 'Builder stages work to keep bathrooms and kitchen functional throughout.')}
            {opt('vacating', '🏨', 'Vacating the property', 'Builder has full access. No staging — most cost-efficient approach.')}
        </div>
        <BRow><Btn color={C.blue} onClick={onContinue} disabled={!ls}>Continue</Btn></BRow>
        <HBar />
    </div>;
}

// 13 · Structural work
function S13({ data, onChange, onContinue, onBack }) {
    const st = data.structural || {};
    const set = (k, v) => onChange({ structural: { ...st, [k]: v } });
    const items = [{ key: 'walls', label: 'Walls removed', sub: 'Load-bearing or non-load-bearing' }, { key: 'openings', label: 'New openings', sub: 'Doors, windows, bifolds added' }, { key: 'beams', label: 'Structural beams', sub: 'Steel or LVL beams required' }, { key: 'underpinning', label: 'Underpinning / restumping', sub: 'Foundation work needed' }, { key: 'engineering', label: 'Engineering sign-off', sub: 'Structural engineer required' }];
    const hasAny = Object.values(st).some(Boolean);
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><PBar step={7} total={7} color={C.orange} />
        <NavRow onBack={onBack} stepIdx={6} totalSteps={7} color={C.orange} />
        <H1 sub="Toggle anything that applies. Each item adds a costed line to your report.">Structural work</H1>
        <div style={{ flex: 1, padding: '20px 22px 0', overflowY: 'auto' }}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>{items.map((it, i) => <div key={it.key} style={{ borderBottom: i < items.length - 1 ? `1px solid ${C.hair}` : 'none' }}><Toggle label={it.label} sub={it.sub} on={!!st[it.key]} onToggle={() => set(it.key, !st[it.key])} /></div>)}</Card>
            <div style={{ marginTop: 12, padding: '12px 14px', background: hasAny ? C.blueSoft : C.white, border: `1px solid ${hasAny ? C.blue + '30' : C.hair}`, borderRadius: 12, fontFamily: F.body, fontSize: 13, color: hasAny ? C.blue : C.ink2, lineHeight: '18px' }}>
                {hasAny ? '✓ Structural costs included as separate line items with provisional ranges.' : 'No structural work? Toggle anything that applies or continue to your report.'}
            </div>
        </div>
        <BRow><Btn color={C.orange} onClick={onContinue}>Generate my report →</Btn></BRow>
        <HBar />
    </div>;
}

// 14 · Generating
function S14({ onDone }) {
    const [step, setStep] = useState(0);
    const steps = ['Reading property data', 'Pulling local build rates', 'Pricing materials & labour', 'Calculating site conditions', 'Applying contingency & margins', 'Generating your report'];
    useEffect(() => {
        const ts = steps.map((_, i) => setTimeout(() => setStep(i + 1), 600 + i * 480));
        const done = setTimeout(onDone, 600 + steps.length * 480 + 300);
        return () => { ts.forEach(clearTimeout); clearTimeout(done); };
    }, []); // eslint-disable-line
    return <div className="BEs" style={{ background: C.blue, position: 'relative', overflow: 'hidden' }}>
        <SBar dark />
        {[320, 220].map((s, i) => <div key={i} style={{ position: 'absolute', top: 60 + i * 40, left: '50%', transform: 'translateX(-50%)', width: s, height: s, borderRadius: s / 2, border: `1px solid rgba(255,255,255,${i === 0 ? .1 : .06})`, pointerEvents: 'none' }} />)}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, background: `radial-gradient(circle,${C.orange}45,transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
            <div style={{ width: 90, height: 90, borderRadius: 45, background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 45, border: `3px solid rgba(255,255,255,.15)`, borderTopColor: C.orange, animation: 'spin 1.2s linear infinite' }} />
                <svg width="34" height="34" viewBox="0 0 28 28" fill="none"><path d="M4 22V10l10-6 10 6v12" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" /><path d="M10 22v-7h8v7" stroke={C.orange} strokeWidth="2.4" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ marginTop: 24, fontFamily: F.display, fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -.6, textAlign: 'center', lineHeight: '30px' }}>Generating<br />your report…</div>
            <div style={{ marginTop: 32, width: '100%', maxWidth: 280 }}>
                {steps.map((label, i) => {
                    const done = i < step, active = i === step;
                    return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < steps.length - 1 ? '1px solid rgba(255,255,255,.1)' : 'none' }}>
                        <div style={{ width: 20, height: 20, borderRadius: 10, flexShrink: 0, background: done ? C.orange : active ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s' }}>
                            {done && <Chk />}
                        </div>
                        <div style={{ fontFamily: F.body, fontSize: 14, color: done ? 'rgba(255,255,255,.95)' : active ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.35)', fontWeight: done ? 500 : 400, transition: 'all .3s' }}>{label}</div>
                    </div>;
                })}
            </div>
        </div>
        <HBar dark />
    </div>;
}

// 15 · Report output
function S15({ data }) {
    const rooms = data.rooms || [], sizes = data.roomSizes || {}, finish = data.finish || 'standard';
    const [lo, hi] = calcEst(rooms, sizes, finish);
    const aLo = useCountUp(lo, 1400), aHi = useCountUp(hi, 1400);
    const trades = [
        { label: 'Kitchen & joinery', lo: Math.round(lo * .24), hi: Math.round(hi * .24), color: C.blue, pct: 35 },
        { label: 'Bathrooms', lo: Math.round(lo * .16), hi: Math.round(hi * .16), color: C.orange, pct: 22 },
        { label: 'Demolition & site', lo: Math.round(lo * .09), hi: Math.round(hi * .09), color: C.purple, pct: 12 },
        { label: 'Structural work', lo: Math.round(lo * .07), hi: Math.round(hi * .07), color: '#8B5CF6', pct: 9 },
        { label: 'Electrical', lo: Math.round(lo * .09), hi: Math.round(hi * .09), color: C.green, pct: 12 },
        { label: 'Plumbing', lo: Math.round(lo * .10), hi: Math.round(hi * .10), color: C.amber, pct: 13 },
        { label: 'Painting & flooring', lo: Math.round(lo * .08), hi: Math.round(hi * .08), color: C.ink3, pct: 10 },
        { label: 'Council & permits', lo: 3500, hi: 6500, color: '#EC4899', pct: 5 },
        { label: 'Contingency (10%)', lo: Math.round(lo * .05), hi: Math.round(hi * .05), color: C.hair, pct: 7 },
    ];
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar />
        <div style={{ padding: '12px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: C.ink }}>Your report</div>
            <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '6px 12px', background: C.white, border: `1px solid ${C.hair}`, borderRadius: 100, fontFamily: F.body, fontSize: 12, color: C.ink2, cursor: 'pointer' }}>Share</div>
                <div style={{ padding: '6px 12px', background: C.orange, borderRadius: 100, fontFamily: F.body, fontSize: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>PDF</div>
            </div>
        </div>
        <div style={{ flex: 1, padding: '14px 22px 0', overflowY: 'auto' }}>
            {/* Hero */}
            <div style={{ background: C.ink, borderRadius: 22, padding: '20px 20px 18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, background: `radial-gradient(circle,${C.orange}50,transparent 65%)`, pointerEvents: 'none' }} />
                <div style={{ fontFamily: F.body, fontSize: 11, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Total estimate</div>
                <div style={{ fontFamily: F.mono, fontSize: 38, fontWeight: 700, letterSpacing: -1.5, color: '#fff', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{fmtFull(aLo)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <div style={{ padding: '3px 9px', background: 'rgba(255,255,255,.12)', borderRadius: 100, fontFamily: F.mono, fontSize: 10, color: 'rgba(255,255,255,.8)' }}>RANGE</div>
                    <div style={{ fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,.75)', fontVariantNumeric: 'tabular-nums' }}>{fmtFull(aLo)} – {fmtFull(aHi)}</div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
                    {trades.map((t, i) => <div key={i} style={{ flex: t.pct, background: t.color }} />)}
                </div>
            </div>

            {/* Breakdown — with edit tags */}
            <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}><Lbl>Trade breakdown</Lbl><div style={{ fontFamily: F.body, fontSize: 12, color: C.blue, fontWeight: 600 }}>Tap to edit</div></div>
                <div style={{ background: C.white, border: `1px solid ${C.hair}`, borderRadius: 18, padding: '4px 16px' }}>
                    {trades.map((t, i) => <div key={i} style={{ padding: '12px 0', borderBottom: i < trades.length - 1 ? `1px solid ${C.hair}` : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: t.color, flexShrink: 0 }} /><span style={{ fontFamily: F.body, fontSize: 14, color: C.ink, fontWeight: 500 }}>{t.label}</span></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontFamily: F.mono, fontSize: 13, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{fmt(t.lo)}–{fmt(t.hi)}</span>
                                <div style={{ padding: '2px 7px', background: C.blueSoft, borderRadius: 6, fontFamily: F.body, fontSize: 11, color: C.blue, cursor: 'pointer' }}>edit</div>
                            </div>
                        </div>
                        <div style={{ height: 4, background: C.paper, borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', width: `${t.pct}%`, background: t.color, borderRadius: 2 }} /></div>
                    </div>)}
                </div>
            </div>
            <div style={{ marginTop: 12, padding: '12px 16px', background: C.white, border: `1px solid ${C.hair}`, borderRadius: 14, fontFamily: F.body, fontSize: 13 }}>
                <div style={{ color: C.ink3 }}>{data.address}</div>
                <div style={{ color: C.ink, fontWeight: 500, marginTop: 2 }}>{FINISH_OPTS.find(f => f.id === finish)?.label} finish · {rooms.length} room{rooms.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ height: 12 }} />
        </div>
        <div style={{ padding: '8px 22px 14px', display: 'flex', gap: 9 }}>
            <Ghost onClick={() => { }} style={{ flex: 1 }}>Save</Ghost>
            <Btn color={C.orange} style={{ flex: 1.5 }} onClick={() => alert('Find local builders — coming soon!')}>Find pros</Btn>
        </div>
        <HBar />
    </div>;
}

// Free save (email capture)
function SSave({ data, onChange, onSubmit, onBack }) {
    const [lo, hi] = calcEst(data.rooms || [], data.roomSizes || {}, data.finish || 'standard');
    const [loading, setLoading] = useState(false);
    const ok = data.name?.trim().length > 1 && data.email?.includes('@');
    const submit = async () => { setLoading(true); await new Promise(r => setTimeout(r, 900)); setLoading(false); onSubmit(); };
    return <div className="BEs" style={{ background: C.paper }}>
        <SBar /><NavRow onBack={onBack} />
        <H1 sub="We'll send it as a free PDF — no spam, ever.">Save your estimate</H1>
        <div style={{ flex: 1, padding: '20px 22px 0' }}>
            <div style={{ background: C.ink, borderRadius: 16, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div><div style={{ fontFamily: F.body, fontSize: 11, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .5 }}>Your estimate</div><div style={{ fontFamily: F.mono, fontSize: 20, fontWeight: 600, color: '#fff', marginTop: 3 }}>{fmtFull(lo)} – {fmtFull(hi)}</div></div>
                <div style={{ padding: '4px 10px', background: 'rgba(255,255,255,.1)', borderRadius: 100, fontFamily: F.mono, fontSize: 11, color: 'rgba(255,255,255,.6)' }}>FREE</div>
            </div>
            {[{ ph: 'Your name', key: 'name', type: 'text' }, { ph: 'Email address', key: 'email', type: 'email' }].map(f => (
                <div key={f.key} style={{ height: 52, padding: '0 16px', background: C.white, border: `1.5px solid ${data[f.key]?.length > 0 ? C.blue : C.hair}`, borderRadius: 14, display: 'flex', alignItems: 'center', marginBottom: 10, transition: 'border-color .15s' }}>
                    <input type={f.type} placeholder={f.ph} value={data[f.key] || ''} onChange={e => onChange({ [f.key]: e.target.value })} style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: F.body, fontSize: 15, color: C.ink }} />
                </div>
            ))}
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.ink3, textAlign: 'center', marginBottom: 14 }}>No password needed · Unsubscribe any time</div>
            <Card>
                <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Want the full trade-by-trade breakdown?</div>
                <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink2, lineHeight: '18px', marginBottom: 12 }}>Get an itemised report for just $29 — shareable with your broker or builder.</div>
                <Btn color={C.orange}>Full report — $29</Btn>
            </Card>
        </div>
        <BRow><Btn color={C.blue} onClick={submit} disabled={!ok || loading}>{loading ? 'Sending…' : 'Send my free PDF →'}</Btn></BRow>
        <HBar />
    </div>;
}

// ─── Step map & orchestrator ──────────────────────────────────────────────────
const STEP_MAP = [
    'welcome', 'address', 'contact', 'scope', 'rooms', 'sizing', 'ballpark',
    'savefree',
    'upload', 'confirm', 'site', 'council', 'demo', 'living', 'structural',
    'generating', 'report',
];

export default function BuildEstimator() {
    const [idx, setIdx] = useState(0);
    const [form, setForm] = useState({
        address: '', propertyData: null, projectScope: null,
        rooms: [], roomSizes: {}, finish: 'standard',
        name: '', email: '', hasDocument: false, docName: '',
        siteConditions: {}, councilData: {}, demoScope: {}, livingSituation: null, structural: {},
    });
    const up = useCallback(p => setForm(f => ({ ...f, ...p })), []);
    const goTo = useCallback(n => setIdx(STEP_MAP.indexOf(n)), []);
    const next = useCallback(() => setIdx(i => i + 1), []);
    const back = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
    const step = STEP_MAP[idx];

    return <>
        <style>{CSS}</style>
        <div className="BE">
            <div className="BEw">
                {step === 'welcome' && <S0 onStart={next} />}
                {step === 'address' && <S1 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'contact' && <S1b data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'scope' && <S2 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'rooms' && <S3 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'sizing' && <S4 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'ballpark' && <S5 data={form} onChange={up} onPay={() => goTo('upload')} onSave={() => goTo('savefree')} />}
                {step === 'savefree' && <SSave data={form} onChange={up} onSubmit={next} onBack={() => goTo('ballpark')} />}
                {step === 'upload' && <S7 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'confirm' && <S8 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'site' && <S9 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'council' && <S10 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'demo' && <S11 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'living' && <S12 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'structural' && <S13 data={form} onChange={up} onContinue={next} onBack={back} />}
                {step === 'generating' && <S14 onDone={next} />}
                {step === 'report' && <S15 data={form} />}
            </div>
        </div>
    </>;
}
