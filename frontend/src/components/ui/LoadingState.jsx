function LoadingState({ title = "Memuat...", description, className = "" }) {
  return (
    <div className={`ui-loading-state ${className}`.trim()} role="status" aria-live="polite">
      <span className="ui-loading-state__spinner" aria-hidden="true" />
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}

export default LoadingState;

