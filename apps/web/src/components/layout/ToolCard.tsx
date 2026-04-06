import { Link } from 'react-router-dom';
import type { ToolName } from '../../types/image';
import { getToolCardEntries, appLocale } from '../../i18n/messages';

export interface ToolCardData {
  name: string;
  label: string;
  path: string;
  description: string;
  details: string;
  tool: ToolName;
  workspaceTitle?: string;
  workspaceDescription?: string;
  processLabel?: string;
}

export const toolCards: ToolCardData[] = getToolCardEntries(appLocale);

export function ToolCard({ name, label, path, description, details }: ToolCardData) {
  return (
    <Link className="tool-card" to={path}>
      <span className="tool-card-label">{label}</span>
      <div className="tool-card-copy">
        <strong>{name}</strong>
        <p>{description}</p>
      </div>
      <div className="tool-card-footer">
        <span>{details}</span>
        <span className="tool-card-arrow">시작하기</span>
      </div>
    </Link>
  );
}
