// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Plotly from "plotly.js-dist-min";
import { useSuiteStore } from "../../../stores/suiteStore";
import { useLocation } from "react-router-dom";
import { Eye, Image as ImageIcon, Clock, Save, Download, Info, Activity, Layers } from 'lucide-react';
import ToolLayout from "../../shared/ToolLayout";
import { 
  loadImageFromUrl, 
  timeseriesJsonToLabels, 
  makeResultPayload 
} from "./adapters";

// ─── Global constants ─────────────────────────────────────────────────────────

const MAX_TOKENS  = 22;
const T_MAX       = 1000;
const CANVAS_SIZE = 320;
const MA_SEED     = 42;
const MA_INPUT    = 8;
const MA_SEQ_LEN  = 50;

const EXAMPLES = [
  "The archive holds what the present forgets. Memory is not neutral. Whose history survives depends on who built the walls.",
  "Oral histories dissolve at the edges. What the elder remembers and what the document records are never the same thing.",
  "Time does not pass equally for everyone. Some decades collapse into a single footnote. Others sprawl across centuries of scholarship.",
  "Language carries its own temporality. The words we use to name the past were not the words spoken inside it.",
];

const DEFAULT_EVENTS = [
  "1950 — oral tradition","1951 — local archive","1952 — flood","1953 — harvest",
  "1954 — migration","1955 — school opens","1956 — factory","1957 — fire",
  "1958 — recovery","1959 — census","1960 — independence","1961 — constitution",
  "1962 — drought","1963 — protest","1964 — broadcast","1965 — library built",
  "1966 — epidemic","1967 — election","1968 — uprising","1969 — peace accord",
  "1970 — photographs","1971 — displacement","1972 — land reform","1973 — famine",
  "1974 — rebuilding","1975 — radio tower","1976 — strike","1977 — museum opens",
  "1978 — border change","1979 — revolution","1980 — new government","1981 — rationing",
  "1982 — children born","1983 — demolition","1984 — surveillance","1985 — newspaper",
  "1986 — accident","1987 — memorial","1988 — market opens","1989 — walls fall",
  "1990 — reunification","1991 — collapse","1992 — diaspora","1993 — ceasefire",
  "1994 — transition","1995 — internet","1996 — election","1997 — handover",
  "1998 — debt crisis","1999 — present day",
];

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:          "#99B2DD",
  surface:     "#ffffff",
  border:      "#832161",
  borderLight: "rgba(131,33,97,0.18)",
  ink:         "#000100",
  ink2:        "#444444",
  ink3:        "#888888",
  amber:       "#832161",
  amberBg:     "rgba(131,33,97,0.08)",
  red:         "#cc0000",
  serif:       '"Lexend", sans-serif',
  mono:        '"Courier New", Courier, monospace',
  sans:        '"Lexend", sans-serif',
};

const HEATMAP_CS = [
  [0, "#ffffff"],[0.15,"#f0d0e0"],[0.4,"#c44a90"],[0.7,"#832161"],[1,"#3d0f2e"],
];

// ─── Module 1 math ────────────────────────────────────────────────────────────

function softmax(row) {
  const fin = row.filter(isFinite);
  if (!fin.length) return row.map(() => 0);
  const m = Math.max(...fin);
  const e = row.map(v => (isFinite(v) ? Math.exp(v - m) : 0));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(v => (s ? v / s : 0));
}

function buildMatrix(n, lam) {
  return Array.from({ length: n }, (_, i) =>
    softmax(Array.from({ length: n }, (_, j) => (j > i ? -Infinity : -lam * (i - j))))
  );
}

function tokenize(text) {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, MAX_TOKENS);
}

// ─── Module 2 math ────────────────────────────────────────────────────────────

const ALPHAS_CUMPROD = (() => {
  const s = 0.008, raw = new Float64Array(T_MAX + 1);
  for (let t = 0; t <= T_MAX; t++)
    raw[t] = Math.cos(((t / T_MAX + s) / (1 + s)) * Math.PI * 0.5) ** 2;
  const base = raw[0], ac = new Float64Array(T_MAX);
  for (let t = 0; t < T_MAX; t++) ac[t] = raw[t] / base;
  return ac;
})();

function makePrng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateNoise(size, seed) {
  const n = size * size * 3, buf = new Float32Array(n), rand = makePrng(seed);
  for (let i = 0; i < n; i += 2) {
    const u1 = rand() + 1e-10, u2 = rand(), mag = Math.sqrt(-2 * Math.log(u1));
    buf[i] = mag * Math.cos(2 * Math.PI * u2);
    if (i + 1 < n) buf[i + 1] = mag * Math.sin(2 * Math.PI * u2);
  }
  return buf;
}

function applyNoise(srcData, noise, t) {
  const aBar = ALPHAS_CUMPROD[t], sa = Math.sqrt(aBar), sn = Math.sqrt(1 - aBar);
  const out = new Uint8ClampedArray(srcData.length);
  let ni = 0;
  for (let i = 0; i < srcData.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const x0 = srcData[i + c] / 127.5 - 1;
      out[i + c] = Math.round(Math.min(255, Math.max(0, (sa * x0 + sn * noise[ni++] + 1) * 127.5)));
    }
    out[i + 3] = 255;
  }
  return out;
}

function makeDemoImage(size) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const band = Math.floor(y / (size / 12)), dark = band % 2 === 0 ? 0.88 : 0.78;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4, scr = (Math.sin(x * 0.35 + band * 2.1) * 0.5 + 0.5) * 0.18;
      const v = Math.round((dark - scr) * 210);
      data[i] = v + 12; data[i+1] = v + 6; data[i+2] = v - 8; data[i+3] = 255;
    }
  }
  return data;
}

// ─── Module 3 math (pure-JS BPTT) ────────────────────────────────────────────

