import { Link, NavLink } from 'react-router-dom';
import { appMessages } from '../../i18n/messages';
import { toolCards } from './ToolCard';

export function Header() {
  return (
    <header className="app-header">
      <div className="app-main">
        <div className="topbar">
          <Link to="/" className="brand-mark">
            <span className="brand-badge">S</span>
            <div className="brand-copy">
              <strong>{appMessages.brand.name}</strong>
              <span>{appMessages.brand.tagline}</span>
            </div>
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
        </div>
      </div>
    </header>
  );
}
