import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="app-footer-links">
          <Link className="app-footer-link" to="/privacy">
            개인정보 처리방침
          </Link>
          <Link className="app-footer-link" to="/terms">
            이용약관
          </Link>
        </div>
      </div>
    </footer>
  );
}
