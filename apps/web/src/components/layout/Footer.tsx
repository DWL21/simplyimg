import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/messages';

export function Footer() {
  const { locale, messages, setLocale } = useI18n();

  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="app-footer-links">
          <Link className="app-footer-link" to="/privacy">
            {messages.footer.privacyPolicy}
          </Link>
          <Link className="app-footer-link" to="/terms">
            {messages.footer.termsOfService}
          </Link>
        </div>

        <div className="app-footer-locale" aria-label={messages.language.label} role="group">
          <button
            type="button"
            className={`app-footer-locale-btn ${locale === 'en' ? 'is-active' : ''}`}
            onClick={() => setLocale('en')}
          >
            {messages.language.english}
          </button>
          <button
            type="button"
            className={`app-footer-locale-btn ${locale === 'ko' ? 'is-active' : ''}`}
            onClick={() => setLocale('ko')}
          >
            {messages.language.korean}
          </button>
        </div>
      </div>
    </footer>
  );
}
