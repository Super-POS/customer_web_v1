import { IconMinus, IconPlus } from "./icons";

export function QtyStepper({
  value,
  onChange,
  disabled,
  min = 0,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  min?: number;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(value + 1);
  return (
    <div className="inline-flex touch-manipulation items-center gap-0 rounded-full border border-black/[0.07] bg-white p-0.5 shadow-sm">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--page)] hover:text-[var(--text)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-35"
      >
        <IconMinus className="h-4 w-4" />
      </button>
      <span className="min-w-[2rem] text-center text-sm font-bold tabular-nums text-[var(--text)]">{value}</span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        aria-label="Increase quantity"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--primary-soft)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-35"
      >
        <IconPlus className="h-4 w-4" />
      </button>
    </div>
  );
}
