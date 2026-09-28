import Card from "../ui/Card";
import Icon from "../ui/Icon";

function AuthLayout({
  title,
  description,
  cardEyebrow,
  cardTitle,
  cardDescription,
  children,
  footer,
}) {
  return (
    <main className="auth-page">
      <section className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand-mark" aria-hidden="true">
            <Icon name="leaf" size={28} />
          </div>
          <div>
            <p className="auth-eyebrow">SawitVision</p>
            <h1>{title}</h1>
            <p className="auth-description">{description}</p>
          </div>

          <div className="auth-brand-note">
            <Icon name="scan" size={20} />
            <p>
              Catat hasil pemeriksaan TBS, lokasi pengambilan, dan riwayat kerja
              lapangan dalam satu tempat.
            </p>
          </div>
        </div>

        <Card className="auth-card" variant="raised">
          <header className="auth-card-header">
            <p>{cardEyebrow}</p>
            <h2>{cardTitle}</h2>
            {cardDescription && <span>{cardDescription}</span>}
          </header>
          {children}
          {footer && <footer className="auth-footer">{footer}</footer>}
        </Card>
      </section>
    </main>
  );
}

export default AuthLayout;