function mv(M, v, H, D) {
  const out = new Float64Array(H);
  for (let r = 0; r < H; r++) { let s = 0; for (let c = 0; c < D; c++) s += M[r*D+c]*v[c]; out[r] = s; }
  return out;
}
function mvT(M, v, H, D) {
  const out = new Float64Array(D);
  for (let c = 0; c < D; c++) { let s = 0; for (let r = 0; r < H; r++) s += M[r*D+c]*v[r]; out[c] = s; }
  return out;
}
const sig3 = x => 1 / (1 + Math.exp(-x));
const vnorm = v => { let s = 0; for (const x of v) s += x*x; return Math.sqrt(s); };
function cosSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d < 1e-12 ? 0 : dot / d;
}
function rw(H, D, seed) {
  const sc = Math.sqrt(2/(H+D)), M = new Float64Array(H*D), rand = makePrng(seed);
  for (let i = 0; i < H*D; i += 2) {
    const g = Math.sqrt(-2*Math.log(rand()+1e-10));
    M[i] = g * Math.cos(2*Math.PI*rand()) * sc;
    if (i+1 < H*D) M[i+1] = g * Math.sin(2*Math.PI*rand()) * sc;
  }
  return M;
}
function randSeq(T, I, seed) {
  const rand = makePrng(seed + 9999);
  return Array.from({length:T}, () => {
    const x = new Float64Array(I);
    for (let i = 0; i < I; i += 2) {
      const g = Math.sqrt(-2*Math.log(rand()+1e-10));
      x[i] = g*Math.cos(2*Math.PI*rand());
      if (i+1 < I) x[i+1] = g*Math.sin(2*Math.PI*rand());
    }
    return x;
  });
}

function runRNN(T, I, H, seed) {
  const Wxh = rw(H,I,seed), Whh = rw(H,H,seed+1), xs = randSeq(T,I,seed);
  const hs = [new Float64Array(H)];
  for (let t = 0; t < T; t++) {
    const h = new Float64Array(H), xp = mv(Wxh,xs[t],H,I), hp = mv(Whh,hs[t],H,H);
    for (let i = 0; i < H; i++) h[i] = Math.tanh(xp[i]+hp[i]);
    hs.push(h);
  }
  const hT = hs[T]; let dh = new Float64Array(H).fill(1);
  const gradMags = new Float32Array(T), simVals = new Float32Array(T);
  for (let t = 0; t < T; t++) simVals[t] = cosSim(hs[t+1], hT);
  for (let t = T-1; t >= 0; t--) {
    const delta = new Float64Array(H);
    for (let i = 0; i < H; i++) delta[i] = dh[i] * (1 - hs[t+1][i]**2);
    gradMags[t] = vnorm(mvT(Wxh,delta,H,I));
    dh = mvT(Whh,delta,H,H);
  }
  return { gradMags, simVals };
}

