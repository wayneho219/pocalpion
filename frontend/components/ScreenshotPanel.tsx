"use client";
import { useState } from "react";
import { useScreenshot } from "@/lib/screenshot-context";
import type { Candidate } from "@/lib/screenshot/matcher";
import type { SlotCandidates } from "@/lib/screenshot-context";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function PokemonSlot({ slot, onSelect }: { slot: SlotCandidates; onSelect: (c: Candidate) => void }) {
  const [expanded, setExpanded] = useState(false);
  const top = slot[0];
  if (!top) return <div className="h-9 rounded-lg bg-white/5" />;

  const lowConf = top.confidence < 0.80;

  return (
    <div>
      <button
        onClick={() => lowConf ? setExpanded(p => !p) : onSelect(top)}
        className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-left"
      >
        <img
          src={`${API}/sprites/${top.id}.png`}
          alt={top.name_en}
          className="w-8 h-8 object-contain shrink-0"
        />
        <span className="text-xs text-white/80 truncate flex-1">{top.name_en}</span>
        <div
          className="w-1.5 h-5 rounded-full shrink-0"
          style={{ background: `hsl(${Math.round(top.confidence * 120)},70%,50%)` }}
        />
      </button>
      {expanded && (
        <ul className="ml-2 mt-0.5 bg-black/50 rounded-lg overflow-hidden">
          {slot.slice(0, 3).map(c => (
            <li key={`${c.id}-${c.name_en}`}>
              <button
                onClick={() => { onSelect(c); setExpanded(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 text-xs text-white/70 text-left"
              >
                <img src={`${API}/sprites/${c.id}.png`} alt={c.name_en} className="w-5 h-5 object-contain shrink-0" />
                <span className="truncate flex-1">{c.name_en}</span>
                <span className="text-white/40 shrink-0">{Math.round(c.confidence * 100)}%</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SidePanel({
  side, slots, onSelect,
}: {
  side: "left" | "right";
  slots: SlotCandidates[];
  onSelect: ((c: Candidate) => void) | null;
}) {
  const isLeft = side === "left";
  if (slots.length === 0) return null;

  return (
    <div className={`fixed top-1/2 -translate-y-1/2 z-50 ${isLeft ? "left-0" : "right-0"}`}>
      <div
        className={`bg-[#0d1320]/90 border border-white/10 backdrop-blur-md
          ${isLeft ? "rounded-r-2xl" : "rounded-l-2xl"} p-2 w-44`}
      >
        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 px-1">
          {isLeft ? "我方" : "對手"}
        </div>
        <div className="flex flex-col gap-1">
          {slots.map((slot, i) => (
            <PokemonSlot key={i} slot={slot} onSelect={onSelect ?? (() => {})} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScreenshotPanel() {
  const { left, right, isProcessing, onSelectLeft, onSelectRight } = useScreenshot();

  return (
    <>
      {isProcessing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-black/80 backdrop-blur
          text-white/70 text-xs px-4 py-1.5 rounded-full pointer-events-none">
          辨識截圖中…
        </div>
      )}
      <SidePanel side="left"  slots={left}  onSelect={onSelectLeft}  />
      <SidePanel side="right" slots={right} onSelect={onSelectRight} />
    </>
  );
}
