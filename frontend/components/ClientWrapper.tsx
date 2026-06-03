"use client";
import { useEffect } from "react";
import { ScreenshotProvider, useScreenshot } from "@/lib/screenshot-context";
import { ScreenshotPanel } from "@/components/ScreenshotPanel";

function PasteListener() {
  const { processScreenshot } = useScreenshot();

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (!item.type.startsWith("image/")) continue;
        const blob = item.getAsFile();
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width  = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          processScreenshot(canvas);
        };
        img.src = url;
        break;
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processScreenshot]);

  return null;
}

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScreenshotProvider>
      <PasteListener />
      <ScreenshotPanel />
      {children}
    </ScreenshotProvider>
  );
}