function runLSTM(T, I, H, seed) {
  const Wi=rw(H,I,seed+10),Hi=rw(H,H,seed+11),Wf=rw(H,I,seed+12),Hf=rw(H,H,seed+13);
  const Wg=rw(H,I,seed+14),Hg=rw(H,H,seed+15),Wo=rw(H,I,seed+16),Ho=rw(H,H,seed+17);
  const xs = randSeq(T,I,seed);
  const hs=[new Float64Array(H)], cs=[new Float64Array(H)];
  const Is=[],Fs=[],Gs=[],Os=[],Cts=[];
  for (let t = 0; t < T; t++) {
    const x=xs[t],hp=hs[t],cp=cs[t];
    const ii=new Float64Array(H),ff=new Float64Array(H),gg=new Float64Array(H),oo=new Float64Array(H);
    const xi=mv(Wi,x,H,I),hi=mv(Hi,hp,H,H),xf=mv(Wf,x,H,I),hf=mv(Hf,hp,H,H);
    const xg=mv(Wg,x,H,I),hg=mv(Hg,hp,H,H),xo=mv(Wo,x,H,I),ho=mv(Ho,hp,H,H);
    for (let i=0;i<H;i++){ii[i]=sig3(xi[i]+hi[i]);ff[i]=sig3(xf[i]+hf[i]);gg[i]=Math.tanh(xg[i]+hg[i]);oo[i]=sig3(xo[i]+ho[i]);}
    const c=new Float64Array(H),h=new Float64Array(H),ct=new Float64Array(H);
    for (let i=0;i<H;i++){c[i]=ff[i]*cp[i]+ii[i]*gg[i];ct[i]=Math.tanh(c[i]);h[i]=oo[i]*ct[i];}
    hs.push(h);cs.push(c);Is.push(ii);Fs.push(ff);Gs.push(gg);Os.push(oo);Cts.push(ct);
  }
  const hT=hs[T]; let dh=new Float64Array(H).fill(1), dc=new Float64Array(H);
  const gradMags=new Float32Array(T), simVals=new Float32Array(T);
  for (let t=0;t<T;t++) simVals[t]=cosSim(hs[t+1],hT);
  for (let t=T-1;t>=0;t--) {
    const ii=Is[t],ff=Fs[t],gg=Gs[t],oo=Os[t],ct=Cts[t],cp=cs[t];
    const dc_=new Float64Array(H);
    for (let i=0;i<H;i++) dc_[i]=dh[i]*oo[i]*(1-ct[i]**2)+dc[i];
    const do_=new Float64Array(H),di=new Float64Array(H),df=new Float64Array(H),dg=new Float64Array(H);
    for (let i=0;i<H;i++){do_[i]=dh[i]*ct[i]*oo[i]*(1-oo[i]);di[i]=dc_[i]*gg[i]*ii[i]*(1-ii[i]);df[i]=dc_[i]*cp[i]*ff[i]*(1-ff[i]);dg[i]=dc_[i]*ii[i]*(1-gg[i]**2);}
    const dx=new Float64Array(I);
    const dxi=mvT(Wi,di,H,I),dxf=mvT(Wf,df,H,I),dxg=mvT(Wg,dg,H,I),dxo=mvT(Wo,do_,H,I);
    for (let i=0;i<I;i++) dx[i]=dxi[i]+dxf[i]+dxg[i]+dxo[i];
    gradMags[t]=vnorm(dx);
    const dhi=mvT(Hi,di,H,H),dhf=mvT(Hf,df,H,H),dhg=mvT(Hg,dg,H,H),dho=mvT(Ho,do_,H,H);
    dh=new Float64Array(H); for (let i=0;i<H;i++) dh[i]=dhi[i]+dhf[i]+dhg[i]+dho[i];
    dc=new Float64Array(H); for (let i=0;i<H;i++) dc[i]=dc_[i]*ff[i];
  }
  return { gradMags, simVals };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function EpistemicNote({ children }) {
  return (
    <div style={{ marginTop:28, padding:"12px 16px", background:C.amberBg,
      border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.amber}`,
      borderRadius:3, fontSize:13, fontFamily:C.sans, color:C.ink2, lineHeight:1.65 }}>
      <span style={{ fontFamily:C.mono, fontSize:11, color:C.amber,
        textTransform:"uppercase", letterSpacing:"0.1em", marginRight:10 }}>
        Epistemic note
      </span>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize:11, fontFamily:C.mono, color:C.amber,
      textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:7 }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ padding:"12px 14px", background:C.surface,
      border:`1px solid ${C.border}`, borderRadius:4 }}>
      <Label>{label}</Label>
      <div style={{ fontSize:20, fontFamily:C.mono, color:C.ink, fontWeight:600 }}>
        {value}
        {sub && <span style={{ fontSize:12, color:C.ink3, marginLeft:5, fontWeight:400 }}>{sub}</span>}
      </div>
    </div>
  );
}

function ExportBtn({ label, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      style={{ padding:"5px 12px", background:"transparent",
        color: disabled ? C.ink3 : C.amber,
        border:`1px solid ${disabled ? C.borderLight : C.amber}`,
        borderRadius:3, fontFamily:C.mono, fontSize:10, letterSpacing:"0.06em",
        cursor: disabled ? "not-allowed" : "pointer", transition:"all 0.1s" }}>
      ↓ {label}
    </button>
  );
}

function Btn({ children, onClick, active, small, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: small ? "3px 9px" : "7px 14px",
        background: active ? C.ink : "transparent",
        color: active ? C.surface : C.ink3,
        border:`1px solid ${C.border}`, borderRadius:3,
        fontFamily:C.mono, fontSize: small ? 10 : 11,
        cursor: disabled ? "not-allowed" : "pointer",
        transition:"background 0.1s, color 0.1s",
        opacity: disabled ? 0.5 : 1,
        ...style }}>
      {children}
    </button>
  );
}

/**
 * Shared selector for loading data from the Suite's store.
 */
function SuiteSourceSelector({ typeFilter, onLoad, label = "Load from Suite" }) {
  const { dataset } = useSuiteStore();
  const [selectedId, setSelectedId] = useState("");

  const filteredItems = useMemo(() => {
    if (Array.isArray(typeFilter)) {
      return dataset.filter(item => typeFilter.includes(item.type));
    }
    return dataset.filter(item => item.type === typeFilter);
  }, [dataset, typeFilter]);

  if (filteredItems.length === 0) return null;

  const activeItem = filteredItems.find(i => i.id === selectedId);

  return (
    <div style={{ 
      padding: "12px", 
      background: "rgba(131,33,97,0.04)", 
      border: `1px solid ${C.border}`, 
      borderRadius: 4,
      marginBottom: 16 
    }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", gap: 8 }}>
        <select 
          value={selectedId} 
          onChange={e => setSelectedId(e.target.value)}
          style={{ 
            flex: 1, 
            padding: "6px", 
            fontFamily: C.mono, 
            fontSize: 11,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 3,
            color: C.ink,
            outline: "none"
          }}
        >
          <option value="">Select a record...</option>
          {filteredItems.map(item => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.type})
            </option>
          ))}
        </select>
        <Btn 
          small 
          disabled={!selectedId} 
          onClick={() => onLoad(activeItem)}
        >
          Load
        </Btn>
      </div>
    </div>
  );
}

// ─── Module 1: The Attention Lens ─────────────────────────────────────────────

function AttentionLens({ modeToggle, initialSuiteData }: { modeToggle: React.ReactNode, initialSuiteData: any }) {
  const { updateItemResult } = useSuiteStore();
  const [text,   setText]   = useState(EXAMPLES[0]);
  const [lambda, setLambda] = useState(0);
  const [loadedItemId, setLoadedItemId] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const plotRef = useRef(null);

  useEffect(() => {
    if (initialSuiteData) {
      setText(initialSuiteData.content);
      setLoadedItemId(initialSuiteData.id);
    }
  }, [initialSuiteData]);

  const tokens = useMemo(() => tokenize(text), [text]);
  const matrix = useMemo(() => buildMatrix(tokens.length, lambda), [tokens.length, lambda]);
  const labels = tokens.map(t => t.length > 11 ? t.slice(0,10) + "…" : t);
  const selfWt = tokens.length > 0
    ? (matrix[tokens.length-1][tokens.length-1]*100).toFixed(1) : "—";

  useEffect(() => {
    if (!plotRef.current || tokens.length === 0) return;
    const n = tokens.length;
    const tIndices = Array.from({length: n}, (_, i) => i);
    const annotations = n <= 14
      ? tokens.flatMap((_, i) => Array.from({length:i+1}, (_, j) => {
          const v = matrix[i][j];
          return { x:j, y:i, text:v.toFixed(2), showarrow:false, xref:"x", yref:"y",
            font:{size:9, family:C.mono, color: v > 0.45 ? "#FBF7EF" : "#1A160D"} };
        }))
      : [];
    Plotly.react(plotRef.current,
      [{ z:matrix, x:tIndices, y:tIndices, type:"heatmap", colorscale:HEATMAP_CS,
         zmin:0, zmax:1, showscale:true,
         colorbar:{thickness:12, len:0.85, tickfont:{size:9,family:C.mono},
           title:{text:"weight", font:{size:10,family:C.mono}, side:"right"}} }],
      { paper_bgcolor:"rgba(0,0,0,0)", plot_bgcolor:C.surface,
        margin:{t:16,r:72,b:110,l:104},
        xaxis:{title:{text:"Key position (past tokens)",font:{size:11,family:C.sans},standoff:12},
          tickmode: "array", tickvals: tIndices, ticktext: labels,
          tickangle:-42, tickfont:{size:9,family:C.mono}, showgrid:false, linecolor:C.border},
        yaxis:{title:{text:"Query position (present token)",font:{size:11,family:C.sans},standoff:12},
          tickmode: "array", tickvals: tIndices, ticktext: labels,
          tickfont:{size:9,family:C.mono}, showgrid:false, autorange:"reversed", linecolor:C.border},
        annotations, font:{family:C.sans, color:C.ink2} },
      { responsive:true, displayModeBar:false });
  }, [matrix, tokens, lambda]);

  const exportPng = () => plotRef.current &&
    Plotly.downloadImage(plotRef.current, {format:"png", filename:"deep-time-attention", width:900, height:560});

  const saveToSuite = async () => {
    if (!loadedItemId || !plotRef.current || saving) return;
    setSaving(true);
    try {
      const dataUrl = await Plotly.toImage(plotRef.current, { format: "png", width: 800, height: 500 });
      const payload = makeResultPayload("attention", {
        lambda,
        tokens: tokens.length,
        selfWeight: selfWt,
        visualization: dataUrl
      });
      updateItemResult(loadedItemId, "deep-time-attention", payload);
      alert("Analysis saved to Suite record.");
    } catch (err) {
      console.error(err);
      alert("Failed to save to Suite.");
    } finally {
      setSaving(false);
    }
  };

  const modeName = lambda === 0
    ? "Uniform causal prior — zero Q/K baseline"
    : `Recency-weighted prior — weight ∝ exp(−${lambda.toFixed(2)}·Δt)`;

  const mainContent = (
    <div className="h-full flex flex-col">
      {modeToggle}
      <div className="flex-1 flex flex-col p-6 min-h-0 bg-gray-50">
        <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden relative">
          <div className="px-4 py-2 border-b border-gray-200 bg-white flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Attention weight matrix</span>
            <div className="flex gap-2">
              <button onClick={exportPng} disabled={tokens.length === 0} className="text-[10px] font-bold text-main uppercase hover:opacity-80 disabled:opacity-50">
                <Download size={14} className="inline mr-1" /> EXPORT PNG
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {tokens.length === 0
              ? <div className="text-gray-400 text-sm italic">Type an English sentence to see its causal attention matrix...</div>
              : <div ref={plotRef} className="w-full h-full" role="img" aria-label="Attention weight matrix heatmap" />
            }
          </div>
        </div>
      </div>
    </div>
  );

  const sideContent = (
    <div className="flex flex-col gap-6 p-1">
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-2">
        <SuiteSourceSelector 
          typeFilter="text" 
          onLoad={item => {
            setText(item.content);
            setLoadedItemId(item.id);
          }} 
        />
        
        <label className="text-xs font-bold text-text-muted block mt-4 mb-2 uppercase tracking-tight">
          Input text
          {tokens.length >= MAX_TOKENS && <span className="text-[10px] text-red-600 font-mono ml-2">capped at {MAX_TOKENS}</span>}
        </label>
        <textarea value={text} onChange={e => setText(e.target.value)}
          className="w-full h-24 p-2 text-xs font-sans bg-white border border-gray-200 rounded text-gray-800 resize-y focus:outline-none focus:border-main"
          placeholder="Past events cast shadows..." />
        
        <div className="mt-2 flex gap-1 flex-wrap items-center">
          <span className="text-[10px] font-mono text-gray-500 mr-1">presets:</span>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setText(ex)} 
              className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${text === ex ? 'bg-black text-white border-black' : 'bg-transparent text-gray-500 border-gray-200 hover:border-gray-400'}`}>
              eg {i+1}
            </button>
          ))}
          <button onClick={() => setText("")} className="px-2 py-0.5 text-[10px] font-mono rounded border border-gray-200 bg-transparent text-gray-500 hover:border-gray-400">
            clear
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-bold block mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-main" />
          Attention Parameters
        </label>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
          <div className="flex justify-between mb-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">Memory decay rate (λ)</label>
            <span className="text-[10px] font-bold text-main">{lambda.toFixed(2)}</span>
          </div>
          <input type="range" min="0" max="2" step="0.05"
            value={lambda} onChange={e => setLambda(parseFloat(e.target.value))}
            className="dc-slider" />
          <p className="text-[9px] text-text-muted mt-1 opacity-70">
            {lambda === 0 ? "0.0 — uniform causal baseline." : lambda === 2 ? "2.0 — strong fading memory." : "Adjusts recency bias."}
          </p>
        </div>
        
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <label className="text-[10px] font-bold text-text-muted uppercase block border-b border-gray-100 pb-1 mb-2">Attention Prior Shape</label>
          <div className="text-xs font-mono text-gray-700 min-h-[2.5em]">{modeName}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-main"></div>
          <span className="text-sm font-bold">Analysis Output</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="bg-white p-2 rounded border border-gray-100">
            <span className="block text-[10px] text-text-muted uppercase">Tokens</span>
            <span className="font-bold">{tokens.length}</span>
          </div>
          <div className="bg-white p-2 rounded border border-gray-100">
            <span className="block text-[10px] text-text-muted uppercase" title="How much the final token attends to itself">Self-Weight (last)</span>
            <span className="font-bold">{selfWt}{selfWt !== "—" ? "%" : ""}</span>
          </div>
        </div>

        {loadedItemId && (
          <button onClick={saveToSuite} disabled={saving || tokens.length === 0} 
            className="w-full flex items-center justify-center gap-2 py-2 bg-main text-white text-xs font-bold uppercase rounded hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save size={14} /> {saving ? "SAVING..." : "SAVE BACK TO SUITE"}
          </button>
        )}
      </div>

      <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 text-[10px] text-amber-800 leading-relaxed font-sans italic">
        <strong>Epistemic Note:</strong> This is a synthetic attention matrix simulating Transformer mechanics. Standard models (λ=0) treat all prior tokens equally; applying a decay scalar recovers human-like temporal degradation.
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Attention Lens"
      subtitle="Exposing how transformer architecture intrinsically flattens temporal sequence into geometric space."
      mainContent={mainContent}
      sideContent={sideContent}
    />
  );
}

