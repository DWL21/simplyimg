import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLocaleMessages } from '../i18n/messages';

export function UserMenu() {
  const messages = useLocaleMessages();
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) {
    return (
      <button className="user-menu-login" onClick={login}>
        {messages.auth.login}
      </button>
    );
  }

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-menu-trigger" onClick={() => setOpen(!open)}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="user-avatar" />
        ) : (
          <span className="user-avatar-fallback">{user.name.charAt(0).toUpperCase()}</span>
        )}
      </button>
      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <span className="user-menu-name">{user.name}</span>
            <span className="user-menu-email">{user.email}</span>
          </div>
          <button
            className="user-menu-item"
            onClick={() => {
              setOpen(false);
              navigate('/account');
            }}
          >
            {messages.auth.account}
          </button>
          <button
            className="user-menu-item"
            onClick={() => {
              setOpen(false);
              navigate('/history');
            }}
          >
            {messages.auth.history}
          </button>
          <hr className="user-menu-divider" />
          <button
            className="user-menu-item user-menu-item--danger"
            onClick={async () => {
              setOpen(false);
              await logout();
            }}
          >
            {messages.auth.logout}
          </button>
        </div>
      )}
    </div>
  );
}
