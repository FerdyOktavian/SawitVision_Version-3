import SocialLinks from "./SocialLinks";

function AppFooter() {
  return (
    <footer className="app-footer" aria-label="Informasi SawitVision">
      <div className="app-footer__inner">
        <div className="app-footer__brand">
          <strong>SawitVision</strong>
          <p>Teknologi pendukung analisis kematangan TBS sawit.</p>
        </div>

        <p className="app-footer__copyright">
          © 2026 SawitVision. Dibuat oleh Muhammad Ferdy Oktavian.
        </p>

        <SocialLinks className="app-footer__social" />
      </div>
    </footer>
  );
}

export default AppFooter;