// ─── Module 2: The Diffusion Scrubber ────────────────────────────────────────

function DiffusionScrubber({ modeToggle, initialSuiteData }: { modeToggle: React.ReactNode, initialSuiteData: any }) {
  const { updateItemResult } = useSuiteStore();
  const [timestep,  setTimestep]  = useState(0);
  const [srcPixels, setSrcPixels] = useState<any>(null);
  const [noise,     setNoise]     = useState<any>(null);
  const [filename,  setFilename]  = useState("Synthetic demo — structured latent");
  const [dragging,  setDragging]  = useState(false);
  const [strips,    setStrips]    = useState<any>(null);
  const [loadedItemId, setLoadedItemId] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (initialSuiteData) {
      loadImageFromUrl(initialSuiteData.content, generateNoise, initialSuiteData.name).then(({ imageData, noise, name }) => {
        setSrcPixels(imageData);
        setNoise(noise);
        setFilename(name);
        setLoadedItemId(initialSuiteData.id);
        setTimestep(0);
      }).catch(err => console.error("Initial load failed", err));
    }
  }, [initialSuiteData]);
  const fileRef   = useRef(null);

  useEffect(() => {
    const raw = makeDemoImage(CANVAS_SIZE);
    setSrcPixels(new ImageData(new Uint8ClampedArray(raw), CANVAS_SIZE, CANVAS_SIZE));
    setNoise(generateNoise(CANVAS_SIZE, 42));
  }, []);

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setFilename(file.name); setTimestep(0);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = off.height = CANVAS_SIZE;
      const s = Math.min(img.width, img.height);
      off.getContext("2d").drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      setSrcPixels(off.getContext("2d").getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
      setNoise(generateNoise(CANVAS_SIZE, (file.size ^ file.lastModified) >>> 0));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  useEffect(() => {
    if (!srcPixels || !noise) return;
    const SIZE = 72, steps = [0, 200, 400, 600, 800, 999];
    setStrips(steps.map(t => {
      const noisy = applyNoise(srcPixels.data, noise, t);
      const full  = document.createElement("canvas"); full.width = full.height = CANVAS_SIZE;
      full.getContext("2d").putImageData(new ImageData(noisy, CANVAS_SIZE, CANVAS_SIZE), 0, 0);
      const thumb = document.createElement("canvas"); thumb.width = thumb.height = SIZE;
      thumb.getContext("2d").drawImage(full, 0, 0, SIZE, SIZE);
      return { t, dataUrl: thumb.toDataURL("image/jpeg", 0.82) };
    }));
  }, [srcPixels, noise]);

  useEffect(() => {
    if (!canvasRef.current || !srcPixels || !noise) return;
    const noisy = applyNoise(srcPixels.data, noise, timestep);
    canvasRef.current.getContext("2d").putImageData(new ImageData(noisy, CANVAS_SIZE, CANVAS_SIZE), 0, 0);
  }, [timestep, srcPixels, noise]);

  const aBar = ALPHAS_CUMPROD[timestep];
  const signalPct = (aBar * 100).toFixed(1), noisePct = ((1-aBar)*100).toFixed(1);

  const exportFrame = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = `deep-time-diffusion-t${timestep}.png`;
    a.click();
  };

  const saveToSuite = async () => {
    if (!loadedItemId || !canvasRef.current || saving) return;
    setSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const payload = makeResultPayload("diffusion", {
        timestep,
        signalPercent: signalPct,
        noisePercent: noisePct,
        visualization: dataUrl
      });
      updateItemResult(loadedItemId, "deep-time-diffusion", payload);
      alert("Analysis saved to Suite record.");
    } catch (err) {
      console.error(err);
      alert("Failed to save to Suite.");
    } finally {
      setSaving(false);
    }
  };

  const mainContent = (
    <div className="h-full flex flex-col">
      {modeToggle}
      <div className="flex-1 p-6 flex flex-col items-center justify-center bg-gray-50 overflow-hidden relative">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Target Process State (t={timestep})</span>
            <div className="flex gap-2">
              <button onClick={exportFrame} disabled={!srcPixels} className="text-[10px] font-bold text-main uppercase hover:opacity-80 disabled:opacity-50">
                <Download size={14} className="inline mr-1" /> EXPORT PNG
              </button>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gray-100 rounded" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
            <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="block w-full h-full"
              aria-label={`Artifact at diffusion timestep ${timestep}`} />
          </div>
        </div>

        {strips && (
          <div className="w-full max-w-[600px] mt-8 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <label className="text-xs font-bold uppercase tracking-wide text-text-muted mb-3 block">Evolution history</label>
            <div className="flex gap-2">
              {strips.map(({t, dataUrl}) => (
                <div key={t} role="button" tabIndex={0}
                  aria-label={`Jump to timestep ${t}`} aria-pressed={timestep===t}
                  onClick={() => setTimestep(t)}
                  onKeyDown={e => e.key==="Enter" && setTimestep(t)}
                  className={`cursor-pointer flex-1 border-2 rounded overflow-hidden transition-colors ${timestep === t ? 'border-[var(--color-main)]' : 'border-gray-200 hover:border-gray-300'}`}>
                  <img src={dataUrl} className="block w-full" alt={`t=${t}`} />
                  <div className="text-center text-[9px] font-mono text-gray-500 bg-gray-50 py-0.5">t={t}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const sideContent = (
    <div className="flex flex-col gap-6 p-1">
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-2">
        <label className="text-xs font-bold text-text-muted block mb-2 uppercase tracking-tight">Load Historical Artifact</label>
        <SuiteSourceSelector 
          typeFilter="image" 
          onLoad={async item => {
            try {
              const { imageData, noise, name } = await loadImageFromUrl(item.content, generateNoise, item.name);
              setSrcPixels(imageData);
              setNoise(noise);
              setFilename(name);
              setLoadedItemId(item.id);
              setTimestep(0);
            } catch (err) {
              alert("Failed to load image from Suite: " + err.message);
            }
          }} 
        />
        
        <div role="button" tabIndex={0} aria-label="Upload image — click or drag and drop"
             onDrop={e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); }}
             onDragOver={e => { e.preventDefault(); setDragging(true); }}
             onDragLeave={() => setDragging(false)}
             onClick={() => fileRef.current?.click()}
             onKeyDown={e => e.key === "Enter" && fileRef.current?.click()}
             className={`mt-4 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${dragging ? 'bg-amber-50 border-amber-600' : 'bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-gray-400'}`}>
          <ImageIcon size={20} className="text-gray-400" />
          <div className="text-xs font-sans text-gray-600">Drop image or click</div>
          <div className="text-[10px] font-mono text-gray-400">JPEG · PNG · WebP</div>
          <input ref={fileRef} type="file" accept="image/*" aria-hidden="true"
                 className="hidden" onChange={e => loadFile(e.target.files[0])} />
        </div>
      </div>

      <div>
        <label className="text-sm font-bold block mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-main" />
          Forward Process parameters
        </label>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">Timestep (t)</label>
            <span className="text-sm font-bold font-mono text-main">{timestep} <span className="text-[10px] text-gray-400">/ 999</span></span>
          </div>
          <input type="range" min={0} max={999} step={1} value={timestep}
            onChange={e => setTimestep(parseInt(e.target.value))}
            className="dc-slider" />
          <div className="flex justify-between text-[9px] font-mono text-gray-500 mt-1">
            <span>0=artifact</span>
            <span>999=noise</span>
          </div>
          
          <div className="flex items-center gap-1 mt-4">
            <span className="text-[9px] font-bold text-gray-500 uppercase whitespace-nowrap mr-1">T-JUMP:</span>
            {[0,100,500,999].map(t => (
              <button key={t} onClick={() => setTimestep(t)} 
                className={`flex-1 py-1 text-[10px] font-mono rounded border transition-colors ${timestep===t ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 pt-4 border-t border-gray-100">
        <label className="text-[10px] font-bold text-text-muted uppercase block mb-2">Signal / Noise Ratio</label>
        <div className="h-4 rounded overflow-hidden flex border border-gray-300 bg-gray-100">
          <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${signalPct}%` }} title={`Signal: ${signalPct}%`} />
          <div className="h-full bg-[var(--color-main)] transition-all duration-150" style={{ flex: 1 }} title={`Noise: ${noisePct}%`} />
        </div>
        <div className="flex justify-between text-[9px] font-mono mt-1">
          <span className="text-blue-600">ᾱ: {aBar.toFixed(4)}</span>
          <span className="text-[var(--color-main)]">1-ᾱ: {(1-aBar).toFixed(4)}</span>
        </div>
        
        {loadedItemId && srcPixels && (
          <button onClick={saveToSuite} disabled={saving} 
            className="w-full flex items-center justify-center gap-2 py-2 mt-6 bg-main text-white text-xs font-bold uppercase rounded hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save size={14} /> {saving ? "SAVING..." : "SAVE BACK TO SUITE"}
          </button>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-[10px] text-blue-800 leading-relaxed font-sans italic">
        <strong>Epistemic Note:</strong> Noise is applied in raw RGB space to avoid a 250MB latent VAE dependency, but the mathematical cosine schedule <em>q(x_t | x₀)</em> holds identical meaning. We are watching structure yield to algorithmic equilibrium.
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Diffusion Scrubber"
      subtitle="Examine the irreversible march of data entropy through the forward diffusion process."
      mainContent={mainContent}
      sideContent={sideContent}
    />
  );
}

// ─── Module 3: The Memory Audit ──────────────────────────────────────────────

const HIDDEN_OPTIONS = [8, 16, 32, 64];
const RNN_COL  = "#832161";
const LSTM_COL = "#4B7BBE";

function MemoryAudit({ modeToggle, initialSuiteData }: { modeToggle: React.ReactNode, initialSuiteData: any }) {
  const { updateItemResult } = useSuiteStore();
  const [rawLabels,  setRawLabels]  = useState(DEFAULT_EVENTS.join("\n"));
  const [hiddenSize, setHiddenSize] = useState(32);
  const [showCos,    setShowCos]    = useState(true);
  const [result,     setResult]     = useState<any>(null);
  const [computing,  setComputing]  = useState(false);
  const [loadedItemId, setLoadedItemId] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const plotLinRef = useRef(null), plotLogRef = useRef(null), plotCosRef = useRef(null);

  useEffect(() => {
    if (initialSuiteData) {
      setRawLabels(initialSuiteData.content);
      setLoadedItemId(initialSuiteData.id);
    }
  }, [initialSuiteData]);

  const parseLabels = raw => raw.split("\n").map(s=>s.trim()).filter(Boolean).slice(0, MA_SEQ_LEN);

  const runAnalysis = useCallback((H) => {
    setComputing(true);
    setTimeout(() => {
      const evts = parseLabels(rawLabels), T = evts.length;
      setResult({ rnn:runRNN(T,MA_INPUT,H,MA_SEED), lstm:runLSTM(T,MA_INPUT,H,MA_SEED), labels:evts, T, H });
      setComputing(false);
    }, 10);
  }, [rawLabels]);

  useEffect(() => { runAnalysis(hiddenSize); }, []);

  const baseLayout = (labels, T) => ({
    paper_bgcolor:"rgba(0,0,0,0)", plot_bgcolor:C.surface,
    margin:{t:12,r:16,b:80,l:52}, font:{family:C.sans, color:C.ink2, size:10},
    legend:{font:{size:10,family:C.sans}, bgcolor:"rgba(0,0,0,0)"},
    xaxis:{ tickangle:-45, tickfont:{size:8,family:C.mono}, gridcolor:C.borderLight,
      linecolor:C.border, tickmode:"array",
      tickvals:Array.from({length:T},(_,i)=>i).filter((_,i)=>i%Math.max(1,Math.floor(T/10))===0),
      ticktext:labels.filter((_,i)=>i%Math.max(1,Math.floor(T/10))===0),
      title:{text:"Historical timestep",font:{size:10},standoff:8} },
  });

  useEffect(() => {
    if (!result) return;
    const {rnn, lstm, labels, T} = result;
    const t  = Array.from({length:T},(_,i)=>i);
    const bl = baseLayout(labels, T);
    const yAx = (title, extra={}) => ({title:{text:title,font:{size:10},standoff:6},
      gridcolor:C.borderLight, linecolor:C.border, tickfont:{size:8,family:C.mono}, ...extra});
    const ann = text => [{x:0.02,y:0.97,xref:"paper",yref:"paper",showarrow:false,
      text, font:{size:10,family:C.mono,color:C.ink3}, align:"left"}];
    const tr  = (y, name, color) => ({x:t, y:Array.from(y), type:"scatter", mode:"lines",
      name, line:{color,width:2}});
    const shape = {type:"line",x0:T-1,x1:T-1,y0:0,y1:1,yref:"paper",line:{color:C.ink3,width:1,dash:"dot"}};
    const opts  = {responsive:true, displayModeBar:false};

    if (plotLinRef.current)
      Plotly.react(plotLinRef.current, [tr(rnn.gradMags,"Vanilla RNN",RNN_COL), tr(lstm.gradMags,"LSTM",LSTM_COL)],
        {...bl, shapes:[shape], yaxis:yAx("gradient magnitude"), annotations:ann("A — linear scale")}, opts);

    if (plotLogRef.current) {
      const EPS = 1e-18;
      Plotly.react(plotLogRef.current,
        [tr(Array.from(rnn.gradMags).map(v=>Math.max(v,EPS)),"Vanilla RNN",RNN_COL),
         tr(Array.from(lstm.gradMags).map(v=>Math.max(v,EPS)),"LSTM",LSTM_COL)],
        {...bl, shapes:[shape], yaxis:yAx("gradient magnitude (log)",{type:"log"}),
         annotations:ann("B — log scale: both models vanish")}, opts);
    }
    if (plotCosRef.current && showCos) {
      Plotly.react(plotCosRef.current,
        [{x:t,y:Array.from(rnn.simVals),type:"scatter",mode:"lines",name:"Vanilla RNN",
          line:{color:RNN_COL,width:2},fill:"tozeroy",fillcolor:RNN_COL+"14"},
         {x:t,y:Array.from(lstm.simVals),type:"scatter",mode:"lines",name:"LSTM",
          line:{color:LSTM_COL,width:2},fill:"tozeroy",fillcolor:LSTM_COL+"14"}],
        {...bl, shapes:[shape,{type:"line",x0:0,x1:T-1,y0:0,y1:0,yref:"y",line:{color:C.ink,width:0.8,dash:"dot"}}],
         yaxis:yAx("cosine sim. to h(T)",{range:[-1.05,1.05]}),
         annotations:ann("C — hidden state similarity to present"),
         margin:{...bl.margin,b:90}}, opts);
    }
  }, [result, showCos]);

  const labels   = parseLabels(rawLabels), T = labels.length;
  const rnnMean  = result ? (Array.from(result.rnn.gradMags.slice(0,10)).reduce((a,b)=>a+b,0)/10).toExponential(2) : "—";
  const lstmMean = result ? (Array.from(result.lstm.gradMags.slice(0,10)).reduce((a,b)=>a+b,0)/10).toExponential(2) : "—";

  const exportCharts = () => {
    const opts = {format:"png", width:700, height:300};
    if (plotLinRef.current) Plotly.downloadImage(plotLinRef.current, {...opts, filename:"deep-time-gradient-linear"});
    if (plotLogRef.current) Plotly.downloadImage(plotLogRef.current, {...opts, filename:"deep-time-gradient-log"});
    if (showCos && plotCosRef.current) Plotly.downloadImage(plotCosRef.current, {...opts, width:1000, filename:"deep-time-cosine-sim"});
  };

  const saveToSuite = async () => {
    if (!loadedItemId || !result || saving) return;
    setSaving(true);
    try {
      const payload = makeResultPayload("memory", {
        hiddenSize: result.H,
        steps: result.T,
        rnnEarlyGradient: rnnMean,
        lstmEarlyGradient: lstmMean,
        timestamp: Date.now()
      });
      updateItemResult(loadedItemId, "deep-time-memory", payload);
      alert("Analysis results saved to Suite record.");
    } catch (err) {
      console.error(err);
      alert("Failed to save to Suite.");
    } finally {
      setSaving(false);
    }
  };

  const mainContent = (
    <div className="h-full flex flex-col">
      {modeToggle}
      <div className="flex-1 p-6 bg-gray-50 flex flex-col gap-4 overflow-y-auto">
        {!result ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-lg bg-white">
            Press "run analysis" to compute vanishing gradients...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div ref={plotLinRef} className="w-full h-[220px]" role="img" aria-label="Gradient magnitude linear scale" />
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div ref={plotLogRef} className="w-full h-[220px]" role="img" aria-label="Gradient magnitude log scale" />
              </div>
            </div>
            {showCos && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div ref={plotCosRef} className="w-full h-[240px]" role="img" aria-label="Hidden state cosine similarity" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const sideContent = (
    <div className="flex flex-col gap-6 p-1">
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-2">
        <label className="text-xs font-bold text-text-muted block mb-2 uppercase tracking-tight">Load Dataset</label>
        <SuiteSourceSelector 
          typeFilter={["text", "timeseries"]}
          onLoad={item => {
            if (item.type === "text") {
              setRawLabels(item.content);
              setLoadedItemId(item.id);
            } else if (item.type === "timeseries") {
              const labels = timeseriesJsonToLabels(item.content);
              if (labels) {
                setRawLabels(labels);
                setLoadedItemId(item.id);
              } else {
                alert("Could not extract a recognizable event timeline from this JSON file.");
              }
            }
          }}
        />
        
        <div className="mt-4 flex justify-between items-end mb-2">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-tight block">Event timeline</label>
          <span className={`text-[10px] font-mono ${T >= MA_SEQ_LEN ? 'text-red-500 font-bold' : 'text-gray-400'}`}>{T} / {MA_SEQ_LEN}</span>
        </div>
        <textarea value={rawLabels} onChange={e => setRawLabels(e.target.value)}
          className="w-full h-40 p-2 text-xs font-mono bg-white border border-gray-200 rounded text-gray-800 resize-y focus:outline-none focus:border-main" />
        <div className="mt-2 flex justify-end">
          <button onClick={() => setRawLabels(DEFAULT_EVENTS.join("\n"))} className="text-[10px] font-mono text-gray-500 hover:text-black hover:underline cursor-pointer">reset default</button>
        </div>
      </div>

      <div>
        <label className="text-sm font-bold block mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-main" />
          State Parameters
        </label>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
          <label className="text-[10px] font-bold text-text-muted uppercase block">Hidden Dimension Size</label>
          <div className="flex gap-2 mt-2">
            {HIDDEN_OPTIONS.map(h => (
              <button key={h} onClick={() => { setHiddenSize(h); runAnalysis(h); }}
                className={`flex-1 py-1 text-[10px] font-mono border rounded transition-colors ${hiddenSize===h ? 'bg-black border-black text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {h}
              </button>
            ))}
          </div>
          
          <button onClick={() => runAnalysis(hiddenSize)} disabled={computing}
            className={`w-full mt-4 py-2 text-xs font-bold uppercase rounded tracking-wide transition-colors ${computing ? 'bg-gray-200 text-gray-400 cursor-wait' : 'bg-main text-white hover:opacity-90'}`}>
            {computing ? "computing..." : "run analysis"}
          </button>
        </div>
      </div>

      <div className="mt-2 pt-4 border-t border-gray-100">
        <label className="text-[10px] font-bold text-text-muted uppercase block mb-2">Run Analysis Stats</label>
        
        <div className="grid grid-cols-1 gap-2 text-xs mb-4">
          {result ? (
            <>
              <div className="bg-white p-2 rounded border border-gray-100 flex justify-between items-center">
                <span className="text-[10px] text-text-muted uppercase">RNN Early Grad</span>
                <span className="font-mono font-bold text-[#832161]">{rnnMean}</span>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 flex justify-between items-center">
                <span className="text-[10px] text-text-muted uppercase">LSTM Early Grad</span>
                <span className="font-mono font-bold text-[#4B7BBE]">{lstmMean}</span>
              </div>
            </>
          ) : (
            <div className="text-[10px] italic text-gray-400 py-1">No analysis run yet</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowCos(v => !v)} className="flex-1 py-1 px-2 border border-blue-200 bg-blue-50 text-blue-700 text-[10px] rounded uppercase font-bold hover:bg-blue-100 transition-colors">
            {showCos ? "Hide" : "Show"} Panel C
          </button>
          
          {result && (
            <button onClick={exportCharts} className="flex-1 py-1 px-2 border border-gray-200 bg-white text-gray-600 text-[10px] rounded uppercase font-bold hover:bg-gray-50 transition-colors">
              Export Charts
            </button>
          )}
        </div>

        {loadedItemId && result && (
          <button onClick={saveToSuite} disabled={saving} 
            className="w-full flex items-center justify-center gap-2 py-2 mt-4 bg-main text-white text-xs font-bold uppercase rounded hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save size={14} /> {saving ? "SAVING..." : "SAVE BACK TO SUITE"}
          </button>
        )}
        
        <div className="mt-4 p-2 bg-gray-50 rounded border border-gray-100 text-[9px] font-mono text-gray-500 text-center">
             seed: {MA_SEED} • dim: {MA_INPUT} • len: {T} • h: {hiddenSize}
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-[10px] text-blue-800 leading-relaxed font-sans italic">
        <strong>Epistemic Note:</strong> Both models use random initialisation — results characterise architectural structure, not trained behaviour. LSTM slows the vanishing gradient; it does not eliminate it. Computed locally via pure-JS backpropagation.
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Memory Audit"
      subtitle="Examine vanishing gradients and structural forgetting in recurrent architectures."
      mainContent={mainContent}
      sideContent={sideContent}
    />
  );
}



export default function DeepTime() {
  const [view, setView] = useState(0);
  const { dataset, activeItem } = useSuiteStore();
  const location = useLocation();
  const [initialData, setInitialData] = useState<any>(null);

  // Initial routing and data loading from Suite
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("from") === "suite" && activeItem && dataset.length > 0) {
      const item = dataset.find(i => i.id === activeItem);
      if (item) {
        if (item.type === "text") {
          setInitialData({ id: item.id, content: item.content, type: "text" });
          setView(0); // Attention Lens
        } else if (item.type === "image") {
          setInitialData({ id: item.id, content: item.content, type: "image", name: item.name });
          setView(1); // Diffusion Scrubber
        } else if (item.type === "timeseries") {
          const labels = timeseriesJsonToLabels(item.content);
          if (labels) {
            setInitialData({ id: item.id, content: labels, type: "memory" });
            setView(2); // Memory Audit
          }
        }
      }
    }
  }, [location.search, activeItem, dataset]);

  const modeToggle = (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <span className="text-xs font-bold text-gray-500 uppercase">Module:</span>
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
            <button
                onClick={() => setView(0)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${view === 0
                    ? 'bg-[var(--color-main)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
            >
                <Eye size={16} />
                Attention Lens
            </button>
            <button
                onClick={() => setView(1)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${view === 1
                    ? 'bg-[var(--color-main)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
            >
                <ImageIcon size={16} />
                Diffusion Scrubber
            </button>
            <button
                onClick={() => setView(2)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${view === 2
                    ? 'bg-[var(--color-main)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
            >
                <Clock size={16} />
                Memory Audit
            </button>
        </div>
    </div>
  );

  return (
    <>
      {view === 0 && <AttentionLens modeToggle={modeToggle} initialSuiteData={initialData?.type === "text" ? initialData : null} />}
      {view === 1 && <DiffusionScrubber modeToggle={modeToggle} initialSuiteData={initialData?.type === "image" ? initialData : null} />}
      {view === 2 && <MemoryAudit modeToggle={modeToggle} initialSuiteData={initialData?.type === "memory" ? initialData : null} />}
    </>
  );
}
