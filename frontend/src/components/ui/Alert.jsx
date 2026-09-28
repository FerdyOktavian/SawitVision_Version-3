import Icon from "./Icon";

function Alert({ tone = "neutral", className = "", children, role }) {
  const iconName = tone === "error" || tone === "warning" ? "warning" : "info";
  return (
    <div className={`ui-alert ui-alert--${tone} ${className}`.trim()} role={role}>
      <Icon name={iconName} size={20} />
      <div>{children}</div>
    </div>
  );
}

export default Alert;

