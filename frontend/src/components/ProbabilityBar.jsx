import { formatConfidence } from "../utils/presentation";

function ProbabilityBar({ label, value, className = "" }) {
  const percent = Math.min(Math.max(Number(formatConfidence(value)), 0), 100);

  return (
    <div className={`probability-bar ${className}`.trim()}>
      <div className="probability-bar__label">
        <span>{label}</span>
        <strong>{percent.toFixed(2)}%</strong>
      </div>
      <div
        className="probability-bar__track"
        role="progressbar"
        aria-label={`${label} ${percent.toFixed(2)} persen`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default ProbabilityBar;

