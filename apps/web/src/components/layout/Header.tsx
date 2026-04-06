import { Link, NavLink } from 'react-router-dom';
import { toolCards } from './ToolCard';

export function Header() {
  return (
    <header className="app-header">
      <div className="app-main" style={{ paddingTop: 20, paddingBottom: 12 }}>
        <div className="panel" style={{ padding: 18 }}>
          <div className="toolbar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/" style={{ display: 'grid', gap: 4 }}>
              <strong style={{ fontSize: '1.05rem', letterSpacing: '-0.02em' }}>SimplyImg</strong>
              <span className="muted">Client-first image tools with WASM fallback.</span>
            </Link>
            <nav className="pill-row" aria-label="Primary">
              {toolCards.map((tool) => (
                <NavLink
                  key={tool.path}
                  to={tool.path}
                  className={({ isActive }) => `chip ${isActive ? 'status' : ''}`}
                  style={{ padding: '0.55rem 0.8rem' }}
                >
                  {tool.name}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
