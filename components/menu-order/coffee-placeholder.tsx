export function CoffeePlaceholder({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden>
      <path
        d="M18 42h28v4a8 8 0 01-8 8H26a8 8 0 01-8-8v-4zm4-18v14h20V24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.35}
      />
      <path d="M46 28h4a4 4 0 010 8h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.35} />
      <path d="M22 18c2-6 8-10 18-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.2} />
    </svg>
  );
}
