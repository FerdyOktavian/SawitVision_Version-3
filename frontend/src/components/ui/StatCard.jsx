import Card from "./Card";
import Icon from "./Icon";

function StatCard({ icon, label, value, suffix, tone = "neutral", className = "" }) {
  return (
    <Card as="article" className={`ui-stat-card ui-stat-card--${tone} ${className}`.trim()}>
      <span className="ui-stat-card__icon" aria-hidden="true"><Icon name={icon} size={20} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}{suffix && <span>{suffix}</span>}</strong>
      </div>
    </Card>
  );
}

export default StatCard;

