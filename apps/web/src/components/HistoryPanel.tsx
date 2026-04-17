import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { getHistory, deleteHistory } from '../lib/authClient';
import { appMessages } from '../i18n/messages';
import type { HistoryEntry } from '../types/auth';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function HistoryPanel() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const login = useAuthStore((s) => s.login);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    getHistory()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="history-panel history-panel--empty">
        <p>{appMessages.auth.loginPrompt}</p>
        <button className="login-prompt-button" onClick={login}>
          {appMessages.auth.login}
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="history-panel history-panel--loading">Loading...</div>;
  }

  if (entries.length === 0) {
    return <div className="history-panel history-panel--empty">{appMessages.auth.historyEmpty}</div>;
  }

  const handleDelete = async (id: string) => {
    await deleteHistory(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="history-panel">
      <table className="history-table">
        <thead>
          <tr>
            <th>{appMessages.auth.historyDate}</th>
            <th>{appMessages.auth.historyTool}</th>
            <th>{appMessages.auth.historyFile}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{formatDate(entry.created_at)}</td>
              <td>{entry.tool}</td>
              <td>{entry.file_name}</td>
              <td>
                <button className="history-delete-btn" onClick={() => handleDelete(entry.id)}>
                  {appMessages.auth.historyDelete}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
