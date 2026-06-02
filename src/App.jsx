import { useState, useEffect, useRef } from "react";
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

const COVER_URL = "https://raw.githubusercontent.com/debbora12/journal-assets/main/covers/Design%20sem%20nome.png";

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

const COLORS = [
  "#1A1A1A", "#FFFFFF", "#888888", "#C0392B",
  "#E91E8C", "#8E44AD", "#2980B9", "#27AE60",
  "#F1C40F", "#E67E22", "#D4C5A9", "#6D4C41",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = MONTHS_PT[date.getMonth()];
  return `${d} ${m}`;
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
    render: (uid, w, h) => stickerImg("https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/Frame_2-removebg-preview.png", w, h),
  },
  "star_gold_png": {
    label: "Estrelas Douradas", vw: 1, vh: 1, defaultW: 90,
    render: (uid, w, h) => stickerImg("https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/image_10-removebg-preview.png", w, h),
  },
  "heart_pink_png": {
    label: "Coração Rosa", vw: 1, vh: 1, defaultW: 80,
    render: (uid, w, h) => stickerImg("https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/Frame_3-removebg-preview.png", w, h),
  },
  "pin_red": {
    label: "Pin Vermelho", vw: 1, vh: 1, defaultW: 60,
    render: (uid, w, h) => stickerImg("https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/image_3-removebg-preview.png", w, h),
  },
  "clip_metal": {
    label: "Clipe Metálico", vw: 1, vh: 1, defaultW: 60,
    render: (uid, w, h) => stickerImg("https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/image_2-removebg-preview.png", w, h),
  },
};

const STICKER_CATEGORIES = [
  { name: "Hearts",       types: ["heart_pink_png"],                  cols: 2 },
  { name: "Stars",        types: ["star_silver_png", "star_gold_png"], cols: 2 },
  { name: "Office Goods", types: ["pin_red", "clip_metal"],           cols: 2 },
];

const PAPERS = [
  { key: "paper08", url: "https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2008.png" },
  { key: "paper09", url: "https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2009.png" },
  { key: "paper12", url: "https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2012.png" },
  { key: "paper17", url: "https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2017.png" },
  { key: "paper18", url: "https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2018.png" },
  { key: "paper27", url: "https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2027.png" },
  { key: "paper28", url: "https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2028.png" },
  { key: "paper46", url: "https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2046.png" },
];

