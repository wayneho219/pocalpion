"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import type { Candidate } from "./screenshot/matcher";
import type { SpriteHashEntry } from "./types";

export type SlotCandidates = Candidate[];

interface ScreenshotContextValue {
  left: SlotCandidates[];
  right: SlotCandidates[];
  isProcessing: boolean;
  onSelectLeft: ((c: Candidate) => void) | null;
  onSelectRight: ((c: Candidate) => void) | null;
  registerHandlers: (
    left: ((c: Candidate) => void) | null,
    right: ((c: Candidate) => void) | null,
  ) => void;
  processScreenshot: (canvas: HTMLCanvasElement) => Promise<void>;
}

const ScreenshotContext = createContext<ScreenshotContextValue | null>(null);

const HASH_DB_KEY = "poke_hash_db_v2";

async function loadHashDB(): Promise<SpriteHashEntry[]> {
  const cached = localStorage.getItem(HASH_DB_KEY);
  if (cached) return JSON.parse(cached) as SpriteHashEntry[];
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const res = await fetch(`${base}/api/sprites/hashes`);
  if (!res.ok) throw new Error("Failed to load sprite hash DB");
  const data = await res.json() as SpriteHashEntry[];
  localStorage.setItem(HASH_DB_KEY, JSON.stringify(data));
  return data;
}

export function ScreenshotProvider({ children }: { children: React.ReactNode }) {
  const [left,  setLeft]  = useState<SlotCandidates[]>([]);
  const [right, setRight] = useState<SlotCandidates[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [onSelectLeft,  setOnSelectLeft]  = useState<((c: Candidate) => void) | null>(null);
  const [onSelectRight, setOnSelectRight] = useState<((c: Candidate) => void) | null>(null);

  const registerHandlers = useCallback(
    (l: ((c: Candidate) => void) | null, r: ((c: Candidate) => void) | null) => {
      setOnSelectLeft(() => l);
      setOnSelectRight(() => r);
    },
    [],
  );

  const processScreenshot = useCallback(async (canvas: HTMLCanvasElement) => {
    setIsProcessing(true);
    try {
      const db = await loadHashDB();
      const { analyzeScreenshot } = await import("./screenshot/index");
      const result = analyzeScreenshot(canvas, db);
      setLeft(result.left);
      setRight(result.right);
    } catch (err) {
      console.error("Screenshot analysis failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <ScreenshotContext.Provider value={{
      left, right, isProcessing, onSelectLeft, onSelectRight, registerHandlers, processScreenshot,
    }}>
      {children}
    </ScreenshotContext.Provider>
  );
}

export function useScreenshot(): ScreenshotContextValue {
  const ctx = useContext(ScreenshotContext);
  if (!ctx) throw new Error("useScreenshot must be used within ScreenshotProvider");
  return ctx;
}
