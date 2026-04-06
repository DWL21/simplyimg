import { appMessages } from '../../i18n/messages';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-main">
        <p>{appMessages.brand.footer}</p>
      </div>
    </footer>
  );
}
