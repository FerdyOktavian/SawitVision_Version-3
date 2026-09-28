import { formatMaturityLabel, MATURITY_META, normalizeMaturityClass } from "../utils/presentation";

function MaturityBadge({ value, className = "" }) {
  const normalized = normalizeMaturityClass(value);
  const tone = MATURITY_META[normalized]?.tone || "unknown";

  return (
    <span className={`maturity-badge maturity-badge--${tone} ${className}`.trim()}>
      <span className="maturity-badge__dot" aria-hidden="true" />
      {formatMaturityLabel(normalized)}
    </span>
  );
}

export default MaturityBadge;

