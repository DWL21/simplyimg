interface Props {
  size?: number;
}

export default function Brand({ size = 18 }: Props) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      <span className="wordmark-icon">
        <svg width={size + 2} height={size + 2} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 16l4-4 3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="9" r="1.4" fill="currentColor" />
        </svg>
      </span>
      Simply<span className="wordmark-light">Img</span>
    </span>
  );
}
