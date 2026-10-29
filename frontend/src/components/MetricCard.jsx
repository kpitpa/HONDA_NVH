export default function MetricCard({ label, value, unit, pass: isPassing, range }) {
  return (
    <div className={`metric-card ${isPassing ? 'pass' : 'fail'}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value} <span className="metric-unit">{unit}</span>
      </div>
      <div className={`metric-status ${isPassing ? 'status-pass' : 'status-fail'}`}>
        {isPassing ? '● PASS' : '● FAIL'}
      </div>
      <div className="metric-range">Tolerance: {range}</div>
    </div>
  );
}
