/** Shared spacing & surfaces for meeting-room booking UI */
export const mr = {
  /** Page shell — full width up to site max (aligns with header) */
  pageShell: "brand-page w-full max-w-6xl",
  /** Vertical rhythm between hero, tabs, and main content */
  page: "flex flex-col gap-6 lg:gap-8",
  /** Child routes under meeting-rooms layout */
  content: "flex flex-col gap-6",
  /** Vertical rhythm inside each booking step */
  step: "flex flex-col gap-6",
  /** Subsection (e.g. active vs past bookings) */
  section: "flex flex-col gap-4",
  /** Room cards — single column mobile, two on desktop */
  roomGrid: "grid grid-cols-1 gap-4 lg:grid-cols-2",
  roomGridSkeleton: "grid grid-cols-1 gap-4 lg:grid-cols-2",
  cardList: "flex flex-col gap-4",
  /** Primary surface — single radius/padding everywhere */
  card: "brand-card rounded-[2rem] p-5 sm:p-6",
  cardBody: "flex flex-col gap-6",
  empty: "brand-card rounded-[2rem] border-dashed px-6 py-12 text-center text-sm text-[var(--text-muted)]",
  skeleton: "h-36 animate-pulse rounded-[2rem] bg-[color-mix(in_srgb,var(--border)_55%,white)]",
  skeletonTall: "brand-card h-48 animate-pulse rounded-[2rem]",
  /** Highlight strips */
  strip: "rounded-2xl px-5 py-4",
  /** Tab bar under hero */
  tabs: "flex gap-2 rounded-[2rem] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,white)] p-1.5 shadow-sm",
  tabBtn:
    "flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-bold transition",
  tabBtnActive: "bg-[var(--primary-deep)] text-white shadow-sm",
  tabBtnIdle: "text-[var(--text-muted)] hover:bg-white/80 hover:text-[var(--text)]",
  contextRow: "flex flex-col gap-4 lg:flex-row lg:gap-4",
  scheduleGrid: "flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6",
  checkoutGrid:
    "flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-6",
  ctaWrap: "lg:flex lg:justify-end",
  ctaBtn: "lg:min-w-[16rem] lg:max-w-sm",
  actions: "flex flex-col gap-3 sm:flex-row sm:gap-3",
  btn: "rounded-full px-4 py-3 text-sm font-bold",
  field: "mt-2",
  lead: "mt-1.5",
  kicker: "text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]",
  pageTitle:
    "font-[family-name:var(--font-oswald)] text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl",
  sectionTitle:
    "font-[family-name:var(--font-oswald)] text-sm font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]",
  blockTitle: "font-[family-name:var(--font-oswald)] text-lg font-bold text-[var(--text)]",
  list: "flex flex-col gap-4",
  divider: "border-t border-[var(--border)] pt-4",
  backLink: "text-sm font-bold text-[var(--primary)] hover:text-[var(--primary-dark)]",
} as const;
