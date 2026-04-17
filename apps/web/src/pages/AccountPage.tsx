import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { SubscriptionPanel } from '../components/SubscriptionPanel';
import { useLocaleMessages } from '../i18n/messages';

export function AccountPage() {
  const messages = useLocaleMessages();

  return (
    <div className="legal-page">
      <div className="legal-shell">
        <header className="legal-header">
          <Link className="legal-back" to="/">
            {messages.legal.backHome}
          </Link>
          <div className="legal-header-copy">
            <h1>{messages.auth.account}</h1>
          </div>
        </header>
        <div className="legal-card">
          <SubscriptionPanel />
        </div>
      </div>
      <Footer />
    </div>
  );
}
