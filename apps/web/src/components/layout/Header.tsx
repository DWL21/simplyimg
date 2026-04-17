import { Link, NavLink } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { appMessages } from '../../i18n/messages';
import { toolCards } from './ToolCard';
import { UserMenu } from '../UserMenu';

export function Header() {
  return (
    <header className="app-header">
      <div className="app-main">
        <div className="topbar">
          <Link to="/" className="wordmark" style={{ fontSize: 18 }}>
            <span className="wordmark-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.6" />
                <path d="M6 16l4-4 3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="9" r="1.4" fill="currentColor" />
              </svg>
            </span>
            Simply<span className="wordmark-light">Img</span>
          </Link>
          <nav className="topbar-nav" aria-label="Primary">
            {toolCards.map((tool) => (
              <NavLink
                key={tool.path}
                to={tool.path}
                className={({ isActive }) => (isActive ? 'topbar-link is-active' : 'topbar-link')}
              >
                {tool.name}
              </NavLink>
            ))}
          </nav>
          <div className="home-nav-privacy" style={{ marginLeft: 'auto' }}>
            <Lock size={12} />
            <span>{appMessages.brand.tagline}</span>
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
