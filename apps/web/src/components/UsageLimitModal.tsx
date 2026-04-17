import { useAuthStore } from '../store/authStore';
import { appMessages } from '../i18n/messages';

interface UsageLimitModalProps {
  onClose: () => void;
}

export function UsageLimitModal({ onClose }: UsageLimitModalProps) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const login = useAuthStore((s) => s.login);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{appMessages.auth.dailyLimitReached}</h2>
        <p>{appMessages.auth.dailyLimitDescription}</p>
        {!isLoggedIn && (
          <button className="login-prompt-button" onClick={login}>
            {appMessages.auth.login}
          </button>
        )}
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}
