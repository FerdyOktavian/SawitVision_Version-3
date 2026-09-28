import Button from "./Button";
import Icon from "./Icon";

function EmptyState({ icon = "history", title, description, actionLabel, onAction, className = "" }) {
  return (
    <section className={`ui-empty-state ${className}`.trim()}>
      <span className="ui-empty-state__icon" aria-hidden="true"><Icon name={icon} size={26} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && onAction && <Button type="button" onClick={onAction}>{actionLabel}</Button>}
    </section>
  );
}

export default EmptyState;

