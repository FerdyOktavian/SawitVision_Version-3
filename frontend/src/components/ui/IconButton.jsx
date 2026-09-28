function IconButton({ className = "", children, ...props }) {
  return <button className={`ui-icon-button ${className}`.trim()} {...props}>{children}</button>;
}

export default IconButton;

