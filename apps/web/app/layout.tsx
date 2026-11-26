import type { Metadata } from "next";
import { THEME_INIT_SCRIPT } from "@/lib/ui/use-theme";
import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Plataforma de inversión";

export const metadata: Metadata = {
  title: appName,
  description: "Scan geográfico y ROI para inversores inmobiliarios en España",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
