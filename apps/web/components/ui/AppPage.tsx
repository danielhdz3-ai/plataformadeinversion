import type { ReactNode } from "react";

/**
 * Lenguaje visual único de la app.
 * Todo lo que se añada debe usar estos bloques para no fragmentar el diseño.
 */

export function AppPage({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f3f2ef]">{children}</div>;
}

export function AppPageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="shrink-0 border-b border-neutral-200/80 bg-white px-4 py-4 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">{title}</h1>
          {description && <div className="mt-0.5 max-w-3xl text-sm text-neutral-600">{description}</div>}
        </div>
        {(meta || actions) && (
          <div className="flex flex-wrap items-center gap-3">
            {meta && <div className="text-xs text-neutral-500">{meta}</div>}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function AppPageBody({
  children,
  wide,
}: {
  children: ReactNode;
  /** Contenido de lectura (no listados): limita el ancho para line-length cómoda. */
  wide?: boolean;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <section
        className={`px-4 pb-24 pt-5 lg:px-8 xl:pb-10 ${wide ? "" : "mx-auto w-full max-w-6xl"}`}
      >
        {children}
      </section>
    </div>
  );
}

export function AppCard({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  const Tag = as;
  return (
    <Tag className={`rounded-xl border border-neutral-200 bg-white shadow-sm ${className}`}>{children}</Tag>
  );
}

export function AppSectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-base font-bold text-neutral-950">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-neutral-600">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function AppEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-neutral-200 bg-white px-8 py-12 text-center shadow-sm">
      <p className="text-base font-semibold text-neutral-950">{title}</p>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function AppPillButton({
  children,
  onClick,
  href,
  variant = "ghost",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "ghost" | "solid" | "accent";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls =
    variant === "solid"
      ? "bg-neutral-950 text-white hover:bg-neutral-800"
      : variant === "accent"
        ? "bg-orange-600 text-white hover:bg-orange-700"
        : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50";
  const base = `inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-50 ${cls}`;
  if (href) {
    return (
      <a href={href} className={base}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  );
}
