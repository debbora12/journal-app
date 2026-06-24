import { useState, useEffect, useRef, memo } from "react";
import { supabase } from "./supabase.js";
import Auth from "./Auth.jsx";
import logo from "./assets/logo.svg";

// ── Layout constants ──────────────────────────────────────────────────────────
const PAGE_W    = 420;
const PAGE_H    = 560;
const SPINE_W   = 20;
const HEADER_H  = 52;
const SIDEBAR_W = 180;
const PAD       = 20;                                         // margin inside caderno cover
const CADERNO_W = PAD + PAGE_W + SPINE_W + PAGE_W + PAD;    // 900
const CADERNO_H = PAD + PAGE_H + PAD;                        // 600
const LEFT_PAGE_X  = PAD;                                    // 20
const RIGHT_PAGE_X = PAD + PAGE_W + SPINE_W;                 // 460
const PAGE_Y    = PAD;                                       // 20

const COVER_URL = "/covers/caderno.webp";

// ── SVG data URIs ─────────────────────────────────────────────────────────────
const MAT_GRID = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'>" +
  "<path d='M10 0 L10 50 M20 0 L20 50 M30 0 L30 50 M40 0 L40 50 M0 10 L50 10 M0 20 L50 20 M0 30 L50 30 M0 40 L50 40' stroke='#3D7A52' stroke-width='0.4' opacity='0.55'/>" +
  "<rect x='0' y='0' width='50' height='50' fill='none' stroke='#4A9060' stroke-width='0.9' opacity='0.65'/>" +
  "</svg>"
)}")`;

const PAGE_GRID = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'>" +
  "<path d='M20 0 L0 0 0 20' fill='none' stroke='rgba(0,0,0,0.06)' stroke-width='0.5'/>" +
  "</svg>"
)}")`;

// ── Text constants ────────────────────────────────────────────────────────────
const FONTS = [
  { label: "Caveat",                value: "'Caveat', cursive" },
  { label: "Courier New",           value: "'Courier New', monospace" },
  { label: "Covered By Your Grace", value: "'Covered By Your Grace', cursive" },
  { label: "Coming Soon",           value: "'Coming Soon', cursive" },
  { label: "Impact",                value: "Impact, sans-serif" },
];

const TEXT_SIZES = [
  { label: "S",  value: 12 },
  { label: "M",  value: 16 },
  { label: "L",  value: 22 },
  { label: "XL", value: 30 },
];

const TOOLBAR_COLORS = ["#323232","#004DFF","#FF0909","#FC20B6","#0C9500","#FF6A07"];

const FONT_SHORT = {
  "'Caveat', cursive":                 "Caveat",
  "'Courier New', monospace":          "Courier",
  "'Covered By Your Grace', cursive":  "Covered",
  "'Coming Soon', cursive":            "Coming",
  "Impact, sans-serif":                "Impact",
};

const COLORS = [
  "#1A1A1A", "#FFFFFF", "#969287", "#C0392B",
  "#E91E8C", "#8E44AD", "#2980B9", "#27AE60",
  "#F1C40F", "#E67E22", "#D4C5A9", "#6D4C41",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function formatDate(date) {
  return `${date.getDate()} ${MONTHS_PT[date.getMonth()]}`;
}
function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function polH(w) { return (w - 16) + 36; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Fallback: lê localStorage (usado offline / sem auth)
function loadPageLocal(key) {
  try {
    const raw = localStorage.getItem(`journal_${key}`);
    if (raw) {
      const d = JSON.parse(raw);
      return { polaroids: d.polaroids||[], textBlocks: d.textBlocks||[], stickers: d.stickers||[], papers: d.papers||[] };
    }
  } catch {}
  return { polaroids: [], textBlocks: [], stickers: [], papers: [] };
}

// Carrega uma página do Supabase (com fallback para localStorage)
async function loadPageRemote(key, userId) {
  if (!userId) return loadPageLocal(key);
  try {
    const { data: entry } = await supabase
      .from("journal_entries")
      .select("data")
      .eq("user_id", userId)
      .eq("date_key", key)
      .maybeSingle();
    if (entry?.data) return entry.data;
  } catch {}
  return loadPageLocal(key);
}

// Salva uma página no Supabase (e em localStorage como cache)
async function savePageRemote(key, data, userId) {
  localStorage.setItem(`journal_${key}`, JSON.stringify(data));
  if (!userId) return;
  try {
    await supabase.from("journal_entries").upsert(
      { user_id: userId, date_key: key, data, updated_at: new Date().toISOString() },
      { onConflict: "user_id,date_key" }
    );
  } catch (e) { console.error("Supabase save error:", e); }
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <circle cx="12" cy="14" r="3"/>
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 1.5L11.6 8.4L18.5 10L11.6 11.6L10 18.5L8.4 11.6L1.5 10L8.4 8.4Z"/>
    </svg>
  );
}
function TextIconAa() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7"/>
      <line x1="9" y1="20" x2="15" y2="20"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function PaperIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}
function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

// ── Sticker catalog ───────────────────────────────────────────────────────────
function stickerImg(url, w, h) {
  return (
    <img src={url} alt="" draggable={false}
      style={{ width: w, height: h, objectFit: "contain", display: "block", pointerEvents: "none" }}
    />
  );
}

const STICKER_DEFS = {
  "star_silver_png": {
    label: "Estrela Prata", vw: 1, vh: 1, defaultW: 90,
    render: (uid, w, h) => stickerImg("/stickers/stk-star-silver.webp", w, h),
  },
  "star_gold_png": {
    label: "Estrelas Douradas", vw: 1, vh: 1, defaultW: 90,
    render: (uid, w, h) => stickerImg("/stickers/stk-star-gold.webp", w, h),
  },
  "heart_pink_png": {
    label: "Coração Rosa", vw: 1, vh: 1, defaultW: 80,
    render: (uid, w, h) => stickerImg("/stickers/stk-heart-pink.webp", w, h),
  },
  "pin_red": {
    label: "Pin Vermelho", vw: 1, vh: 1, defaultW: 60,
    render: (uid, w, h) => stickerImg("/stickers/stk-pin-red.webp", w, h),
  },
  "clip_metal": {
    label: "Clipe Metálico", vw: 1, vh: 1, defaultW: 60,
    render: (uid, w, h) => stickerImg("/stickers/stk-clip-metal.webp", w, h),
  },
};

const PNG_STICKERS = [
  { id: 'png-1',  url: '/stickers/png-1.webp' },
  { id: 'png-2',  url: '/stickers/png-2.webp' },
  { id: 'png-3',  url: '/stickers/png-3.webp' },
  { id: 'png-4',  url: '/stickers/png-4.webp' },
  { id: 'png-5',  url: '/stickers/png-5.webp' },
  { id: 'png-6',  url: '/stickers/png-6.webp' },
  { id: 'png-7',  url: '/stickers/png-7.webp' },
  { id: 'png-8',  url: '/stickers/png-8.webp' },
  { id: 'png-9',  url: '/stickers/png-9.webp' },
];

const DATE_STICKERS = [
  { id: 'date-jan',       url: '/stickers/dates/jan.webp' },
  { id: 'date-february',  url: '/stickers/dates/february.webp' },
  { id: 'date-march',     url: '/stickers/dates/march.webp' },
  { id: 'date-april',     url: '/stickers/dates/april.webp' },
  { id: 'date-may',       url: '/stickers/dates/may.webp' },
  { id: 'date-june',      url: '/stickers/dates/june.webp' },
  { id: 'date-july',      url: '/stickers/dates/july.webp' },
  { id: 'date-august',    url: '/stickers/dates/august.webp' },
  { id: 'date-september', url: '/stickers/dates/september.webp' },
  { id: 'date-october',   url: '/stickers/dates/october.webp' },
  { id: 'date-november',  url: '/stickers/dates/november.webp' },
  { id: 'date-december',  url: '/stickers/dates/december.webp' },
];

const NUMBER_STICKERS = [
  { id: 'num-0', url: '/stickers/dates/num-0.webp' },
  { id: 'num-1', url: '/stickers/dates/num-1.webp' },
  { id: 'num-2', url: '/stickers/dates/num-2.webp' },
  { id: 'num-3', url: '/stickers/dates/num-3.webp' },
  { id: 'num-4', url: '/stickers/dates/num-4.webp' },
  { id: 'num-5', url: '/stickers/dates/num-5.webp' },
  { id: 'num-6', url: '/stickers/dates/num-6.webp' },
  { id: 'num-7', url: '/stickers/dates/num-7.webp' },
  { id: 'num-8', url: '/stickers/dates/num-8.webp' },
  { id: 'num-9', url: '/stickers/dates/num-9.webp' },
];

const PAPERS = [
  { key: "paper08", url: "/papers/paper08.webp" },
  { key: "paper09", url: "/papers/paper09.webp" },
  { key: "paper12", url: "/papers/paper12.webp" },
  { key: "paper17", url: "/papers/paper17.webp" },
  { key: "paper18", url: "/papers/paper18.webp" },
  { key: "paper27", url: "/papers/paper27.webp" },
  { key: "paper28", url: "/papers/paper28.webp" },
  { key: "paper46", url: "/papers/paper46.webp" },
];

// ── Backgrounds ───────────────────────────────────────────────────────────────
const BACKGROUNDS = [
  { id: 'cutting-mat', label: 'Cutting Mat', type: 'svg',   color: '#2D5A3D' },
  { id: 'bg3',         label: 'Background 3', type: 'image', url: '/backgrounds/bg3.webp' },
];

// ── SidebarIcon ───────────────────────────────────────────────────────────────
const UI_FONT = "'Futura', 'Jost', 'Nunito', sans-serif";

function SidebarIcon({ icon: Icon, label, onClick, active }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: 48, padding: "0 20px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", userSelect: "none",
        background: active ? "#E5E0D2" : hov ? "#E5E0D2" : "transparent",
        borderLeft: `2px solid ${active ? "#1A1A1A" : "transparent"}`,
        borderBottom: "0.5px solid #CFC7B8",
        transition: "background 0.12s",
        color: active ? "#1A1A1A" : hov ? "#656259" : "#969287",
        flexShrink: 0,
      }}
    >
      <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon />
      </div>
      <span style={{
        fontFamily: UI_FONT, fontSize: 15, fontWeight: 500,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        {label}
      </span>
    </div>
  );
}

// ── PanelHeader ───────────────────────────────────────────────────────────────
function PanelHeader({ label, onClose }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 16px 12px", borderBottom: "1px solid #CFC7B8", flexShrink: 0,
    }}>
      <span style={{
        fontFamily: UI_FONT, fontSize: 13, fontWeight: 600, color: "#656259",
        textTransform: "uppercase", letterSpacing: "0.1em", userSelect: "none",
      }}>
        {label}
      </span>
      <button
        onClick={onClose}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: 24, height: 24,
          background: hov ? "#E5E0D2" : "transparent",
          border: "none", color: hov ? "#656259" : "#969287",
          cursor: "pointer", fontSize: 17,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 0, lineHeight: 1, borderRadius: 4,
          transition: "background 0.1s, color 0.1s", flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── NavArrow ──────────────────────────────────────────────────────────────────
