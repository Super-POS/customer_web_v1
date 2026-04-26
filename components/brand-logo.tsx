import Image from "next/image";
import Link from "next/link";

const SRC = "/logo/Logo.png";

type Size = "sm" | "md" | "lg";

const heightPx: Record<Size, number> = {
  sm: 28,
  md: 36,
  lg: 44,
};

const widthPx: Record<Size, number> = {
  sm: 112,
  md: 160,
  lg: 200,
};

type BrandLogoProps = {
  size?: Size;
  priority?: boolean;
  className?: string;
  /** When set, logo links home. Omit to render without a link (e.g. modals). */
  href?: string | null;
};

export function BrandLogo({ size = "md", priority = false, className = "", href = "/" }: BrandLogoProps) {
  const h = heightPx[size];
  const w = widthPx[size];

  const img = (
    <span className={`relative block ${className}`.trim()} style={{ width: w, height: h }}>
      <Image
        src={SRC}
        alt="FOODIE"
        width={256}
        height={256}
        priority={priority}
        className="h-full w-full object-contain object-left"
        sizes={`${w}px`}
      />
    </span>
  );

  if (href === null) {
    return <span className="inline-flex shrink-0">{img}</span>;
  }

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    >
      {img}
    </Link>
  );
}
