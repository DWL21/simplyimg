import { Link } from 'react-router-dom';
import { appMessages } from '../../i18n/messages';
import { LEGAL_EFFECTIVE_DATE } from '../../lib/legalContent';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <p className="app-footer-copy">{appMessages.brand.footer}</p>
        <div className="app-footer-links">
          <Link className="app-footer-link" to="/privacy">
            개인정보 처리방침
          </Link>
          <Link className="app-footer-link" to="/terms">
            이용약관
          </Link>
        </div>
        <p className="app-footer-meta">시행일 {LEGAL_EFFECTIVE_DATE}</p>
      </div>
    </footer>
  );
}
