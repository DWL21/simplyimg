import { useAuthStore } from '../store/authStore';
import { useLocaleMessages } from '../i18n/messages';

interface UsageLimitModalProps {
  onClose: () => void;
}

export function UsageLimitModal({ onClose }: UsageLimitModalProps) {
  const messages = useLocaleMessages();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const login = useAuthStore((s) => s.login);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{messages.auth.dailyLimitReached}</h2>
        <p>{messages.auth.dailyLimitDescription}</p>
        {!isLoggedIn && (
          <button className="login-prompt-button" onClick={login}>
            {messages.auth.login}
          </button>
        )}
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}
