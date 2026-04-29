type AccountPageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Defaults to Club54 */
  eyebrow?: string;
};

export function AccountPageHeader({ title, subtitle, eyebrow = "Club54" }: AccountPageHeaderProps) {
  return (
    <header className="brand-card relative overflow-hidden rounded-[1.75rem] px-4 py-6 sm:rounded-[2rem] sm:px-8 sm:py-7">
      <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full border-[1.1rem] border-[var(--primary)] border-r-transparent opacity-[0.08]" />
      <div className="relative">
        <p className="brand-kicker">{eyebrow}</p>
        <h1 className="brand-title mt-2 text-[clamp(1.65rem,4vw+1rem,2.25rem)] leading-none sm:text-4xl">{title}</h1>
      {subtitle ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">{subtitle}</p>
      ) : null}
      </div>
    </header>
  );
}
