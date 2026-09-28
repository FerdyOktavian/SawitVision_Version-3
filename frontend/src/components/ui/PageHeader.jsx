function PageHeader({ eyebrow, title, description, actions, className = "" }) {
  return (
    <header className={`ui-page-header ${className}`.trim()}>
      <div>
        {eyebrow && <p className="ui-page-header__eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="ui-page-header__description">{description}</p>}
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </header>
  );
}

export default PageHeader;

