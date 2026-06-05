import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "PokeCalc",
  description: "Pokémon Champions VGC 計算工具",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PokeCalc",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <LangProvider>
          <Nav />
          <main className="relative z-[1]">{children}</main>
        </LangProvider>
      </body>
    </html>
  );
}
