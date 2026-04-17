import { useAuthStore } from '../store/authStore';
import { appMessages } from '../i18n/messages';
import type { Subscription } from '../types/auth';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function planLabel(plan: Subscription['plan']): string {
  return plan === 'pro' ? appMessages.auth.planPro : appMessages.auth.planFree;
}

function statusLabel(status: Subscription['status']): string {
  if (status === 'active') return appMessages.auth.statusActive;
  if (status === 'cancelled') return appMessages.auth.statusCancelled;
  return appMessages.auth.statusExpired;
}

export function SubscriptionPanel() {
  const subscription = useAuthStore((s) => s.subscription);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const dailyUsage = useAuthStore((s) => s.dailyUsage);
  const dailyLimit = useAuthStore((s) => s.dailyLimit);
  const login = useAuthStore((s) => s.login);

  const remaining = isLoggedIn ? dailyLimit - dailyUsage : dailyLimit - dailyUsage;

  return (
    <div className="subscription-panel">
      {subscription && (
        <section className="subscription-info">
          <h3>{appMessages.auth.subscriptionInfo}</h3>
          <dl className="subscription-details">
            <dt>{appMessages.auth.plan}</dt>
            <dd>
              <span className={`plan-badge plan-badge--${subscription.plan}`}>
                {planLabel(subscription.plan)}
              </span>
            </dd>
            <dt>{appMessages.auth.statusActive.split(' ')[0]}</dt>
            <dd>
              <span className={`status-badge status-badge--${subscription.status}`}>
                {statusLabel(subscription.status)}
              </span>
            </dd>
            <dt>{appMessages.auth.startedAt}</dt>
            <dd>{formatDate(subscription.startedAt)}</dd>
            <dt>{appMessages.auth.expiresAt}</dt>
            <dd>{subscription.expiresAt ? formatDate(subscription.expiresAt) : appMessages.auth.noExpiry}</dd>
            <dt>{appMessages.auth.remainingMonths}</dt>
            <dd>{subscription.remainingMonths}</dd>
          </dl>
        </section>
      )}

      <section className="usage-info">
        <h4>{appMessages.auth.remainingToday}</h4>
        <p className="usage-count">
          {remaining} / {dailyLimit}
        </p>
        {subscription?.plan !== 'pro' && (
          <p className="usage-upgrade">{appMessages.auth.upgradePrompt}</p>
        )}
      </section>

      {!isLoggedIn && (
        <section className="login-prompt">
          <p>{appMessages.auth.loginPrompt}</p>
          <button className="login-prompt-button" onClick={login}>
            {appMessages.auth.login}
          </button>
        </section>
      )}
    </div>
  );
}
