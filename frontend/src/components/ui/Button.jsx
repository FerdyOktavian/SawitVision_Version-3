function Button({ variant = "primary", size = "md", block = false, className = "", children, ...props }) {
  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    size !== "md" ? `ui-button--${size}` : "",
    block ? "ui-button--block" : "",
    className,
  ].filter(Boolean).join(" ");

  return <button className={classes} {...props}>{children}</button>;
}

export default Button;

