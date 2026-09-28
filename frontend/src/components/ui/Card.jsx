function Card({ as: Element = "section", variant = "default", className = "", children, ...props }) {
  return <Element className={`ui-card ui-card--${variant} ${className}`.trim()} {...props}>{children}</Element>;
}

export default Card;

