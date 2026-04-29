interface EkgLineProps {
  className?: string;
}

export function EkgLine({ className = "" }: EkgLineProps) {
  return (
    <svg
      viewBox="0 0 600 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d="M0 40 L120 40 L140 40 L150 20 L160 60 L170 10 L180 70 L195 40 L320 40 L335 25 L345 55 L355 15 L365 65 L380 40 L600 40"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-ekg"
        style={{ filter: "drop-shadow(0 0 6px var(--primary))" }}
      />
    </svg>
  );
}
