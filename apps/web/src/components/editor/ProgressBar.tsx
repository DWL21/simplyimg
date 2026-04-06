interface ProgressBarProps {
  value: number;
}

export function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="panel" aria-live="polite">
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <strong>Processing</strong>
        <span className="muted">{value}%</span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          marginTop: 12,
          background: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #7dd3fc, #38bdf8)',
          }}
        />
      </div>
    </div>
  );
}
