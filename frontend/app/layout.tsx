import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { Nav } from "@/components/Nav";
import { ClientWrapper } from "@/components/ClientWrapper";

export const metadata: Metadata = {
  title: "Pokémon Calc",
  description: "Pokémon stat calculator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <LangProvider>
          <ClientWrapper>
            <Nav />
            <main className="relative z-[1]">{children}</main>
          </ClientWrapper>
        </LangProvider>
      </body>
    </html>
  );
}