function NavArrow({ direction, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "1px solid rgba(237,232,223,0.35)",
        background: hov && !disabled ? "rgba(237,232,223,0.25)" : "rgba(237,232,223,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
        opacity: disabled ? 0.2 : 1,
        flexShrink: 0, padding: 0,
        color: "#EDE8DF",
      }}
    >
      {direction === "left" ? <ChevronLeft /> : <ChevronRight />}
    </button>
  );
}

// ── Panel base style ──────────────────────────────────────────────────────────
const panelBase = (open) => ({
  position: "fixed",
  left: SIDEBAR_W, top: HEADER_H,
  width: 220, height: `calc(100vh - ${HEADER_H}px)`,
  background: "#F3F0E6",
  borderRight: "1px solid #CFC7B8",
  zIndex: 100, display: "flex", flexDirection: "column", boxSizing: "border-box",
  transform: open ? "translateX(0)" : "translateX(-220px)",
  transition: "transform 0.22s ease",
  pointerEvents: open ? "auto" : "none",
});

// ── CameraPanel ───────────────────────────────────────────────────────────────
function CameraPanel({ fileInputRef, onClose, open }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={e => e.stopPropagation()} style={panelBase(open)}>
      <PanelHeader label="polaroids" onClose={onClose} />
      <div style={{ padding: 16 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            border: `1px solid ${hov ? "#A0A09A" : "#C8C2B8"}`,
            background: hov ? "#E5E0D2" : "transparent",
            color: hov ? "#656259" : "#969287",
            fontFamily: UI_FONT, fontSize: 13, fontWeight: 500,
            padding: "9px 0", width: "100%", cursor: "pointer",
            transition: "all 0.15s", borderRadius: 4, letterSpacing: "0.04em",
          }}
        >
          + adicionar foto
        </button>
      </div>
    </div>
  );
}

// ── TextPanel ─────────────────────────────────────────────────────────────────
function TextPanel({ onClose, open }) {
  return (
    <div onClick={e => e.stopPropagation()} style={{ ...panelBase(open), overflowY: "auto" }}>
      <PanelHeader label="texto" onClose={onClose} />
      <div style={{ padding: "20px 16px" }}>
        <p style={{
          fontFamily: "'Courier New', monospace", fontSize: 11, fontStyle: "italic",
          color: "#555555", margin: 0, lineHeight: 1.6, userSelect: "none",
        }}>
          clique na página para escrever
        </p>
      </div>
    </div>
  );
}

