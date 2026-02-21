interface LogoProps {
  iconSize?: number;
  textSize?: string;
  gap?: string;
}

export default function Logo({
  iconSize = 32,
  textSize = "text-xl",
  gap = "gap-2.5",
}: LogoProps) {
  return (
    <div className={`flex items-center ${gap}`}>
      {/* Document icon — inline SVG so it scales precisely */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Black rounded square background */}
        <rect width="56" height="56" rx="10" fill="#1a1a1a" />

        {/* Document shape — white paper with folded corner */}
        {/* 24w × 30h, centered: x=(56-24)/2=16, y=(56-30)/2=13 */}
        {/* Fold: 7px at top-right → notch at x=33, fold ends at x=40,y=20 */}
        <path d="M 16 13 L 33 13 L 40 20 L 40 43 L 16 43 Z" fill="white" />

        {/* Fold shadow triangle (same as bg) */}
        <path d="M 33 13 L 33 20 L 40 20 Z" fill="#1a1a1a" />

        {/* Content lines */}
        <line x1="20" y1="25" x2="36" y2="25" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="29" x2="36" y2="29" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="33" x2="30" y2="33" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />

        {/* Signature line */}
        <line x1="20" y1="39" x2="36" y2="39" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 1.5" />
      </svg>

      <span className={`font-semibold tracking-tight text-neutral-900 ${textSize}`}>
        deed
      </span>
    </div>
  );
}