// ── SidebarIcon ───────────────────────────────────────────────────────────────
const UI_FONT = "'Barlow Condensed', sans-serif";

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
        background: active ? "#D8D2C8" : hov ? "#E0DAD0" : "transparent",
        borderLeft: `2px solid ${active ? "#1A1A1A" : "transparent"}`,
        borderBottom: "0.5px solid #D8D2C8",
        transition: "background 0.12s",
        color: active ? "#1A1A1A" : hov ? "#333333" : "#AAAAAA",
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
      padding: "14px 16px 12px", borderBottom: "1px solid #D8D2C8", flexShrink: 0,
    }}>
      <span style={{
        fontFamily: UI_FONT, fontSize: 13, fontWeight: 600, color: "#555555",
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
          background: hov ? "#D8D2C8" : "transparent",
          border: "none", color: hov ? "#333333" : "#AAAAAA",
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
  background: "#F0EBE3",
  borderRight: "1px solid #D8D2C8",
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
            background: hov ? "#E0DAD0" : "transparent",
            color: hov ? "#333333" : "#888888",
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
function TextPanel({ selectedBlock, onAddTextBlock, onApplyToSelected, onClose, open }) {
  const [hovBtn, setHovBtn] = useState(false);
  const curFont  = selectedBlock?.fontFamily || FONTS[0].value;
  const curColor = selectedBlock?.color      || "#1A1A1A";

  const SLabel = ({ children }) => (
    <div style={{
      fontFamily: UI_FONT, fontSize: 11, fontWeight: 600, color: "#888888",
      textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, userSelect: "none",
    }}>
      {children}
    </div>
  );

  return (
    <div onClick={e => e.stopPropagation()} style={{ ...panelBase(open), overflowY: "auto" }}>
      <PanelHeader label="texto" onClose={onClose} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
        <button
          onClick={onAddTextBlock}
          onMouseEnter={() => setHovBtn(true)}
          onMouseLeave={() => setHovBtn(false)}
          style={{
            border: `1px solid ${hovBtn ? "#A0A09A" : "#C8C2B8"}`,
            background: hovBtn ? "#E0DAD0" : "transparent",
            color: hovBtn ? "#333333" : "#888888",
            fontFamily: UI_FONT, fontSize: 13, fontWeight: 500,
            padding: "9px 0", width: "100%", cursor: "pointer",
            transition: "all 0.15s", borderRadius: 4, letterSpacing: "0.04em",
          }}
        >
          + adicionar bloco
        </button>

        <div>
          <SLabel>fonte</SLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {FONTS.map(f => {
              const active = curFont === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => onApplyToSelected({ fontFamily: f.value })}
                  style={{
                    width: "100%", padding: "8px 10px",
                    background: active ? "#D8D2C8" : "transparent",
                    border: `1px solid ${active ? "#A0A09A" : "#C8C2B8"}`,
                    color: active ? "#1A1A1A" : "#666666",
                    fontSize: 14, fontFamily: f.value, textAlign: "left",
                    cursor: "pointer", borderRadius: 3, transition: "all 0.1s",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <SLabel>cor</SLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, justifyItems: "center" }}>
            {COLORS.map(c => (
              <div
                key={c}
                onClick={() => onApplyToSelected({ color: c })}
                style={{
                  width: 26, height: 26, borderRadius: "50%", background: c,
                  cursor: "pointer",
                  outline: curColor === c ? "2px solid #555555" : "none",
                  outlineOffset: 2,
                  border: c === "#FFFFFF" ? "1px solid #C8C2B8" : "none",
                  boxSizing: "border-box", transition: "outline 0.1s",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── StickerPanel ──────────────────────────────────────────────────────────────
function StickerPanel({ onAddSticker, onClose, open }) {
  const [collapsed, setCollapsed] = useState({});
  return (
    <div onClick={e => e.stopPropagation()} style={panelBase(open)}>
      <PanelHeader label="stickers" onClose={onClose} />
      <div style={{ overflowY: "auto", flex: 1 }}>
        {STICKER_CATEGORIES.map(cat => {
          const isOpen = !collapsed[cat.name];
          return (
            <div key={cat.name}>
              <div
                onClick={() => setCollapsed(p => ({ ...p, [cat.name]: !p[cat.name] }))}
                style={{
                  padding: "9px 16px",
                  fontFamily: UI_FONT, fontSize: 11, fontWeight: 600, color: "#888888",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  userSelect: "none", borderBottom: "0.5px solid #D8D2C8",
                }}
              >
                {cat.name}
                <span style={{ fontSize: 8, color: "#AAAAAA" }}>{isOpen ? "▼" : "▶"}</span>
              </div>
              {isOpen && (
                <div style={{
                  display: "grid", gridTemplateColumns: `repeat(${cat.cols}, 1fr)`,
                  gap: 6, padding: "8px 12px 12px",
                }}>
                  {cat.types.map(type => {
                    const def = STICKER_DEFS[type];
                    if (!def) return null;
                    const ph = 48;
                    const pw = Math.round((ph * def.vw) / def.vh);
                    return (
                      <div
                        key={type}
                        onClick={() => onAddSticker(type)}
                        title={def.label}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 8, background: "#E8E3DA", borderRadius: 6,
                          cursor: "pointer", border: "1px solid #D8D2C8",
                          transition: "background 0.12s, border-color 0.12s",
                          minHeight: ph + 16,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#D8D2C8"; e.currentTarget.style.borderColor = "#C8C2B8"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#E8E3DA"; e.currentTarget.style.borderColor = "#D8D2C8"; }}
                      >
                        {def.render(`prev_${type}`, pw, ph)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PaperPanel ────────────────────────────────────────────────────────────────
function PaperPanel({ open, onClose, onAddPaper }) {
  return (
    <div onClick={e => e.stopPropagation()} style={panelBase(open)}>
      <PanelHeader label="paper" onClose={onClose} />
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div style={{ fontFamily: UI_FONT, fontSize: 11, fontWeight: 600, color: "#888888", textTransform: "uppercase", letterSpacing: "0.1em", userSelect: "none" }}>
          adicionar papel
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {PAPERS.map(p => (
            <div
              key={p.key}
              onClick={() => onAddPaper(p.url)}
              style={{
                width: "100%", aspectRatio: "88 / 64", borderRadius: 6,
                overflow: "hidden", cursor: "pointer", border: "1px solid #D8D2C8",
                transition: "border-color 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#A0A09A"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8D2C8"; }}
            >
              <img src={p.url} alt={p.key} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
      <div style={{ width: 1, height: 14, background: "#AAAAAA", pointerEvents: "none" }} />
    </div>
  );
}

// ── StickerElement ────────────────────────────────────────────────────────────
const RESIZE_CURSORS = { tl: "nw-resize", tr: "ne-resize", bl: "sw-resize", br: "se-resize" };

function StickerElement({ data, isSelected, onMouseDownDrag, onMouseDownResize, onMouseDownRotate, onDelete }) {
  const { x, y, width, height, type, zIndex, rotation } = data;
  const def = STICKER_DEFS[type];
  if (!def) return null;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width, height, zIndex,
        cursor: "grab", transform: `rotate(${rotation ?? 0}deg)`, transformOrigin: "center center",
        outline: isSelected ? "1px dashed #888888" : "none", outlineOffset: 3,
        userSelect: "none", lineHeight: 0,
      }}
      onMouseDown={onMouseDownDrag}
    >
      {def.render(data.id, width, height)}
      {isSelected && (
        <>
          <RotationHandle onMouseDown={onMouseDownRotate} />
          <div onMouseDown={e => { e.stopPropagation(); onDelete(); }}
            style={{ position: "absolute", top: -9, right: -9, width: 18, height: 18, borderRadius: "50%", background: "#555555", color: "#FFFFFF", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 9999, lineHeight: 1 }}>
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
}

// ── PaperElement ──────────────────────────────────────────────────────────────
function PaperElement({ data, isSelected, onMouseDownDrag, onMouseDownResize, onMouseDownRotate, onDelete }) {
  const { x, y, width, height, url, rotation, zIndex } = data;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width, height, zIndex,
        cursor: "grab", transform: `rotate(${rotation ?? 0}deg)`, transformOrigin: "center center",
        outline: isSelected ? "1px dashed #888888" : "none", outlineOffset: 3, userSelect: "none",
      }}
      onMouseDown={onMouseDownDrag}
    >
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 2 }}>
        <img src={url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
      </div>
      {isSelected && (
        <>
          <RotationHandle onMouseDown={onMouseDownRotate} />
          <div onMouseDown={e => { e.stopPropagation(); onDelete(); }}
            style={{ position: "absolute", top: -9, right: -9, width: 18, height: 18, borderRadius: "50%", background: "#555555", color: "#FFFFFF", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 9999, lineHeight: 1 }}>
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
}

// ── Polaroid ──────────────────────────────────────────────────────────────────
function Polaroid({ data, isSelected, onMouseDownDrag, onMouseDownResize, onMouseDownRotate, onDelete, onCaptionChange }) {
  const { x, y, width, rotation, caption, src, zIndex } = data;
  const h = polH(width);
  const photoSize = width - 16;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width, height: h,
        background: "#FFFFFF", padding: "8px 8px 28px 8px",
        boxShadow: isSelected ? "3px 4px 18px rgba(0,0,0,0.22)" : "2px 3px 10px rgba(0,0,0,0.14)",
        transform: `rotate(${rotation}deg)`, transformOrigin: "center center",
        zIndex, cursor: "grab",
        outline: isSelected ? "1.5px dashed #888888" : "none",
        outlineOffset: 3, userSelect: "none", boxSizing: "border-box",
      }}
      onMouseDown={onMouseDownDrag}
    >
      <img src={src} alt="" draggable={false} style={{ width: photoSize, height: photoSize, objectFit: "cover", display: "block", pointerEvents: "none" }} />
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
            style={{ position: "absolute", top: -9, right: -9, width: 18, height: 18, borderRadius: "50%", background: "#555555", color: "#FFFFFF", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 9999, lineHeight: 1 }}>
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
}

// ── TextBlock ─────────────────────────────────────────────────────────────────
function TextBlock({ data, isSelected, onMouseDownDrag, onSelect, onDelete, onTextChange, onMouseDownResize, onMouseDownRotate }) {
  const { x, y, width, text, fontFamily, fontSize, color, zIndex, rotation } = data;
  const textareaRef = useRef(null);

  useEffect(() => {
    const ta = textareaRef.current; if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [text, fontSize, fontFamily, width]);

  useEffect(() => {
    if (data.text === "" && textareaRef.current) textareaRef.current.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-id={data.id}
      style={{
        position: "absolute", left: x, top: y, width, zIndex,
        cursor: "grab",
        transform: `rotate(${rotation ?? 0}deg)`,
        transformOrigin: "center center",
        outline: isSelected ? "1px dashed #888888" : "none",
        outlineOffset: 3, boxSizing: "border-box", userSelect: "none",
      }}
      onMouseDown={onMouseDownDrag}
    >
      <textarea
        ref={textareaRef} value={text} placeholder="escreva algo..."
        onChange={e => onTextChange(e.target.value)}
        onMouseDown={e => { e.stopPropagation(); onSelect(); }}
        rows={1}
        style={{
          display: "block", width: "100%", background: "transparent",
          border: "none", outline: "none", resize: "none",
          fontFamily, fontSize, color,
          cursor: "text", padding: 0, lineHeight: 1.45, overflow: "hidden", userSelect: "text",
        }}
      />
      {isSelected && (
        <>
          <RotationHandle onMouseDown={onMouseDownRotate} />
          <div onMouseDown={e => { e.stopPropagation(); onDelete(); }}
            style={{ position: "absolute", top: -9, right: -9, width: 18, height: 18, borderRadius: "50%", background: "#555555", color: "#FFFFFF", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 9999, lineHeight: 1 }}>
            ×
          </div>
          {/* Resize handles — apenas largura (esquerda e direita) */}
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
}

// ── JournalPage ───────────────────────────────────────────────────────────────
function JournalPage({
  date, side,
  polaroids, textBlocks, stickers, papers, selectedId,
  onSelectId,
  onDeletePolaroid, onChangePolaroid,
  onDeleteTextBlock, onChangeTextBlock,
  onDeleteSticker, onDeletePaper,
  dragRef, resizeRef, rotateRef, dateKey, siblingDateKey,
}) {
  const isLeft = side === "left";
  const label = formatDate(date);
  const pageRef = useRef(null);

  const getSiblingLeft = (rect) =>
    isLeft ? rect.left + PAGE_W + SPINE_W : rect.left - PAGE_W - SPINE_W;

  const handlePolDragStart = (pol, e) => {
    if (e.button !== 0) return; e.stopPropagation();
    const rect = pageRef.current.getBoundingClientRect();
    dragRef.current = { type: "polaroid", id: pol.id, dkey: dateKey,
      pageLeft: rect.left, pageTop: rect.top,
      siblingKey: siblingDateKey, siblingPageLeft: getSiblingLeft(rect), siblingPageTop: rect.top,
      mouseOffsetX: e.clientX - rect.left - pol.x, mouseOffsetY: e.clientY - rect.top - pol.y };
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
    const rect = pageRef.current.getBoundingClientRect();
    dragRef.current = { type: "text", id: blk.id, dkey: dateKey,
      pageLeft: rect.left, pageTop: rect.top,
      siblingKey: siblingDateKey, siblingPageLeft: getSiblingLeft(rect), siblingPageTop: rect.top,
      mouseOffsetX: e.clientX - rect.left - blk.x, mouseOffsetY: e.clientY - rect.top - blk.y };
    onSelectId(blk.id);
  };
  const handleTextResizeStart = (blk, e, corner) => {
    if (e.button !== 0) return; e.stopPropagation();
    resizeRef.current = { type: "text", id: blk.id, dkey: dateKey, corner,
      startX: e.clientX, startY: e.clientY,
      startW: blk.width, startPX: blk.x, startPY: blk.y,
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
      mouseOffsetX: e.clientX - rect.left - stk.x, mouseOffsetY: e.clientY - rect.top - stk.y };
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
      mouseOffsetX: e.clientX - rect.left - pap.x, mouseOffsetY: e.clientY - rect.top - pap.y };
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
      }}
      onMouseDown={() => onSelectId(null)}
    >
      {/* Date tab */}
      <div style={{
        position: "absolute", top: -26,
        [isLeft ? "left" : "right"]: 8,
        height: 26,
        background: "#EDE8DF", border: "1px solid #C8C2B8",
        borderRadius: "3px 3px 0 0",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 10px",
        fontFamily: UI_FONT, fontSize: 12, fontWeight: 500,
        color: "#555555", letterSpacing: "0.06em", userSelect: "none",
      }}>
        {label}
      </div>

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
          onMouseDownRotate={e => handleTextRotateStart(blk, e)}
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
}

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
            : <span style={{ fontFamily: UI_FONT, fontSize: 18, fontWeight: 600, color: "#888888" }}>{initial}</span>
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
        <div style={{ fontFamily: UI_FONT, fontSize: 12, color: "#888888", userSelect: "none" }}>
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
                color: "#666666", cursor: "pointer", borderBottom: "0.5px solid #D8D2C8",
                transition: "background 0.1s, color 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#E0DAD0"; e.currentTarget.style.color = "#1A1A1A"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#666666"; }}
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
            border: "1px solid #C8C2B8", color: "#666666",
            fontFamily: UI_FONT, fontSize: 13, cursor: "pointer",
            borderRadius: 4, transition: "all 0.12s", letterSpacing: "0.04em",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#E0DAD0"; e.currentTarget.style.borderColor = "#A0A09A"; e.currentTarget.style.color = "#333333"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#C8C2B8"; e.currentTarget.style.color = "#666666"; }}
        >
          trocar foto de perfil
        </button>
        {onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              width: "100%", padding: "7px 0", marginTop: 6,
              background: "transparent", border: "1px solid #C8C2B8",
              color: "#888888", fontFamily: UI_FONT, fontSize: 13,
              cursor: "pointer", borderRadius: 4, transition: "all 0.12s", letterSpacing: "0.04em",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#F5E8E8"; e.currentTarget.style.borderColor = "#C0392B"; e.currentTarget.style.color = "#C0392B"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#C8C2B8"; e.currentTarget.style.color = "#888888"; }}
          >
            sair da conta
          </button>
        )}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const today = useRef((() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  })()).current;

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

  useEffect(() => { localStorage.setItem("jrnl_username", userName); }, [userName]);
  useEffect(() => { localStorage.setItem("jrnl_avatar", avatarSrc); }, [avatarSrc]);

  const maxZRef    = useRef(10);
  const fileInputRef = useRef(null);
  const dragRef    = useRef(null);
  const resizeRef  = useRef(null);
  const rotateRef  = useRef(null);

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
      await Promise.all(
        Object.entries(pageData).map(([key, data]) => savePageRemote(key, data, user?.id))
      );
      const now = new Date();
      setLastSave(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
    }, 600);
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
        const { type, id, dkey, pageLeft, pageTop, mouseOffsetX, mouseOffsetY,
                siblingKey, siblingPageLeft, siblingPageTop } = dragRef.current;
        const inSibling = siblingKey != null &&
          e.clientX >= siblingPageLeft && e.clientX < siblingPageLeft + PAGE_W;
        const tgtKey  = inSibling ? siblingKey    : dkey;
        const tgtLeft = inSibling ? siblingPageLeft : pageLeft;
        const tgtTop  = inSibling ? siblingPageTop  : pageTop;

        if (type === "polaroid") {
          setPageData(prev => {
            const srcPage = prev[dkey]; if (!srcPage) return prev;
            const pol = (srcPage.polaroids || []).find(p => p.id === id); if (!pol) return prev;
            const newX = clamp(e.clientX - tgtLeft - mouseOffsetX, 0, PAGE_W - pol.width);
            const newY = clamp(e.clientY - tgtTop  - mouseOffsetY, 0, PAGE_H - polH(pol.width));
            if (!inSibling) {
              if (pol.x === newX && pol.y === newY) return prev;
              return { ...prev, [dkey]: { ...srcPage, polaroids: srcPage.polaroids.map(p => p.id===id?{...p,x:newX,y:newY}:p) } };
            }
            const tgtPage = prev[tgtKey] || { polaroids:[], textBlocks:[], stickers:[], papers:[] };
            return { ...prev, [dkey]: { ...srcPage, polaroids: srcPage.polaroids.filter(p=>p.id!==id) },
              [tgtKey]: { ...tgtPage, polaroids: [...(tgtPage.polaroids||[]).filter(p=>p.id!==id), {...pol,x:newX,y:newY}] } };
          });
        }
        if (type === "text") {
          setPageData(prev => {
            const srcPage = prev[dkey]; if (!srcPage) return prev;
            const blk = (srcPage.textBlocks || []).find(b => b.id === id); if (!blk) return prev;
            const newX = clamp(e.clientX - tgtLeft - mouseOffsetX, 0, PAGE_W - blk.width);
            const newY = clamp(e.clientY - tgtTop  - mouseOffsetY, 0, PAGE_H - 20);
            if (!inSibling) {
              if (blk.x === newX && blk.y === newY) return prev;
              return { ...prev, [dkey]: { ...srcPage, textBlocks: srcPage.textBlocks.map(b => b.id===id?{...b,x:newX,y:newY}:b) } };
            }
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
            if (!inSibling) {
              if (stk.x === newX && stk.y === newY) return prev;
              return { ...prev, [dkey]: { ...srcPage, stickers: srcPage.stickers.map(s => s.id===id?{...s,x:newX,y:newY}:s) } };
            }
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
            if (!inSibling) {
              if (pap.x === newX && pap.y === newY) return prev;
              return { ...prev, [dkey]: { ...srcPage, papers: srcPage.papers.map(p => p.id===id?{...p,x:newX,y:newY}:p) } };
            }
            const tgtPage = prev[tgtKey] || { polaroids:[], textBlocks:[], stickers:[], papers:[] };
            return { ...prev, [dkey]: { ...srcPage, papers: srcPage.papers.filter(p=>p.id!==id) },
              [tgtKey]: { ...tgtPage, papers: [...(tgtPage.papers||[]).filter(p=>p.id!==id), {...pap,x:newX,y:newY}] } };
          });
        }
        if (inSibling) {
          dragRef.current = { ...dragRef.current,
            dkey: siblingKey, pageLeft: siblingPageLeft, pageTop: siblingPageTop,
            siblingKey: dkey, siblingPageLeft: pageLeft, siblingPageTop: pageTop };
        }
      }

      if (resizeRef.current) {
        const { type, id, dkey, corner, startX, startY, startW, startPX, startPY } = resizeRef.current;
        const dx = e.clientX - startX;
        const dy = startY != null ? e.clientY - startY : 0;

        if (type === "polaroid") {
          const rot = resizeRef.current.rotation ?? 0;
          const rad = rot * Math.PI / 180;
          const localDX = dx * Math.cos(rad) + dy * Math.sin(rad);
          setPageData(prev => {
            const page = prev[dkey]; if (!page) return prev;
            let newW, newX, newY;
            if (corner === "br")      { newW = clamp(startW + localDX, 80, 320); newX = startPX; newY = startPY; }
            else if (corner === "bl") { newW = clamp(startW - localDX, 80, 320); newX = startPX + startW - newW; newY = startPY; }
            else if (corner === "tr") { newW = clamp(startW + localDX, 80, 320); newX = startPX; newY = startPY + startW - newW; }
            else                      { newW = clamp(startW - localDX, 80, 320); newX = startPX + startW - newW; newY = startPY + startW - newW; }
            newX = clamp(newX, 0, PAGE_W - newW); newY = clamp(newY, 0, PAGE_H - polH(newW));
            return { ...prev, [dkey]: { ...page, polaroids: page.polaroids.map(p => p.id===id?{...p,width:newW,x:newX,y:newY}:p) } };
          });
        }
        if (type === "sticker") {
          const { startH, aspect, rotation: rot = 0 } = resizeRef.current;
          const rad = rot * Math.PI / 180;
          const localDX = dx * Math.cos(rad) + dy * Math.sin(rad);
          setPageData(prev => {
            const page = prev[dkey]; if (!page) return prev;
            let newW = (corner === "bl" || corner === "tl") ? startW - localDX : startW + localDX;
            newW = clamp(newW, 40, 300);
            const newH = newW / aspect;
            let newX = (corner === "bl" || corner === "tl") ? startPX + startW - newW : startPX;
            let newY = (corner === "tr" || corner === "tl") ? startPY + startH - newH : startPY;
            newX = clamp(newX, 0, PAGE_W - newW); newY = clamp(newY, 0, PAGE_H - newH);
            return { ...prev, [dkey]: { ...page, stickers: page.stickers.map(s => s.id===id?{...s,width:newW,height:newH,x:newX,y:newY}:s) } };
          });
        }
        if (type === "paper") {
          const { startH, aspect, rotation: rot = 0 } = resizeRef.current;
          const rad = rot * Math.PI / 180;
          const localDX = dx * Math.cos(rad) + dy * Math.sin(rad);
          setPageData(prev => {
            const page = prev[dkey]; if (!page) return prev;
            let newW = (corner === "bl" || corner === "tl") ? startW - localDX : startW + localDX;
            newW = clamp(newW, 40, 400);
            const newH = newW / aspect;
            let newX = (corner === "bl" || corner === "tl") ? startPX + startW - newW : startPX;
            let newY = (corner === "tr" || corner === "tl") ? startPY + startH - newH : startPY;
            newX = clamp(newX, 0, PAGE_W - newW); newY = clamp(newY, 0, PAGE_H - newH);
            return { ...prev, [dkey]: { ...page, papers: (page.papers||[]).map(p => p.id===id?{...p,width:newW,height:newH,x:newX,y:newY}:p) } };
          });
        }
        // Texto: resize apenas de largura, rotation-aware
        if (type === "text") {
          const { rotation: rot = 0 } = resizeRef.current;
          const rad = rot * Math.PI / 180;
          const localDX = dx * Math.cos(rad) + dy * Math.sin(rad);
          setPageData(prev => {
            const page = prev[dkey]; if (!page) return prev;
            let newW = (corner === "bl" || corner === "tl") ? startW - localDX : startW + localDX;
            newW = clamp(newW, 60, PAGE_W);
            let newX = (corner === "bl" || corner === "tl") ? startPX + startW - newW : startPX;
            newX = clamp(newX, 0, PAGE_W - newW);
            return { ...prev, [dkey]: { ...page, textBlocks: page.textBlocks.map(b => b.id===id?{...b,width:newW,x:newX}:b) } };
          });
        }
      }

      if (rotateRef.current) {
        const { type, id, dkey, centerX, centerY } = rotateRef.current;
        const newAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
        setPageData(prev => {
          const page = prev[dkey]; if (!page) return prev;
          if (type === "polaroid") return { ...prev, [dkey]: { ...page, polaroids: page.polaroids.map(p => p.id===id?{...p,rotation:newAngle}:p) } };
          if (type === "sticker")  return { ...prev, [dkey]: { ...page, stickers:  page.stickers.map(s  => s.id===id?{...s,rotation:newAngle}:s) } };
          if (type === "paper")    return { ...prev, [dkey]: { ...page, papers:    (page.papers||[]).map(p => p.id===id?{...p,rotation:newAngle}:p) } };
          if (type === "text")     return { ...prev, [dkey]: { ...page, textBlocks: page.textBlocks.map(b => b.id===id?{...b,rotation:newAngle}:b) } };
          return prev;
        });
      }
    };
    const onUp = () => {
      document.body.style.userSelect = "";
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

  // ── Add text block ────────────────────────────────────────────────────────
  const addTextBlock = () => {
    const W = 160; maxZRef.current += 1;
    const blk = { id: `txt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      x: Math.round((PAGE_W-W)/2), y: Math.round(PAGE_H/2-24),
      width: W, text: "", fontFamily: FONTS[0].value, fontSize: 16, color: "#1A1A1A",
      rotation: 0, zIndex: maxZRef.current };
    mutatePage(rightKey, page => ({ ...page, textBlocks: [...(page.textBlocks||[]), blk] }));
    setSelectedId(blk.id);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const deletePolaroid = (key, id) => { mutatePage(key, p => ({...p, polaroids: (p.polaroids||[]).filter(x=>x.id!==id)})); setSelectedId(null); };
  const changePolaroid = (key, id, ch) => { mutatePage(key, p => ({...p, polaroids: (p.polaroids||[]).map(x=>x.id===id?{...x,...ch}:x)})); };
  const deleteTextBlock = (key, id) => { mutatePage(key, p => ({...p, textBlocks: (p.textBlocks||[]).filter(x=>x.id!==id)})); setSelectedId(null); };
  const changeTextBlock = (key, id, ch) => { mutatePage(key, p => ({...p, textBlocks: (p.textBlocks||[]).map(x=>x.id===id?{...x,...ch}:x)})); };
  const applyToSelected = (ch) => { if (!selInfo || selInfo.type !== "text") return; changeTextBlock(selInfo.key, selectedId, ch); };
  const addSticker = (type) => {
    const def = STICKER_DEFS[type]; if (!def) return;
    const W = def.defaultW, H = Math.round(W * def.vh / def.vw);
    maxZRef.current += 1;
    const stk = { id: `stk_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, type,
      x: Math.round((PAGE_W-W)/2), y: Math.round((PAGE_H-H)/2),
      width: W, height: H, rotation: 0, zIndex: maxZRef.current };
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

  // Loading inicial mínimo (só enquanto verifica sessão)
  if (authLoading) return (
    <div style={{ width:"100vw", height:"100vh", background:"#2D5A3D", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <img src={logo} alt="jrnl" style={{ height: 24, opacity: 0.5, userSelect: "none", pointerEvents: "none" }} />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600&family=Caveat:wght@400;600&family=Covered+By+Your+Grace&family=Coming+Soon&display=swap');
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
          backgroundColor: "#EDE8DF",
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
          borderBottom: "1px solid #D8D2C8",
          zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px",
          fontFamily: UI_FONT,
        }}
      >
        {/* Left: logo */}
        <img src={logo} alt="jrnl" style={{ height: 26, userSelect: "none", pointerEvents: "none" }} />

        {/* Center: save status */}
        <div style={{ fontSize: 13, fontWeight: 400, color: "#AAAAAA", letterSpacing: "0.02em" }}>
          {user
            ? (lastSave ? `Salvo às ${lastSave}` : "")
            : <span style={{ cursor: "pointer" }} onClick={() => openAuth("Faça login para sincronizar seus dados.")}>
                dados em cache —{" "}
                <span style={{ textDecoration: "underline", color: "#888888" }}>fazer login</span>
              </span>
          }
        </div>

        {/* Right: download + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => !user && openAuth("Login necessário para fazer o download.")}
            style={{
              fontFamily: UI_FONT, fontSize: 13, fontWeight: 500, color: "#555555",
              border: "1px solid #C8C2B8", borderRadius: 4, padding: "5px 14px",
              background: "transparent", letterSpacing: "0.04em", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#E0DAD0"; e.currentTarget.style.borderColor = "#A0A09A"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#C8C2B8"; }}
          >
            download
          </button>

          {/* Avatar — se logado abre perfil, se não abre auth modal */}
          <div
            onClick={e => {
              e.stopPropagation();
              user ? setProfileOpen(p => !p) : openAuth();
            }}
            title={user ? undefined : "Entrar / Criar conta"}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              backgroundColor: (!user || !avatarSrc) ? "#DDD8D0" : "transparent",
              border: `1px solid ${profileOpen ? "#A0A09A" : "#C8C2B8"}`,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "border-color 0.12s", flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#A0A09A"}
            onMouseLeave={e => e.currentTarget.style.borderColor = profileOpen ? "#A0A09A" : "#C8C2B8"}
          >
            {(user && avatarSrc)
              ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontFamily: UI_FONT, fontSize: 14, fontWeight: 600, color: "#888888" }}>
                  {user ? avatarInitial : "?"}
                </span>
            }
          </div>
        </div>
      </div>

      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <aside
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", left: 0, top: HEADER_H,
          width: SIDEBAR_W, height: `calc(100vh - ${HEADER_H}px)`,
          backgroundColor: "#EDE8DF",
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
          borderRight: "1px solid #D8D2C8",
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
      <TextPanel
        selectedBlock={selectedTextBlock}
        onAddTextBlock={addTextBlock}
        onApplyToSelected={applyToSelected}
        onClose={closePanel}
        open={openPanel === "text"}
      />
      <PaperPanel onAddPaper={addPaper} onClose={closePanel} open={openPanel === "paper"} />

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

      {/* ── MAIN JOURNAL AREA (cutting mat) ──────────────────────────────── */}
      <main
        onClick={() => { if (openPanel) setOpenPanel(null); if (profileOpen) setProfileOpen(false); }}
        style={{
          position: "fixed", left: SIDEBAR_W, top: HEADER_H,
          width: `calc(100vw - ${SIDEBAR_W}px)`,
          height: `calc(100vh - ${HEADER_H}px)`,
          backgroundColor: "#2D5A3D",
          backgroundImage: MAT_GRID,
          backgroundSize: "50px 50px",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
          minWidth: 1200 - SIDEBAR_W,
        }}
      >
        {/* Ruler — top strip */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 14,
          background: "#265235",
          backgroundImage: [
            "repeating-linear-gradient(90deg, transparent 0, transparent 9px, rgba(74,144,96,0.45) 9px, rgba(74,144,96,0.45) 10px)",
            "repeating-linear-gradient(90deg, transparent 0, transparent 49px, rgba(74,144,96,0.9) 49px, rgba(74,144,96,0.9) 50px)",
          ].join(", "),
          zIndex: 10, pointerEvents: "none",
        }} />
        {/* Ruler — left strip */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: 14,
          background: "#265235",
          backgroundImage: [
            "repeating-linear-gradient(0deg, transparent 0, transparent 9px, rgba(74,144,96,0.45) 9px, rgba(74,144,96,0.45) 10px)",
            "repeating-linear-gradient(0deg, transparent 0, transparent 49px, rgba(74,144,96,0.9) 49px, rgba(74,144,96,0.9) 50px)",
          ].join(", "),
          zIndex: 10, pointerEvents: "none",
        }} />

        {/* Watermark */}
        <div style={{
          position: "absolute", bottom: 18, left: 24,
          fontFamily: UI_FONT, fontSize: 9, fontWeight: 400,
          color: "#3D7A52", opacity: 0.7, letterSpacing: "0.12em",
          textTransform: "uppercase", userSelect: "none", pointerEvents: "none",
          zIndex: 5,
        }}>
          SDI® Cutting Mat 30×22cm A4
        </div>

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
            />
          </div>
        </div>
      </main>
    </>
  );
}