// ── TextToolbar ────────────────────────────────────────────────────────────────
function TextToolbar({ selectedBlock, onApply, onDelete }) {
  const [pos, setPos]       = useState(null);
  const [fontOpen, setFontOpen] = useState(false);

  // Reposiciona quando o bloco muda de posição (depois do drag commitar estado)
  useEffect(() => {
    if (!selectedBlock) { setPos(null); return; }
    const el = document.querySelector(`[data-id="${selectedBlock.id}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const toolH = 44;
    const above = rect.top >= toolH + 8;
    setPos({ top: above ? rect.top - toolH : rect.bottom + 8, left: rect.left });
  }, [selectedBlock?.id, selectedBlock?.x, selectedBlock?.y, selectedBlock?.width]);

  // Fechar font dropdown ao clicar fora
  useEffect(() => {
    if (!fontOpen) return;
    const close = () => setFontOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [fontOpen]);

  if (!selectedBlock || !pos) return null;

  const noFocus = e => e.preventDefault();
  const curFont  = selectedBlock.fontFamily || FONTS[0].value;
  const curSize  = selectedBlock.fontSize   || 16;
  const curColor = selectedBlock.color      || "#1A1A1A";

  const Sep = () => <div style={{ width: 1, height: 16, background: "#333333", flexShrink: 0 }} />;

  return (
    <div
      style={{
        position: "fixed", top: pos.top, left: pos.left, zIndex: 500,
        background: "#1A1A1A", borderRadius: 6, padding: "6px 10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", gap: 6,
        fontFamily: UI_FONT,
      }}
      onMouseDown={noFocus}
      onClick={e => e.stopPropagation()}
    >
      {/* Font dropdown */}
      <div style={{ position: "relative" }}>
        <button
          onMouseDown={noFocus}
          onClick={e => { e.stopPropagation(); setFontOpen(v => !v); }}
          style={{
            width: 80, padding: "3px 6px", background: "#2A2A2A",
            border: "1px solid #333333", borderRadius: 4,
            color: "#CCCCCC", fontSize: 11, cursor: "pointer",
            fontFamily: curFont, textAlign: "left",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {FONT_SHORT[curFont] || "Font"}
          </span>
          <span style={{ fontFamily: UI_FONT, fontSize: 9, marginLeft: 2, opacity: 0.6 }}>▾</span>
        </button>
        {fontOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            background: "#1A1A1A", border: "1px solid #333333", borderRadius: 4,
            overflow: "hidden", zIndex: 600, minWidth: 110,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}>
            {FONTS.map(f => (
              <div
                key={f.value}
                onMouseDown={noFocus}
                onClick={e => { e.stopPropagation(); onApply({ fontFamily: f.value }); setFontOpen(false); }}
                style={{
                  padding: "7px 10px",
                  fontFamily: f.value, fontSize: 13,
                  color: curFont === f.value ? "#FFFFFF" : "#AAAAAA",
                  background: curFont === f.value ? "#2A2A2A" : "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#222222"; }}
                onMouseLeave={e => { e.currentTarget.style.background = curFont === f.value ? "#2A2A2A" : "transparent"; }}
              >
                {f.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <Sep />

      {/* Size buttons */}
      {TEXT_SIZES.map(s => {
        const active = curSize === s.value;
        return (
          <button key={s.value} onMouseDown={noFocus} onClick={() => onApply({ fontSize: s.value })}
            style={{
              width: 24, height: 24, borderRadius: 4, border: "none",
              background: active ? "#333333" : "transparent",
              color: active ? "#FFFFFF" : "#AAAAAA",
              fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 600,
              cursor: "pointer",
            }}>
            {s.label}
          </button>
        );
      })}

      <Sep />

      {/* Color palette */}
      {TOOLBAR_COLORS.map(c => (
        <div key={c} onMouseDown={noFocus} onClick={() => onApply({ color: c })}
          style={{
            width: 14, height: 14, borderRadius: "50%", background: c,
            cursor: "pointer", flexShrink: 0,
            outline: curColor === c ? "2px solid #FFFFFF" : "none",
            outlineOffset: 1,
            border: c === "#FFFFFF" ? "1px solid #555555" : "none",
            boxSizing: "border-box",
          }}
        />
      ))}

      <Sep />

      {/* Delete */}
      <button onMouseDown={noFocus} onClick={onDelete}
        style={{
          width: 24, height: 24, border: "none", background: "transparent",
          color: "#666666", fontSize: 16, cursor: "pointer", borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#FF4444"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#666666"; }}
      >
        ×
      </button>
    </div>
  );
}

// ── StickerPanel ──────────────────────────────────────────────────────────────
function StickerPanel({ onAddSticker, onClose, open }) {
  // Lazy: só carrega previews na primeira vez que o painel abre
  const hasOpenedRef = useRef(false);
  if (open && !hasOpenedRef.current) hasOpenedRef.current = true;

  return (
    <div onClick={e => e.stopPropagation()} style={panelBase(open)}>
      <PanelHeader label="stickers" onClose={onClose} />
      <div style={{ overflowY: "auto", flex: 1, padding: 12 }}>
        {/* ── Stickers ── */}
        <div style={{ fontFamily: UI_FONT, fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, userSelect: "none" }}>
          Stickers
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {/* PNG stickers */}
          {PNG_STICKERS.map(p => (
            <div
              key={p.id}
              onClick={() => onAddSticker('png-sticker', p.url)}
              style={{
                height: 72, background: "#1C1C1C", borderRadius: 6, padding: 8,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                outline: "1px solid transparent", transition: "background 0.12s, outline 0.12s",
                boxSizing: "border-box",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#252525"; e.currentTarget.style.outline = "1px solid #333333"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#1C1C1C"; e.currentTarget.style.outline = "1px solid transparent"; }}
            >
              <img
                src={hasOpenedRef.current ? p.url : undefined}
                alt="" draggable={false} loading="lazy" decoding="async"
                style={{ maxHeight: 56, maxWidth: "100%", objectFit: "contain", display: "block", pointerEvents: "none" }}
              />
            </div>
          ))}
          {/* SVG stickers — só renderiza previews após o painel abrir */}
          {Object.entries(STICKER_DEFS).map(([type, def]) => {
            const ph = 56;
            const pw = Math.round((ph * def.vw) / def.vh);
            return (
              <div
                key={type}
                onClick={() => onAddSticker(type)}
                style={{
                  height: 72, background: "#1C1C1C", borderRadius: 6, padding: 8,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  outline: "1px solid transparent", transition: "background 0.12s, outline 0.12s",
                  boxSizing: "border-box",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#252525"; e.currentTarget.style.outline = "1px solid #333333"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#1C1C1C"; e.currentTarget.style.outline = "1px solid transparent"; }}
              >
                {hasOpenedRef.current ? def.render(`prev_${type}`, pw, ph) : null}
              </div>
            );
          })}
        </div>

        {/* ── Dates ── */}
        <div style={{ fontFamily: UI_FONT, fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.12em", margin: "16px 0 8px", userSelect: "none" }}>
          Dates
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {DATE_STICKERS.map(p => (
            <div
              key={p.id}
              onClick={() => onAddSticker('png-sticker', p.url)}
              style={{
                height: 72, background: "#1C1C1C", borderRadius: 6, padding: 8,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                outline: "1px solid transparent", transition: "background 0.12s, outline 0.12s",
                boxSizing: "border-box",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#252525"; e.currentTarget.style.outline = "1px solid #333333"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#1C1C1C"; e.currentTarget.style.outline = "1px solid transparent"; }}
            >
              <img
                src={hasOpenedRef.current ? p.url : undefined}
                alt="" draggable={false} loading="lazy" decoding="async"
                style={{ maxHeight: 56, maxWidth: "100%", objectFit: "contain", display: "block", pointerEvents: "none" }}
              />
            </div>
          ))}
        </div>

        {/* ── Numbers ── */}
        <div style={{ fontFamily: UI_FONT, fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.12em", margin: "16px 0 8px", userSelect: "none" }}>
          Numbers
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {NUMBER_STICKERS.map(p => (
            <div
              key={p.id}
              onClick={() => onAddSticker('png-sticker', p.url)}
              style={{
                height: 52, background: "#1C1C1C", borderRadius: 6, padding: 6,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                outline: "1px solid transparent", transition: "background 0.12s, outline 0.12s",
                boxSizing: "border-box",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#252525"; e.currentTarget.style.outline = "1px solid #333333"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#1C1C1C"; e.currentTarget.style.outline = "1px solid transparent"; }}
            >
              <img
                src={hasOpenedRef.current ? p.url : undefined}
                alt="" draggable={false} loading="lazy" decoding="async"
                style={{ maxHeight: 40, maxWidth: "100%", objectFit: "contain", display: "block", pointerEvents: "none" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PaperPanel ────────────────────────────────────────────────────────────────
function PaperPanel({ open, onClose, onAddPaper }) {
  // Lazy: só carrega os thumbnails na primeira vez que o painel abre
  const hasOpenedRef = useRef(false);
  if (open && !hasOpenedRef.current) hasOpenedRef.current = true;

  return (
    <div onClick={e => e.stopPropagation()} style={panelBase(open)}>
      <PanelHeader label="paper" onClose={onClose} />
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div style={{ fontFamily: UI_FONT, fontSize: 11, fontWeight: 600, color: "#969287", textTransform: "uppercase", letterSpacing: "0.1em", userSelect: "none" }}>
          adicionar papel
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {PAPERS.map(p => (
            <div
              key={p.key}
              onClick={() => onAddPaper(p.url)}
              style={{
                width: "100%", aspectRatio: "88 / 64", borderRadius: 6,
                overflow: "hidden", cursor: "pointer", border: "1px solid #CFC7B8",
                transition: "border-color 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#A0A09A"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#CFC7B8"; }}
            >
              <img
                src={hasOpenedRef.current ? p.url : undefined}
                alt={p.key}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── RotationHandle ────────────────────────────────────────────────────────────
function RotationHandle({ onMouseDown }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{
      position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      zIndex: 9999, pointerEvents: "none",
    }}>
      <div
        onMouseDown={e => { e.stopPropagation(); onMouseDown(e); }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: 14, height: 14, borderRadius: "50%",
          background: "#FFFFFF", border: "1.5px solid #AAAAAA",
          cursor: hov ? "grabbing" : "grab",
          pointerEvents: "auto", flexShrink: 0,
        }}
      />
      <div style={{ width: 1, height: 14, background: "#969287", pointerEvents: "none" }} />
    </div>
  );
}

// ── StickerElement ────────────────────────────────────────────────────────────
const RESIZE_CURSORS = { tl: "nw-resize", tr: "ne-resize", bl: "sw-resize", br: "se-resize" };

const StickerElement = memo(function StickerElement({ data, isSelected, onMouseDownDrag, onMouseDownResize, onMouseDownRotate, onDelete }) {
  const { x, y, width, height, type, zIndex, rotation } = data;
  const isPng = type === 'png-sticker';
  const def = isPng ? null : STICKER_DEFS[type];
  if (!isPng && !def) return null;
  const content = isPng
    ? <img src={data.url} alt="" draggable={false} decoding="async"
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "none" }} />
    : def.render(data.id, width, height);
  return (
    <div
      data-id={data.id}
      style={{
        position: "absolute", left: x, top: y, width, height, zIndex,
        cursor: "grab", transform: `rotate(${rotation ?? 0}deg)`, transformOrigin: "center center",
        outline: isSelected ? "1px dashed #888888" : "none", outlineOffset: 3,
        userSelect: "none", lineHeight: 0,
        willChange: isSelected ? "transform" : "auto",
      }}
      onMouseDown={onMouseDownDrag}
    >
      {content}
      {isSelected && (
        <>
          <RotationHandle onMouseDown={onMouseDownRotate} />
          <div onMouseDown={e => { e.stopPropagation(); onDelete(); }}
            style={{ position: "absolute", top: -9, right: -9, width: 18, height: 18, borderRadius: "50%", background: "#656259", color: "#FFFFFF", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 9999, lineHeight: 1 }}>
            ×
          </div>
          {["tl","tr","bl","br"].map(corner => {
            const pos = { tl:{top:-5,left:-5}, tr:{top:-5,right:-5}, bl:{bottom:-5,left:-5}, br:{bottom:-5,right:-5} }[corner];
            return (
              <div key={corner} onMouseDown={e => { e.stopPropagation(); onMouseDownResize(e, corner); }}
                style={{ position: "absolute", width: 10, height: 10, background: "#FFFFFF", border: "1px solid #888888", cursor: RESIZE_CURSORS[corner], zIndex: 9999, ...pos }} />
            );
          })}
        </>
      )}
    </div>
  );
});

// ── PaperElement ──────────────────────────────────────────────────────────────
const PaperElement = memo(function PaperElement({ data, isSelected, onMouseDownDrag, onMouseDownResize, onMouseDownRotate, onDelete }) {
  const { x, y, width, height, url, rotation, zIndex } = data;
  return (
    <div
      data-id={data.id}
      style={{
        position: "absolute", left: x, top: y, width, height, zIndex,
        cursor: "grab", transform: `rotate(${rotation ?? 0}deg)`, transformOrigin: "center center",
        outline: isSelected ? "1px dashed #888888" : "none", outlineOffset: 3, userSelect: "none",
        willChange: isSelected ? "transform" : "auto",
      }}
      onMouseDown={onMouseDownDrag}
    >
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 2 }}>
        <img src={url} alt="" draggable={false} decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
      </div>
      {isSelected && (
        <>
          <RotationHandle onMouseDown={onMouseDownRotate} />
          <div onMouseDown={e => { e.stopPropagation(); onDelete(); }}
            style={{ position: "absolute", top: -9, right: -9, width: 18, height: 18, borderRadius: "50%", background: "#656259", color: "#FFFFFF", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 9999, lineHeight: 1 }}>
            ×
          </div>
          {["tl","tr","bl","br"].map(corner => {
            const pos = { tl:{top:-5,left:-5}, tr:{top:-5,right:-5}, bl:{bottom:-5,left:-5}, br:{bottom:-5,right:-5} }[corner];
            return (
              <div key={corner} onMouseDown={e => { e.stopPropagation(); onMouseDownResize(e, corner); }}
                style={{ position: "absolute", width: 10, height: 10, background: "#FFFFFF", border: "1px solid #888888", cursor: RESIZE_CURSORS[corner], zIndex: 9999, ...pos }} />
            );
          })}
        </>
      )}
    </div>
  );
});

// ── Polaroid ──────────────────────────────────────────────────────────────────
const Polaroid = memo(function Polaroid({ data, isSelected, onMouseDownDrag, onMouseDownResize, onMouseDownRotate, onDelete, onCaptionChange }) {
  const { x, y, width, rotation, caption, src, zIndex } = data;
  const h = polH(width);
  const photoSize = width - 16;
  return (
    <div
      data-id={data.id}
      style={{
        position: "absolute", left: x, top: y, width, height: h,
        background: "#FFFFFF", padding: "8px 8px 28px 8px",
        boxShadow: isSelected ? "3px 4px 18px rgba(0,0,0,0.22)" : "2px 3px 10px rgba(0,0,0,0.14)",
        transform: `rotate(${rotation}deg)`, transformOrigin: "center center",
        zIndex, cursor: "grab",
        outline: isSelected ? "1.5px dashed #888888" : "none",
        outlineOffset: 3, userSelect: "none", boxSizing: "border-box",
        willChange: isSelected ? "transform" : "auto",
      }}
      onMouseDown={onMouseDownDrag}
    >
      <img src={src} alt="" draggable={false} decoding="async" style={{ width: photoSize, height: photoSize, objectFit: "cover", display: "block", pointerEvents: "none" }} />
      <input
        type="text" value={caption} placeholder="legenda..."
        onChange={e => onCaptionChange(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        style={{
          position: "absolute", bottom: 0, left: 0, width: "100%", height: 28,
          border: "none", outline: "none", background: "transparent",
          fontFamily: "'Caveat', cursive", fontSize: 13, fontStyle: "italic",
          color: "#888880", textAlign: "center", padding: "0 6px",
          cursor: "text", boxSizing: "border-box",
        }}
      />
      {isSelected && (
        <>
          <RotationHandle onMouseDown={onMouseDownRotate} />
          <div onMouseDown={e => { e.stopPropagation(); onDelete(); }}
            style={{ position: "absolute", top: -9, right: -9, width: 18, height: 18, borderRadius: "50%", background: "#656259", color: "#FFFFFF", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 9999, lineHeight: 1 }}>
            ×
          </div>
          {["tl","tr","bl","br"].map(corner => {
            const pos = { tl:{top:-5,left:-5}, tr:{top:-5,right:-5}, bl:{bottom:-5,left:-5}, br:{bottom:-5,right:-5} }[corner];
            return (
              <div key={corner} onMouseDown={e => { e.stopPropagation(); onMouseDownResize(e, corner); }}
                style={{ position: "absolute", width: 10, height: 10, background: "#FFFFFF", border: "1px solid #888888", cursor: RESIZE_CURSORS[corner], zIndex: 9999, ...pos }} />
            );
          })}
        </>
      )}
    </div>
  );
});

// ── TextBlock ─────────────────────────────────────────────────────────────────
const TextBlock = memo(function TextBlock({
  data, isSelected,
  onMouseDownDrag, onMouseDownResize,
  onSelect, onDelete, onTextChange,
}) {
  const { x, y, width, text, fontFamily, fontSize, color, zIndex, rotation } = data;
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-foco ao criar (bloco vazio)
  useEffect(() => {
    if (data.text === "" && textareaRef.current) textareaRef.current.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-height via scrollHeight
  useEffect(() => {
    const ta = textareaRef.current; if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [text, fontSize, fontFamily]);

  const isEditing    = isSelected && isFocused;
  const showControls = isSelected;
  const borderColor  = isEditing ? "#CCCCCC" : "#AAAAAA";

  return (
    // Div externo: posicionamento absoluto, sem borda — só para localizar na página
    <div
      data-id={data.id}
      style={{
        position: "absolute", left: x, top: y, width, zIndex,
        transform: `rotate(${rotation ?? 0}deg)`,
        transformOrigin: "center center",
        userSelect: "none",
        willChange: isSelected ? "transform" : "auto",
      }}
      onMouseDown={e => {
        if (e.target === textareaRef.current) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Alça de drag — sempre renderizada (14px reservados) para não deslocar textarea ao selecionar */}
      <div
        onMouseDown={showControls ? e => { e.stopPropagation(); onMouseDownDrag(e); } : undefined}
        style={{
          height: 14, cursor: showControls ? "move" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "#999999", userSelect: "none",
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
        }}
      >
        ⠿
      </div>

      {/* Caixa com borda — só esta tem o outline */}
      <div style={{
        outline: isSelected ? `1px dashed ${borderColor}` : "none",
        outlineOffset: 2,
        position: "relative",
        borderRadius: 2,
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          placeholder="escreva..."
          className="txt-block-ta"
          onChange={e => onTextChange(e.target.value)}
          onMouseDown={e => { e.stopPropagation(); onSelect(); }}
          onFocus={() => { setIsFocused(true); onSelect(); }}
          onBlur={() => setIsFocused(false)}
          rows={1}
          style={{
            display: "block", width: "100%", boxSizing: "border-box",
            background: "transparent", border: "none", outline: "none", resize: "none",
            fontFamily, fontSize, color,
            padding: "2px 4px", lineHeight: 1.45, overflow: "hidden",
            cursor: "text",
          }}
        />

        {/* Botão X de deletar */}
        {isSelected && (
          <div
            onMouseDown={e => { e.stopPropagation(); onDelete(); }}
            style={{
              position: "absolute", top: -9, right: -9,
              width: 18, height: 18, borderRadius: "50%",
              background: "#656259", color: "#FFFFFF",
              fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", zIndex: 9999, lineHeight: 1,
            }}
          >
            ×
          </div>
        )}

        {/* Handles de resize (sem rotação) */}
        {isSelected && ["tl","tr","bl","br"].map(corner => {
          const hpos = {
            tl:{top:-5,left:-5}, tr:{top:-5,right:-5},
            bl:{bottom:-5,left:-5}, br:{bottom:-5,right:-5},
          }[corner];
          return (
            <div key={corner}
              onMouseDown={e => { e.stopPropagation(); onMouseDownResize(e, corner); }}
              style={{
                position: "absolute", width: 10, height: 10,
                background: "#FFFFFF", border: "1px solid #888888",
                cursor: RESIZE_CURSORS[corner], zIndex: 9999, ...hpos,
              }}
            />
          );
        })}
      </div>
    </div>
  );
});

// ── JournalPage ───────────────────────────────────────────────────────────────
const JournalPage = memo(function JournalPage({
  date, side,
  polaroids, textBlocks, stickers, papers, selectedId,
  onSelectId,
  onDeletePolaroid, onChangePolaroid,
  onDeleteTextBlock, onChangeTextBlock,
  onDeleteSticker, onDeletePaper,
  dragRef, resizeRef, rotateRef, dateKey, siblingDateKey,
  textPanelOpen, onCreateTextAt,
}) {
  const isLeft = side === "left";
  const pageRef = useRef(null);

  const getSiblingLeft = (rect) =>
    isLeft ? rect.left + PAGE_W + SPINE_W : rect.left - PAGE_W - SPINE_W;

  const handlePolDragStart = (pol, e) => {
    if (e.button !== 0) return; e.stopPropagation();
    const rect = pageRef.current.getBoundingClientRect();
    dragRef.current = { type: "polaroid", id: pol.id, dkey: dateKey,
      pageLeft: rect.left, pageTop: rect.top,
      siblingKey: siblingDateKey, siblingPageLeft: getSiblingLeft(rect), siblingPageTop: rect.top,
      mouseOffsetX: e.clientX - rect.left - pol.x, mouseOffsetY: e.clientY - rect.top - pol.y,
      dims: { w: pol.width, h: polH(pol.width) } };
    onSelectId(pol.id);
  };
  const handlePolResizeStart = (pol, e, corner) => {
    if (e.button !== 0) return; e.stopPropagation();
    resizeRef.current = { type: "polaroid", id: pol.id, dkey: dateKey, corner,
      startX: e.clientX, startY: e.clientY, startW: pol.width, startPX: pol.x, startPY: pol.y,
      rotation: pol.rotation ?? 0 };
  };
  const handlePolRotateStart = (pol, e) => {
    if (e.button !== 0) return; e.stopPropagation();
    const rect = pageRef.current.getBoundingClientRect();
    rotateRef.current = { type: "polaroid", id: pol.id, dkey: dateKey,
      centerX: rect.left + pol.x + pol.width / 2, centerY: rect.top + pol.y + polH(pol.width) / 2 };
  };

  const handleTextDragStart = (blk, e) => {
    if (e.button !== 0) return; e.stopPropagation();
    const pageRect = pageRef.current.getBoundingClientRect();
    // Usa o rect real do elemento para offset preciso (não blk.x/blk.y que pode ser stale)
    const el = document.querySelector(`[data-id="${blk.id}"]`);
    const elRect = el ? el.getBoundingClientRect() : null;
    const mouseOffsetX = elRect ? e.clientX - elRect.left : e.clientX - pageRect.left - blk.x;
    const mouseOffsetY = elRect ? e.clientY - elRect.top  : e.clientY - pageRect.top  - blk.y;
    dragRef.current = { type: "text", id: blk.id, dkey: dateKey,
      pageLeft: pageRect.left, pageTop: pageRect.top,
      siblingKey: siblingDateKey, siblingPageLeft: getSiblingLeft(pageRect), siblingPageTop: pageRect.top,
      mouseOffsetX, mouseOffsetY,
      startClientX: e.clientX, startClientY: e.clientY,
      dims: { w: blk.width, h: 20 } };
    onSelectId(blk.id);
  };
  const handleTextResizeStart = (blk, e, corner) => {
    if (e.button !== 0) return; e.stopPropagation();
    resizeRef.current = { type: "text", id: blk.id, dkey: dateKey, corner,
      startX: e.clientX, startY: e.clientY,
      startW: blk.width, startPX: blk.x, startPY: blk.y,
      startFontSize: blk.fontSize ?? 16,
      rotation: blk.rotation ?? 0 };
  };
  const handleTextRotateStart = (blk, e) => {
    if (e.button !== 0) return; e.stopPropagation();
    const pageRect = pageRef.current.getBoundingClientRect();
    // Usa o bounding rect real do elemento para centro preciso
    const el = pageRef.current.querySelector(`[data-id="${blk.id}"]`);
    const elRect = el ? el.getBoundingClientRect() : null;
    rotateRef.current = { type: "text", id: blk.id, dkey: dateKey,
      centerX: elRect ? elRect.left + elRect.width / 2  : pageRect.left + blk.x + blk.width / 2,
      centerY: elRect ? elRect.top  + elRect.height / 2 : pageRect.top  + blk.y + 20 };
  };

  const handleStickerDragStart = (stk, e) => {
    if (e.button !== 0) return; e.stopPropagation();
    const rect = pageRef.current.getBoundingClientRect();
    dragRef.current = { type: "sticker", id: stk.id, dkey: dateKey,
      pageLeft: rect.left, pageTop: rect.top,
      siblingKey: siblingDateKey, siblingPageLeft: getSiblingLeft(rect), siblingPageTop: rect.top,
      mouseOffsetX: e.clientX - rect.left - stk.x, mouseOffsetY: e.clientY - rect.top - stk.y,
      dims: { w: stk.width, h: stk.height } };
    onSelectId(stk.id);
  };
  const handleStickerResizeStart = (stk, e, corner) => {
    if (e.button !== 0) return; e.stopPropagation();
    resizeRef.current = { type: "sticker", id: stk.id, dkey: dateKey, corner,
      startX: e.clientX, startY: e.clientY, startW: stk.width, startH: stk.height,
      startPX: stk.x, startPY: stk.y, aspect: stk.width / stk.height, rotation: stk.rotation ?? 0 };
  };
  const handleStickerRotateStart = (stk, e) => {
    if (e.button !== 0) return; e.stopPropagation();
    const rect = pageRef.current.getBoundingClientRect();
    rotateRef.current = { type: "sticker", id: stk.id, dkey: dateKey,
      centerX: rect.left + stk.x + stk.width / 2, centerY: rect.top + stk.y + stk.height / 2 };
  };

  const handlePaperDragStart = (pap, e) => {
    if (e.button !== 0) return; e.stopPropagation();
    const rect = pageRef.current.getBoundingClientRect();
    dragRef.current = { type: "paper", id: pap.id, dkey: dateKey,
      pageLeft: rect.left, pageTop: rect.top,
      siblingKey: siblingDateKey, siblingPageLeft: getSiblingLeft(rect), siblingPageTop: rect.top,
      mouseOffsetX: e.clientX - rect.left - pap.x, mouseOffsetY: e.clientY - rect.top - pap.y,
      dims: { w: pap.width, h: pap.height } };
    onSelectId(pap.id);
  };
  const handlePaperResizeStart = (pap, e, corner) => {
    if (e.button !== 0) return; e.stopPropagation();
    resizeRef.current = { type: "paper", id: pap.id, dkey: dateKey, corner,
      startX: e.clientX, startY: e.clientY, startW: pap.width, startH: pap.height,
      startPX: pap.x, startPY: pap.y, aspect: pap.width / pap.height, rotation: pap.rotation ?? 0 };
  };
  const handlePaperRotateStart = (pap, e) => {
    if (e.button !== 0) return; e.stopPropagation();
    const rect = pageRef.current.getBoundingClientRect();
    rotateRef.current = { type: "paper", id: pap.id, dkey: dateKey,
      centerX: rect.left + pap.x + pap.width / 2, centerY: rect.top + pap.y + pap.height / 2 };
  };

  return (
    <div
      ref={pageRef}
      style={{
        width: PAGE_W, height: PAGE_H,
        background: "transparent",
        backgroundImage: PAGE_GRID, backgroundSize: "20px 20px",
        position: "relative", boxSizing: "border-box", flexShrink: 0,
        // Cursor crosshair quando painel texto aberto e hover sobre fundo vazio
        cursor: textPanelOpen ? "crosshair" : "default",
      }}
      onMouseDown={e => {
        // Só dispara se o clique for direto no fundo da página (não em elemento filho)
        if (e.target !== pageRef.current) return;
        if (textPanelOpen) {
          // Cria texto na posição exata do clique
          const rect = pageRef.current.getBoundingClientRect();
          onCreateTextAt(Math.round(e.clientX - rect.left), Math.round(e.clientY - rect.top));
        } else {
          onSelectId(null);
        }
      }}
    >
      {/* Papers */}
      {(papers || []).map(pap => (
        <PaperElement key={pap.id} data={pap} isSelected={selectedId === pap.id}
          onMouseDownDrag={e => handlePaperDragStart(pap, e)}
          onMouseDownResize={(e, corner) => handlePaperResizeStart(pap, e, corner)}
          onMouseDownRotate={e => handlePaperRotateStart(pap, e)}
          onDelete={() => onDeletePaper(dateKey, pap.id)} />
      ))}
      {/* Polaroids */}
      {polaroids.map(pol => (
        <Polaroid key={pol.id} data={pol} isSelected={selectedId === pol.id}
          onMouseDownDrag={e => handlePolDragStart(pol, e)}
          onMouseDownResize={(e, corner) => handlePolResizeStart(pol, e, corner)}
          onMouseDownRotate={e => handlePolRotateStart(pol, e)}
          onDelete={() => onDeletePolaroid(dateKey, pol.id)}
          onCaptionChange={caption => onChangePolaroid(dateKey, pol.id, { caption })} />
      ))}
      {/* Text blocks */}
      {textBlocks.map(blk => (
        <TextBlock key={blk.id} data={blk} isSelected={selectedId === blk.id}
          onMouseDownDrag={e => handleTextDragStart(blk, e)}
          onMouseDownResize={(e, corner) => handleTextResizeStart(blk, e, corner)}
          onSelect={() => onSelectId(blk.id)}
          onDelete={() => onDeleteTextBlock(dateKey, blk.id)}
          onTextChange={text => onChangeTextBlock(dateKey, blk.id, { text })} />
      ))}
      {/* Stickers */}
      {(stickers || []).map(stk => (
        <StickerElement key={stk.id} data={stk} isSelected={selectedId === stk.id}
          onMouseDownDrag={e => handleStickerDragStart(stk, e)}
          onMouseDownResize={(e, corner) => handleStickerResizeStart(stk, e, corner)}
          onMouseDownRotate={e => handleStickerRotateStart(stk, e)}
          onDelete={() => onDeleteSticker(dateKey, stk.id)} />
      ))}
    </div>
  );
});

// ── ProfileDropdown ───────────────────────────────────────────────────────────
function ProfileDropdown({ userName, setUserName, avatarSrc, onAvatarChange, onNavigate, onClose, todayRef, onSignOut }) {
  const avatarFileRef = useRef(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const found = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith("journal_")) continue;
      try {
        const data = JSON.parse(localStorage.getItem(k));
        const isEmpty = !data.polaroids?.length && !data.textBlocks?.length && !data.stickers?.length && !data.papers?.length;
        if (!isEmpty) found.push(k.replace("journal_", ""));
      } catch {}
    }
    found.sort((a, b) => b.localeCompare(a));
    setEntries(found);
  }, []);

  const dayCount = entries.length;
  const handleAvatarFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => onAvatarChange(ev.target.result);
    r.readAsDataURL(f); e.target.value = "";
  };
  const getOffsetForKey = (dateKey) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return Math.round((date.getTime() - todayRef.getTime()) / 86400000);
  };
  const initial = userName ? userName[0].toUpperCase() : "?";

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: "fixed", top: HEADER_H + 4, right: 16, width: 240,
        background: "#F0EBE3", border: "1px solid #C8C2B8",
        borderRadius: 8, zIndex: 350,
        boxShadow: "0 8px 28px rgba(0,0,0,0.18)", overflow: "hidden",
        animation: "fadeDropdown 0.14s ease",
        fontFamily: UI_FONT,
      }}
    >
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #D8D2C8", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div
          onClick={() => avatarFileRef.current?.click()}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: avatarSrc ? "none" : "#DDD8D0",
            overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", border: "1px solid #C8C2B8", flexShrink: 0, transition: "border-color 0.12s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#A0A09A"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#C8C2B8"}
        >
          {avatarSrc
            ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontFamily: UI_FONT, fontSize: 18, fontWeight: 600, color: "#969287" }}>{initial}</span>
          }
        </div>
        <input
          type="text" value={userName} placeholder="seu nome..."
          onChange={e => setUserName(e.target.value)}
          style={{
            background: "transparent", border: "none", borderBottom: "1px solid #C8C2B8",
            color: "#333333", fontFamily: UI_FONT, fontSize: 14,
            textAlign: "center", width: "100%", padding: "3px 0 5px", outline: "none",
          }}
        />
        <div style={{ fontFamily: UI_FONT, fontSize: 12, color: "#969287", userSelect: "none" }}>
          {dayCount} {dayCount === 1 ? "dia" : "dias"} de journal
        </div>
      </div>
      {entries.length > 0 && (
        <div style={{ maxHeight: 180, overflowY: "auto" }}>
          {entries.map(key => (
            <div key={key}
              onClick={() => { onNavigate(getOffsetForKey(key)); onClose(); }}
              style={{
                padding: "8px 16px", fontFamily: UI_FONT, fontSize: 13,
                color: "#969287", cursor: "pointer", borderBottom: "0.5px solid #D8D2C8",
                transition: "background 0.1s, color 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#E5E0D2"; e.currentTarget.style.color = "#1A1A1A"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#969287"; }}
            >
              {key}
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: "10px 16px 14px" }}>
        <input ref={avatarFileRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: "none" }} />
        <button
          onClick={() => avatarFileRef.current?.click()}
          style={{
            width: "100%", padding: "7px 0", background: "transparent",
            border: "1px solid #C8C2B8", color: "#969287",
            fontFamily: UI_FONT, fontSize: 13, cursor: "pointer",
            borderRadius: 4, transition: "all 0.12s", letterSpacing: "0.04em",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#E5E0D2"; e.currentTarget.style.borderColor = "#A0A09A"; e.currentTarget.style.color = "#333333"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#C8C2B8"; e.currentTarget.style.color = "#969287"; }}
        >
          trocar foto de perfil
        </button>
        {onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              width: "100%", padding: "7px 0", marginTop: 6,
              background: "transparent", border: "1px solid #C8C2B8",
              color: "#969287", fontFamily: UI_FONT, fontSize: 13,
              cursor: "pointer", borderRadius: 4, transition: "all 0.12s", letterSpacing: "0.04em",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#F5E8E8"; e.currentTarget.style.borderColor = "#C0392B"; e.currentTarget.style.color = "#C0392B"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#C8C2B8"; e.currentTarget.style.color = "#969287"; }}
          >
            sair da conta
          </button>
        )}
      </div>
    </div>
  );
}

// ── BgDot / BgDots ────────────────────────────────────────────────────────────
function BgDot({ color, isActive, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 12, height: 12, borderRadius: "50%",
        background: color,
        opacity: hov ? 0.8 : isActive ? 1 : 0.5,
        border: isActive ? "2px solid #FFFFFF" : "2px solid transparent",
        boxShadow: isActive ? "0 0 0 1px rgba(0,0,0,0.3)" : "none",
        cursor: "pointer",
        transform: hov ? "scale(1.15)" : "scale(1)",
        transition: "opacity 0.15s, transform 0.15s",
        boxSizing: "border-box", flexShrink: 0,
      }}
    />
  );
}

function BgDots({ activeBg, onSelect }) {
  const [dotColors, setDotColors] = useState({});

  useEffect(() => {
    BACKGROUNDS.forEach(bg => {
      if (bg.type !== "image") return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 1; canvas.height = 1;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          setDotColors(prev => ({ ...prev, [bg.id]: `rgb(${r},${g},${b})` }));
        } catch {
          setDotColors(prev => ({ ...prev, [bg.id]: "#888888" }));
        }
      };
      img.onerror = () => setDotColors(prev => ({ ...prev, [bg.id]: "#888888" }));
      img.src = bg.url;
    });
  }, []);

  return (
    <div style={{
      position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 50, display: "flex", gap: 10, alignItems: "center",
      pointerEvents: "auto",
    }}>
      {BACKGROUNDS.map(bg => (
        <BgDot
          key={bg.id}
          color={bg.type === "svg" ? bg.color : (dotColors[bg.id] || "#888888")}
          isActive={activeBg === bg.id}
          onClick={() => onSelect(bg.id)}
        />
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [user, setUser]                   = useState(null);
  const [authLoading, setAuthLoading]     = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage]     = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      const params = new URLSearchParams(window.location.search);
      if (params.get('reset') === 'ok') {
        window.history.replaceState({}, '', '/');
        setAuthMessage('Senha atualizada com sucesso! Faça login com a nova senha.');
        setShowAuthModal(true);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN") {
        setShowAuthModal(false); // fecha modal ao logar
        setPageData({});         // recarrega dados do Supabase
      }
      if (event === "SIGNED_OUT") {
        setPageData({});         // recarrega do localStorage
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const openAuth = (msg = null) => { setAuthMessage(msg); setShowAuthModal(true); };

  const signOut = async () => {
    await supabase.auth.signOut();
    setPageData({});
  };

  // ── Journal state ────────────────────────────────────────────────────────────
  const [offset, setOffset]           = useState(0);
  const [phase, setPhase]             = useState("idle");
  const [pendingDir, setPendingDir]   = useState(null);
  const [openPanel, setOpenPanel]     = useState(null);
  const [selectedId, setSelectedId]   = useState(null);
  const [pageData, setPageData]       = useState({});
  const [lastSave, setLastSave]       = useState(null);

  const [userName, setUserName]       = useState(() => localStorage.getItem("jrnl_username") || "");
  const [avatarSrc, setAvatarSrc]     = useState(() => localStorage.getItem("jrnl_avatar") || "");
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeBg, setActiveBg]       = useState(() => localStorage.getItem("journal_background") || "cutting-mat");

  useEffect(() => { localStorage.setItem("jrnl_username", userName); }, [userName]);
  useEffect(() => { localStorage.setItem("jrnl_avatar", avatarSrc); }, [avatarSrc]);
  useEffect(() => { localStorage.setItem("journal_background", activeBg); }, [activeBg]);

  const maxZRef      = useRef(10);
  const fileInputRef = useRef(null);
  const dragRef      = useRef(null);
  const resizeRef    = useRef(null);
  const rotateRef    = useRef(null);
  const isDraggingRef = useRef(false);

  const rightDate = addDays(today, offset);
  const leftDate  = addDays(today, offset - 1);
  const rightKey  = toKey(rightDate);
  const leftKey   = toKey(leftDate);

  useEffect(() => {
    const keysToLoad = [leftKey, rightKey].filter(k => !(k in pageData));
    if (!keysToLoad.length) return;
    Promise.all(keysToLoad.map(k => loadPageRemote(k, user?.id).then(data => ({ k, data }))))
      .then(results => {
        setPageData(prev => {
          const next = { ...prev };
          results.forEach(({ k, data }) => { next[k] = data; });
          return next;
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftKey, rightKey, user?.id]);

  useEffect(() => {
    if (!Object.keys(pageData).length) return;
    const tid = setTimeout(async () => {
      if (isDraggingRef.current) return;
      await Promise.all(
        Object.entries(pageData).map(([key, data]) => savePageRemote(key, data, user?.id))
      );
      const now = new Date();
      setLastSave(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
    }, 800);
    return () => clearTimeout(tid);
  }, [pageData, user?.id]);

  const mutatePage = (key, updater) => {
    setPageData(prev => {
      const page = prev[key] || { polaroids: [], textBlocks: [], stickers: [], papers: [] };
      return { ...prev, [key]: updater(page) };
    });
  };

  const findSelected = () => {
    if (!selectedId) return null;
    for (const k of [leftKey, rightKey]) {
      const page = pageData[k]; if (!page) continue;
      if ((page.polaroids  || []).find(p => p.id === selectedId)) return { type: "polaroid", key: k };
      if ((page.textBlocks || []).find(b => b.id === selectedId)) return { type: "text",     key: k };
      if ((page.stickers   || []).find(s => s.id === selectedId)) return { type: "sticker",  key: k };
      if ((page.papers     || []).find(p => p.id === selectedId)) return { type: "paper",    key: k };
    }
    return null;
  };
  const selInfo = findSelected();
  const selectedTextBlock = selInfo?.type === "text"
    ? (pageData[selInfo.key]?.textBlocks || []).find(b => b.id === selectedId) || null : null;

  const selectId = (id) => {
    // Auto-deleta bloco de texto vazio ao desselecionar
    if (selectedId && selectedId !== id && selInfo?.type === "text") {
      const page = pageData[selInfo.key];
      const blk = (page?.textBlocks || []).find(b => b.id === selectedId);
      if (blk && !blk.text?.trim()) {
        mutatePage(selInfo.key, p => ({ ...p, textBlocks: (p.textBlocks||[]).filter(x => x.id !== selectedId) }));
      }
    }
    // Bumpa z-index do elemento recém selecionado
    if (id && id !== selectedId) {
      maxZRef.current += 1; const z = maxZRef.current;
      [leftKey, rightKey].forEach(k => {
        setPageData(prev => {
          const page = prev[k]; if (!page) return prev;
          if ((page.polaroids  || []).find(p => p.id === id)) return { ...prev, [k]: { ...page, polaroids:  page.polaroids.map(p  => p.id  === id ? { ...p,  zIndex: z } : p)  } };
          if ((page.textBlocks || []).find(b => b.id === id)) return { ...prev, [k]: { ...page, textBlocks: page.textBlocks.map(b => b.id  === id ? { ...b,  zIndex: z } : b)  } };
          if ((page.stickers   || []).find(s => s.id === id)) return { ...prev, [k]: { ...page, stickers:   page.stickers.map(s   => s.id  === id ? { ...s,  zIndex: z } : s)  } };
          if ((page.papers     || []).find(p => p.id === id)) return { ...prev, [k]: { ...page, papers:     page.papers.map(p     => p.id  === id ? { ...p,  zIndex: z } : p)  } };
          return prev;
        });
      });
    }
    setSelectedId(id);
  };

  // ── Window drag + resize + rotate ─────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (dragRef.current) {
        isDraggingRef.current = true;
        const { type, id, dkey, pageLeft, pageTop, mouseOffsetX, mouseOffsetY,
                siblingKey, siblingPageLeft, siblingPageTop, dims } = dragRef.current;
        const inSibling = siblingKey != null &&
          e.clientX >= siblingPageLeft && e.clientX < siblingPageLeft + PAGE_W;

        if (inSibling) {
          // Cross-page transfer: must use setPageData (structural move between arrays)
          const tgtKey  = siblingKey;
          const tgtLeft = siblingPageLeft;
          const tgtTop  = siblingPageTop;
          if (type === "polaroid") {
            setPageData(prev => {
              const srcPage = prev[dkey]; if (!srcPage) return prev;
              const pol = (srcPage.polaroids || []).find(p => p.id === id); if (!pol) return prev;
              const newX = clamp(e.clientX - tgtLeft - mouseOffsetX, 0, PAGE_W - pol.width);
              const newY = clamp(e.clientY - tgtTop  - mouseOffsetY, 0, PAGE_H - polH(pol.width));
              const tgtPage = prev[tgtKey] || { polaroids:[], textBlocks:[], stickers:[], papers:[] };
              return { ...prev, [dkey]: { ...srcPage, polaroids: srcPage.polaroids.filter(p=>p.id!==id) },
                [tgtKey]: { ...tgtPage, polaroids: [...(tgtPage.polaroids||[]).filter(p=>p.id!==id), {...pol,x:newX,y:newY}] } };
            });
          }
          if (type === "text") {
            const { startClientX, startClientY } = dragRef.current;
            if (Math.abs(e.clientX - startClientX) + Math.abs(e.clientY - startClientY) < 4) return;
            setPageData(prev => {
              const srcPage = prev[dkey]; if (!srcPage) return prev;
              const blk = (srcPage.textBlocks || []).find(b => b.id === id); if (!blk) return prev;
              const newX = clamp(e.clientX - tgtLeft - mouseOffsetX, 0, PAGE_W - blk.width);
              const newY = clamp(e.clientY - tgtTop  - mouseOffsetY, 0, PAGE_H - 20);
              const tgtPage = prev[tgtKey] || { polaroids:[], textBlocks:[], stickers:[], papers:[] };
              return { ...prev, [dkey]: { ...srcPage, textBlocks: srcPage.textBlocks.filter(b=>b.id!==id) },
                [tgtKey]: { ...tgtPage, textBlocks: [...(tgtPage.textBlocks||[]).filter(b=>b.id!==id), {...blk,x:newX,y:newY}] } };
            });
          }
          if (type === "sticker") {
            setPageData(prev => {
              const srcPage = prev[dkey]; if (!srcPage) return prev;
              const stk = (srcPage.stickers || []).find(s => s.id === id); if (!stk) return prev;
              const newX = clamp(e.clientX - tgtLeft - mouseOffsetX, 0, PAGE_W - stk.width);
              const newY = clamp(e.clientY - tgtTop  - mouseOffsetY, 0, PAGE_H - stk.height);
              const tgtPage = prev[tgtKey] || { polaroids:[], textBlocks:[], stickers:[], papers:[] };
              return { ...prev, [dkey]: { ...srcPage, stickers: srcPage.stickers.filter(s=>s.id!==id) },
                [tgtKey]: { ...tgtPage, stickers: [...(tgtPage.stickers||[]).filter(s=>s.id!==id), {...stk,x:newX,y:newY}] } };
            });
          }
          if (type === "paper") {
            setPageData(prev => {
              const srcPage = prev[dkey]; if (!srcPage) return prev;
              const pap = (srcPage.papers || []).find(p => p.id === id); if (!pap) return prev;
              const newX = clamp(e.clientX - tgtLeft - mouseOffsetX, 0, PAGE_W - pap.width);
              const newY = clamp(e.clientY - tgtTop  - mouseOffsetY, 0, PAGE_H - pap.height);
              const tgtPage = prev[tgtKey] || { polaroids:[], textBlocks:[], stickers:[], papers:[] };
              return { ...prev, [dkey]: { ...srcPage, papers: srcPage.papers.filter(p=>p.id!==id) },
                [tgtKey]: { ...tgtPage, papers: [...(tgtPage.papers||[]).filter(p=>p.id!==id), {...pap,x:newX,y:newY}] } };
            });
          }
          // Swap page context; clear pending DOM-final position
          dragRef.current = { ...dragRef.current,
            dkey: siblingKey, pageLeft: siblingPageLeft, pageTop: siblingPageTop,
            siblingKey: dkey, siblingPageLeft: pageLeft, siblingPageTop: pageTop,
            finalX: null, finalY: null };
        } else {
          // Within-page drag: mutate DOM directly, defer setPageData to mouseup
          if (type === "text") {
            const { startClientX, startClientY } = dragRef.current;
            if (Math.abs(e.clientX - startClientX) + Math.abs(e.clientY - startClientY) < 4) return;
          }
          const dW = dims?.w ?? 80;
          const dH = dims?.h ?? 80;
          const TM = 16; // margem interna para texto
          const newX = type === "text"
            ? clamp(e.clientX - pageLeft - mouseOffsetX, TM, PAGE_W - dW - TM)
            : clamp(e.clientX - pageLeft - mouseOffsetX, 0, PAGE_W - dW);
          const newY = type === "text"
            ? clamp(e.clientY - pageTop - mouseOffsetY, TM, PAGE_H - 20 - TM)
            : clamp(e.clientY - pageTop - mouseOffsetY, 0, PAGE_H - dH);
          const el = document.querySelector(`[data-id="${id}"]`);
          if (el) {
            el.style.left = newX + 'px';
            el.style.top  = newY + 'px';
          }
          dragRef.current.finalX = newX;
          dragRef.current.finalY = newY;
        }
      }

      if (resizeRef.current) {
        isDraggingRef.current = true;
        const { type, id, dkey, corner, startX, startY, startW, startPX, startPY } = resizeRef.current;
        const dx = e.clientX - startX;
        const dy = startY != null ? e.clientY - startY : 0;

        if (type === "polaroid") {
          const rot = resizeRef.current.rotation ?? 0;
          const rad = rot * Math.PI / 180;
          const localDX = dx * Math.cos(rad) + dy * Math.sin(rad);
          let newW, newX, newY;
          if (corner === "br")      { newW = clamp(startW + localDX, 80, 320); newX = startPX; newY = startPY; }
          else if (corner === "bl") { newW = clamp(startW - localDX, 80, 320); newX = startPX + startW - newW; newY = startPY; }
          else if (corner === "tr") { newW = clamp(startW + localDX, 80, 320); newX = startPX; newY = startPY + startW - newW; }
          else                      { newW = clamp(startW - localDX, 80, 320); newX = startPX + startW - newW; newY = startPY + startW - newW; }
          newX = clamp(newX, 0, PAGE_W - newW); newY = clamp(newY, 0, PAGE_H - polH(newW));
          const newH = polH(newW);
          const el = document.querySelector(`[data-id="${id}"]`);
          if (el) {
            el.style.width = newW + 'px'; el.style.height = newH + 'px';
            el.style.left  = newX + 'px'; el.style.top   = newY + 'px';
            const img = el.querySelector('img');
            if (img) { img.style.width = (newW - 16) + 'px'; img.style.height = (newW - 16) + 'px'; }
          }
          resizeRef.current.finalW = newW; resizeRef.current.finalH = newH;
          resizeRef.current.finalX = newX; resizeRef.current.finalY = newY;
        }
        if (type === "sticker") {
          const { startH, aspect, rotation: rot = 0 } = resizeRef.current;
          const rad = rot * Math.PI / 180;
          const localDX = dx * Math.cos(rad) + dy * Math.sin(rad);
          let newW = (corner === "bl" || corner === "tl") ? startW - localDX : startW + localDX;
          newW = clamp(newW, 40, 300);
          const newH = newW / aspect;
          let newX = (corner === "bl" || corner === "tl") ? startPX + startW - newW : startPX;
          let newY = (corner === "tr" || corner === "tl") ? startPY + startH - newH : startPY;
          newX = clamp(newX, 0, PAGE_W - newW); newY = clamp(newY, 0, PAGE_H - newH);
          const el = document.querySelector(`[data-id="${id}"]`);
          if (el) {
            el.style.width = newW + 'px'; el.style.height = newH + 'px';
            el.style.left  = newX + 'px'; el.style.top   = newY + 'px';
            const img = el.querySelector('img');
            if (img) { img.style.width = newW + 'px'; img.style.height = newH + 'px'; }
          }
          resizeRef.current.finalW = newW; resizeRef.current.finalH = newH;
          resizeRef.current.finalX = newX; resizeRef.current.finalY = newY;
        }
        if (type === "paper") {
          const { startH, aspect, rotation: rot = 0 } = resizeRef.current;
          const rad = rot * Math.PI / 180;
          const localDX = dx * Math.cos(rad) + dy * Math.sin(rad);
          let newW = (corner === "bl" || corner === "tl") ? startW - localDX : startW + localDX;
          newW = clamp(newW, 40, 400);
          const newH = newW / aspect;
          let newX = (corner === "bl" || corner === "tl") ? startPX + startW - newW : startPX;
          let newY = (corner === "tr" || corner === "tl") ? startPY + startH - newH : startPY;
          newX = clamp(newX, 0, PAGE_W - newW); newY = clamp(newY, 0, PAGE_H - newH);
          const el = document.querySelector(`[data-id="${id}"]`);
          if (el) {
            el.style.width = newW + 'px'; el.style.height = newH + 'px';
            el.style.left  = newX + 'px'; el.style.top   = newY + 'px';
          }
          resizeRef.current.finalW = newW; resizeRef.current.finalH = newH;
          resizeRef.current.finalX = newX; resizeRef.current.finalY = newY;
        }
        // Texto: resize escala fontSize — requires re-render for textarea auto-height
        if (type === "text") {
          const { rotation: rot = 0, startFontSize = 16 } = resizeRef.current;
          const rad = rot * Math.PI / 180;
          const localDX = dx * Math.cos(rad) + dy * Math.sin(rad);
          setPageData(prev => {
            const page = prev[dkey]; if (!page) return prev;
            let newW = (corner === "bl" || corner === "tl") ? startW - localDX : startW + localDX;
            newW = clamp(newW, 40, PAGE_W);
            const scale = newW / startW;
            const newFontSize = clamp(Math.round(startFontSize * scale), 6, 120);
            let newX = (corner === "bl" || corner === "tl") ? startPX + startW - newW : startPX;
            newX = clamp(newX, 0, PAGE_W - newW);
            return { ...prev, [dkey]: { ...page, textBlocks: page.textBlocks.map(b => b.id===id?{...b,width:newW,x:newX,fontSize:newFontSize}:b) } };
          });
        }
      }

      if (rotateRef.current) {
        isDraggingRef.current = true;
        const { id, centerX, centerY } = rotateRef.current;
        const newAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
        const el = document.querySelector(`[data-id="${id}"]`);
        if (el) el.style.transform = `rotate(${newAngle}deg)`;
        rotateRef.current.finalAngle = newAngle;
      }
    };

    const onUp = () => {
      document.body.style.userSelect = "";
      isDraggingRef.current = false;

      // Commit drag final position to React state (one update instead of per-pixel)
      if (dragRef.current?.finalX != null) {
        const { type, id, dkey, finalX, finalY } = dragRef.current;
        setPageData(prev => {
          const page = prev[dkey]; if (!page) return prev;
          if (type === "polaroid") return { ...prev, [dkey]: { ...page, polaroids:  page.polaroids.map(p  => p.id===id ? {...p,  x:finalX, y:finalY} : p)  } };
          if (type === "text")     return { ...prev, [dkey]: { ...page, textBlocks: page.textBlocks.map(b => b.id===id ? {...b,  x:finalX, y:finalY} : b)  } };
          if (type === "sticker")  return { ...prev, [dkey]: { ...page, stickers:   page.stickers.map(s   => s.id===id ? {...s,  x:finalX, y:finalY} : s)  } };
          if (type === "paper")    return { ...prev, [dkey]: { ...page, papers:     (page.papers||[]).map(p => p.id===id ? {...p, x:finalX, y:finalY} : p)  } };
          return prev;
        });
      }

      // Commit resize final dimensions to React state
      if (resizeRef.current?.finalW != null) {
        const { type, id, dkey, finalW, finalH, finalX, finalY } = resizeRef.current;
        setPageData(prev => {
          const page = prev[dkey]; if (!page) return prev;
          if (type === "polaroid") return { ...prev, [dkey]: { ...page, polaroids: page.polaroids.map(p => p.id===id ? {...p, width:finalW, x:finalX, y:finalY} : p) } };
          if (type === "sticker")  return { ...prev, [dkey]: { ...page, stickers:  page.stickers.map(s  => s.id===id ? {...s, width:finalW, height:finalH, x:finalX, y:finalY} : s) } };
          if (type === "paper")    return { ...prev, [dkey]: { ...page, papers:    (page.papers||[]).map(p => p.id===id ? {...p, width:finalW, height:finalH, x:finalX, y:finalY} : p) } };
          return prev;
        });
      }

      // Commit rotation final angle to React state
      if (rotateRef.current?.finalAngle != null) {
        const { type, id, dkey, finalAngle } = rotateRef.current;
        setPageData(prev => {
          const page = prev[dkey]; if (!page) return prev;
          if (type === "polaroid") return { ...prev, [dkey]: { ...page, polaroids:  page.polaroids.map(p  => p.id===id ? {...p, rotation:finalAngle} : p)  } };
          if (type === "sticker")  return { ...prev, [dkey]: { ...page, stickers:   page.stickers.map(s   => s.id===id ? {...s, rotation:finalAngle} : s)  } };
          if (type === "paper")    return { ...prev, [dkey]: { ...page, papers:     (page.papers||[]).map(p => p.id===id ? {...p, rotation:finalAngle} : p)  } };
          if (type === "text")     return { ...prev, [dkey]: { ...page, textBlocks: page.textBlocks.map(b => b.id===id ? {...b, rotation:finalAngle} : b)  } };
          return prev;
        });
      }

      dragRef.current = null; resizeRef.current = null; rotateRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── Keyboard delete ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (!selectedId) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        [leftKey, rightKey].forEach(k => {
          setPageData(prev => {
            const page = prev[k]; if (!page) return prev;
            if ((page.polaroids  || []).find(p => p.id === selectedId)) return { ...prev, [k]: { ...page, polaroids:  page.polaroids.filter(p  => p.id  !== selectedId) } };
            if ((page.textBlocks || []).find(b => b.id === selectedId)) return { ...prev, [k]: { ...page, textBlocks: page.textBlocks.filter(b => b.id  !== selectedId) } };
            if ((page.stickers   || []).find(s => s.id === selectedId)) return { ...prev, [k]: { ...page, stickers:   page.stickers.filter(s   => s.id  !== selectedId) } };
            if ((page.papers     || []).find(p => p.id === selectedId)) return { ...prev, [k]: { ...page, papers:     page.papers.filter(p     => p.id  !== selectedId) } };
            return prev;
          });
        });
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, leftKey, rightKey]);

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const W = 140; maxZRef.current += 1;
      const pol = { id: `pol_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, src: ev.target.result,
        x: Math.round((PAGE_W-W)/2), y: Math.round((PAGE_H-polH(W))/2),
        width: W, rotation: Math.random()*10-5, caption: "", zIndex: maxZRef.current };
      mutatePage(rightKey, page => ({ ...page, polaroids: [...(page.polaroids||[]), pol] }));
      setSelectedId(pol.id);
    };
    reader.readAsDataURL(file); e.target.value = "";
  };

  // ── Add text block na posição do clique ───────────────────────────────────
  const addTextBlockAt = (x, y, dateKey) => {
    const MARGIN = 16;
    const W = 160; maxZRef.current += 1;
    const blk = {
      id: `txt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      x: clamp(x, MARGIN, PAGE_W - W - MARGIN),
      y: clamp(y, MARGIN, PAGE_H - MARGIN),
      width: W,
      text: "", fontFamily: FONTS[0].value, fontSize: 16, color: "#1A1A1A",
      rotation: 0, zIndex: maxZRef.current,
    };
    mutatePage(dateKey, page => ({ ...page, textBlocks: [...(page.textBlocks||[]), blk] }));
    setSelectedId(blk.id);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const deletePolaroid = (key, id) => { mutatePage(key, p => ({...p, polaroids: (p.polaroids||[]).filter(x=>x.id!==id)})); setSelectedId(null); };
  const changePolaroid = (key, id, ch) => { mutatePage(key, p => ({...p, polaroids: (p.polaroids||[]).map(x=>x.id===id?{...x,...ch}:x)})); };
  const deleteTextBlock = (key, id) => { mutatePage(key, p => ({...p, textBlocks: (p.textBlocks||[]).filter(x=>x.id!==id)})); setSelectedId(null); };
  const changeTextBlock = (key, id, ch) => { mutatePage(key, p => ({...p, textBlocks: (p.textBlocks||[]).map(x=>x.id===id?{...x,...ch}:x)})); };
  const applyToSelected = (ch) => { if (!selInfo || selInfo.type !== "text") return; changeTextBlock(selInfo.key, selectedId, ch); };
  const addSticker = (type, url = null) => {
    let W, H;
    if (type === 'png-sticker') {
      W = 100; H = 100;
    } else {
      const def = STICKER_DEFS[type]; if (!def) return;
      W = def.defaultW; H = Math.round(W * def.vh / def.vw);
    }
    maxZRef.current += 1;
    const stk = {
      id: `stk_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      type, ...(url ? { url } : {}),
      x: Math.round((PAGE_W-W)/2), y: Math.round((PAGE_H-H)/2),
      width: W, height: H, rotation: 0, zIndex: maxZRef.current,
    };
    mutatePage(rightKey, p => ({...p, stickers: [...(p.stickers||[]), stk]}));
    setSelectedId(stk.id);
  };
  const deleteSticker = (key, id) => { mutatePage(key, p => ({...p, stickers: (p.stickers||[]).filter(s=>s.id!==id)})); setSelectedId(null); };
  const addPaper = (url) => {
    const W = 180, H = 180; maxZRef.current += 1;
    const pap = { id: `pap_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, url,
      x: Math.round((PAGE_W-W)/2), y: Math.round((PAGE_H-H)/2),
      width: W, height: H, rotation: 0, zIndex: maxZRef.current };
    mutatePage(rightKey, p => ({...p, papers: [...(p.papers||[]), pap]}));
    setSelectedId(pap.id);
  };
  const deletePaper = (key, id) => { mutatePage(key, p => ({...p, papers: (p.papers||[]).filter(x=>x.id!==id)})); setSelectedId(null); };

  // ── Navigation ────────────────────────────────────────────────────────────
  const navigate = (dir) => {
    if (phase !== "idle") return;
    if (dir === "right" && offset >= 0) return;
    setSelectedId(null); setPendingDir(dir); setPhase("out");
    setTimeout(() => {
      setOffset(o => dir === "left" ? o-1 : o+1);
      setPhase("in"); setTimeout(() => setPhase("idle"), 180);
    }, 180);
  };
  const navigateToOffset = (newOffset) => {
    if (newOffset === offset) return; setSelectedId(null); setOffset(newOffset);
  };

  const translateX =
    phase === "out" ? (pendingDir === "left" ? -12 : 12)
    : phase === "in" ? (pendingDir === "left" ? 12 : -12) : 0;

  const cadernoAnim = {
    opacity: phase === "idle" ? 1 : phase === "out" ? 0 : 1,
    transform: `translateX(${translateX}px)`,
    transition: phase === "idle" ? "opacity 0.18s ease, transform 0.18s ease" : "none",
  };

  const leftPols      = pageData[leftKey]?.polaroids  || [];
  const rightPols     = pageData[rightKey]?.polaroids  || [];
  const leftBlocks    = pageData[leftKey]?.textBlocks  || [];
  const rightBlocks   = pageData[rightKey]?.textBlocks || [];
  const leftStickers  = pageData[leftKey]?.stickers    || [];
  const rightStickers = pageData[rightKey]?.stickers   || [];
  const leftPapers    = pageData[leftKey]?.papers      || [];
  const rightPapers   = pageData[rightKey]?.papers     || [];

  const closePanel  = () => setOpenPanel(null);
  const togglePanel = (name) => setOpenPanel(p => p === name ? null : name);

  // ── Avatar inline ─────────────────────────────────────────────────────────
  const avatarInitial = userName ? userName[0].toUpperCase() : "?";

  // ── Background helper ──────────────────────────────────────────────────────
  const isMat  = activeBg === "cutting-mat";
  const bgDef  = BACKGROUNDS.find(b => b.id === activeBg);

  // Loading inicial mínimo (só enquanto verifica sessão)
  if (authLoading) return (
    <div style={{ width:"100vw", height:"100vh", background:"#2D5A3D", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <img src={logo} alt="jrnl" style={{ height: 24, opacity: 0.5, userSelect: "none", pointerEvents: "none" }} />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Caveat:wght@400;600&family=Covered+By+Your+Grace&family=Coming+Soon&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #2D5A3D; }
        button { outline: none; border: none; background: none; cursor: pointer; }
        textarea::placeholder { color: #BBBBBB; font-style: italic; }
        @keyframes fadeDropdown {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div
        onClick={() => { if (openPanel) setOpenPanel(null); if (profileOpen) setProfileOpen(false); }}
        style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: HEADER_H,
          background: "#F3F0E6",
          borderBottom: "1px solid #CFC7B8",
          zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px",
          fontFamily: UI_FONT,
        }}
      >
        {/* Left: logo + save status */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={logo} alt="jrnl" style={{ height: 26, userSelect: "none", pointerEvents: "none" }} />
          <div style={{ fontSize: 13, fontWeight: 400, color: "#969287", letterSpacing: "0.02em" }}>
            {user
              ? (lastSave ? `Salvo às ${lastSave}` : "")
              : "Faça login para salvar as alterações"
            }
          </div>
        </div>

        {/* Right: login button (deslogado) ou avatar (logado) */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {user ? (
            <div
              onClick={e => { e.stopPropagation(); setProfileOpen(p => !p); }}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                backgroundColor: avatarSrc ? "transparent" : "#DDD8D0",
                border: `1px solid ${profileOpen ? "#A0A09A" : "#C8C2B8"}`,
                overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "border-color 0.12s", flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#A0A09A"}
              onMouseLeave={e => e.currentTarget.style.borderColor = profileOpen ? "#A0A09A" : "#C8C2B8"}
            >
              {avatarSrc
                ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontFamily: UI_FONT, fontSize: 14, fontWeight: 600, color: "#969287" }}>{avatarInitial}</span>
              }
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); openAuth(); }}
              style={{
                fontFamily: UI_FONT, fontSize: 13, fontWeight: 500,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "#656259", border: "1px solid #C8C2B8", borderRadius: 4,
                padding: "6px 16px", background: "transparent",
                cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#E5E0D2"; e.currentTarget.style.borderColor = "#A0A09A"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#C8C2B8"; }}
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <aside
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", left: 0, top: HEADER_H,
          width: SIDEBAR_W, height: `calc(100vh - ${HEADER_H}px)`,
          background: "#F3F0E6",
          borderRight: "1px solid #CFC7B8",
          display: "flex", flexDirection: "column",
          zIndex: 200, overflow: "visible",
        }}
      >
        <SidebarIcon icon={CameraIcon}  label="Polaroids" active={openPanel === "camera"}   onClick={() => togglePanel("camera")} />
        <SidebarIcon icon={SparkleIcon} label="Stickers"  active={openPanel === "stickers"} onClick={() => togglePanel("stickers")} />
        <SidebarIcon icon={TextIconAa}  label="Texto"     active={openPanel === "text"}     onClick={() => togglePanel("text")} />
        <SidebarIcon icon={PaperIcon}   label="Paper"     active={openPanel === "paper"}    onClick={() => togglePanel("paper")} />
      </aside>

      {/* ── PANELS ─────────────────────────────────────────────────────────── */}
      <CameraPanel  fileInputRef={fileInputRef} onClose={closePanel} open={openPanel === "camera"} />
      <StickerPanel onAddSticker={addSticker}   onClose={closePanel} open={openPanel === "stickers"} />
      <TextPanel onClose={closePanel} open={openPanel === "text"} />
      <PaperPanel onAddPaper={addPaper} onClose={closePanel} open={openPanel === "paper"} />

      {/* Toolbar flutuante de texto — fixed, fora do DOM do caderno */}
      {selInfo?.type === "text" && selectedTextBlock && (
        <TextToolbar
          selectedBlock={selectedTextBlock}
          onApply={applyToSelected}
          onDelete={() => deleteTextBlock(selInfo.key, selectedId)}
        />
      )}

      {/* ── AUTH MODAL ───────────────────────────────────────────────────── */}
      {showAuthModal && (
        <Auth
          onClose={() => setShowAuthModal(false)}
          message={authMessage}
        />
      )}

      {/* ── PROFILE DROPDOWN ─────────────────────────────────────────────── */}
      {profileOpen && user && (
        <ProfileDropdown
          userName={userName} setUserName={setUserName}
          avatarSrc={avatarSrc} onAvatarChange={src => setAvatarSrc(src)}
          onNavigate={navigateToOffset}
          onClose={() => setProfileOpen(false)}
          todayRef={today}
          onSignOut={signOut}
        />
      )}

      {/* ── MAIN JOURNAL AREA ────────────────────────────────────────────── */}
      <main
        onClick={() => { if (openPanel) setOpenPanel(null); if (profileOpen) setProfileOpen(false); }}
        style={{
          position: "fixed", left: SIDEBAR_W, top: HEADER_H,
          width: `calc(100vw - ${SIDEBAR_W}px)`,
          height: `calc(100vh - ${HEADER_H}px)`,
          backgroundColor: isMat ? "#2D5A3D" : undefined,
          backgroundImage: isMat ? MAT_GRID : bgDef?.type === "image" ? `url(${bgDef.url})` : undefined,
          backgroundSize: isMat ? "50px 50px" : "cover",
          backgroundPosition: isMat ? undefined : "center",
          backgroundRepeat: isMat ? undefined : "no-repeat",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
          minWidth: 1200 - SIDEBAR_W,
        }}
      >
        {/* Ruler — top strip (cutting mat only) */}
        {isMat && <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 14,
          background: "#265235",
          backgroundImage: [
            "repeating-linear-gradient(90deg, transparent 0, transparent 9px, rgba(74,144,96,0.45) 9px, rgba(74,144,96,0.45) 10px)",
            "repeating-linear-gradient(90deg, transparent 0, transparent 49px, rgba(74,144,96,0.9) 49px, rgba(74,144,96,0.9) 50px)",
          ].join(", "),
          zIndex: 10, pointerEvents: "none",
        }} />}
        {/* Ruler — left strip (cutting mat only) */}
        {isMat && <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: 14,
          background: "#265235",
          backgroundImage: [
            "repeating-linear-gradient(0deg, transparent 0, transparent 9px, rgba(74,144,96,0.45) 9px, rgba(74,144,96,0.45) 10px)",
            "repeating-linear-gradient(0deg, transparent 0, transparent 49px, rgba(74,144,96,0.9) 49px, rgba(74,144,96,0.9) 50px)",
          ].join(", "),
          zIndex: 10, pointerEvents: "none",
        }} />}

        {/* Watermark (cutting mat only) */}
        {isMat && <div style={{
          position: "absolute", bottom: 18, left: 24,
          fontFamily: UI_FONT, fontSize: 9, fontWeight: 400,
          color: "#3D7A52", opacity: 0.7, letterSpacing: "0.12em",
          textTransform: "uppercase", userSelect: "none", pointerEvents: "none",
          zIndex: 5,
        }}>
          SDI® Cutting Mat 30×22cm A4
        </div>}

        {/* Background selector dots */}
        <BgDots activeBg={activeBg} onSelect={setActiveBg} />

        {/* Nav arrow left */}
        <div style={{ position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)", zIndex: 20 }}>
          <NavArrow direction="left" onClick={() => navigate("left")} disabled={phase !== "idle"} />
        </div>

        {/* Nav arrow right */}
        <div style={{ position: "absolute", right: 22, top: "50%", transform: "translateY(-50%)", zIndex: 20 }}>
          <NavArrow direction="right" onClick={() => navigate("right")} disabled={offset >= 0 || phase !== "idle"} />
        </div>

        {/* ── CADERNO ───────────────────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            width: CADERNO_W, height: CADERNO_H,
            ...cadernoAnim,
            filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.55))",
            flexShrink: 0,
          }}
        >
          {/* Cover PNG */}
          <img
            src={COVER_URL}
            alt=""
            draggable={false}
            loading="eager"
            fetchpriority="high"
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
              objectFit: "fill",
              userSelect: "none", pointerEvents: "none",
              borderRadius: 3,
            }}
          />

          {/* Left page area */}
          <div style={{ position: "absolute", top: PAGE_Y, left: LEFT_PAGE_X }}>
            <JournalPage
              date={leftDate} side="left"
              polaroids={leftPols} textBlocks={leftBlocks}
              stickers={leftStickers} papers={leftPapers}
              selectedId={selectedId} onSelectId={selectId}
              onDeletePolaroid={deletePolaroid} onChangePolaroid={changePolaroid}
              onDeleteTextBlock={deleteTextBlock} onChangeTextBlock={changeTextBlock}
              onDeleteSticker={deleteSticker} onDeletePaper={deletePaper}
              dragRef={dragRef} resizeRef={resizeRef} rotateRef={rotateRef}
              dateKey={leftKey} siblingDateKey={rightKey}
              textPanelOpen={openPanel === "text"}
              onCreateTextAt={(x, y) => addTextBlockAt(x, y, leftKey)}
            />
          </div>

          {/* Spine */}
          <div style={{
            position: "absolute",
            top: PAGE_Y, left: LEFT_PAGE_X + PAGE_W,
            width: SPINE_W, height: PAGE_H,
            background: "linear-gradient(to right, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.04) 40%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.14) 100%)",
            pointerEvents: "none",
          }}>
            <div style={{
              position: "absolute", left: "50%", top: 0, width: 1, height: "100%",
              background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.15) 10%, rgba(0,0,0,0.15) 90%, transparent)",
              transform: "translateX(-50%)",
            }} />
          </div>

          {/* Right page area */}
          <div style={{ position: "absolute", top: PAGE_Y, left: RIGHT_PAGE_X }}>
            <JournalPage
              date={rightDate} side="right"
              polaroids={rightPols} textBlocks={rightBlocks}
              stickers={rightStickers} papers={rightPapers}
              selectedId={selectedId} onSelectId={selectId}
              onDeletePolaroid={deletePolaroid} onChangePolaroid={changePolaroid}
              onDeleteTextBlock={deleteTextBlock} onChangeTextBlock={changeTextBlock}
              onDeleteSticker={deleteSticker} onDeletePaper={deletePaper}
              dragRef={dragRef} resizeRef={resizeRef} rotateRef={rotateRef}
              dateKey={rightKey} siblingDateKey={leftKey}
              textPanelOpen={openPanel === "text"}
              onCreateTextAt={(x, y) => addTextBlockAt(x, y, rightKey)}
            />
          </div>
        </div>
      </main>
    </>
  );
}

