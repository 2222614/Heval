import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "AlphaEval — AI Model Leaderboard",
  description: "AI model evaluation for agentic coding & expert-domain tasks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="alpha">
      <body>
        <ThemeProvider>
          <LangProvider>
            <NavBar />
            <main className="min-h-[calc(100vh-4rem)] py-10">{children}</main>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
