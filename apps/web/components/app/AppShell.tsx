"use client";

import { AppIconRail } from "@/components/app/AppIconRail";
import { NavIcon } from "@/components/app/NavIcon";
import { APP_NAV, navItemActive } from "@/lib/app-nav";
import { isFullscreenRequested, useAppFullscreen } from "@/lib/ui/use-app-fullscreen";
import { useTheme } from "@/lib/ui/use-theme";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scanMode = pathname.startsWith("/app/scan");
  const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Plataforma de inversión";
  const { fullscreen, toggle } = useAppFullscreen(isFullscreenRequested(searchParams?.toString() ?? null));
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden bg-void text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-deep/95 text-ink backdrop-blur">
        <div className="app-header-bar flex items-center justify-between gap-4 px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-2.5 text-sm">
            <Link href="/app/inicio" className="group flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-lime text-[13px] font-black text-lime-ink transition group-hover:rotate-6">
                ▲
              </span>
              <span className="app-header-brand font-bold tracking-tight text-ink">{name}</span>
            </Link>
            {scanMode && (
              <>
                <span className="text-ink-muted/60">/</span>
                <span className="text-ink-muted">Scan</span>
              </>
            )}
          </div>

          <nav className="hidden items-center gap-0.5 text-sm lg:flex">
            {APP_NAV.map((item) => {
              const active = navItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                    active
                      ? "bg-lime/15 text-lime"
                      : "text-ink-muted hover:bg-raised hover:text-ink"
                  }`}
                >
                  <NavIcon name={item.icon} className="h-4 w-4 opacity-90" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
              aria-label="Cambiar tema"
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted transition hover:border-lime/50 hover:text-lime"
            >
              {theme === "dark" ? "☾" : "☀"}
            </button>
            <button
              type="button"
              onClick={toggle}
              title={fullscreen ? "Salir de pantalla completa (F)" : "Pantalla completa (F)"}
              aria-pressed={fullscreen}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition hover:border-lime/50 hover:text-lime"
            >
              <span aria-hidden>{fullscreen ? "⤡" : "⤢"}</span>
              {fullscreen ? "Contraer" : "Pantalla completa"}
            </button>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <AppIconRail />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
