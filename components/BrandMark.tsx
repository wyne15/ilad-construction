export default function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="36" height="36" rx="3" fill="#1f5c40" />
      <g fill="#c85a3b">
        <rect x="6" y="8" width="11" height="5" />
        <rect x="19" y="8" width="11" height="5" />
        <rect x="6" y="15.5" width="5" height="5" />
        <rect x="13" y="15.5" width="11" height="5" />
        <rect x="26" y="15.5" width="4" height="5" />
        <rect x="6" y="23" width="11" height="5" />
        <rect x="19" y="23" width="11" height="5" />
      </g>
    </svg>
  );
}
