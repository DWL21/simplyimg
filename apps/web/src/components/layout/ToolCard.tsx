import { Link } from 'react-router-dom';
import type { ToolName } from '../../types/image';

export interface ToolCardData {
  name: string;
  path: string;
  description: string;
  tool: ToolName;
}

export const toolCards: ToolCardData[] = [
  {
    name: 'Compress',
    path: '/compress',
    description: 'Tune quality and shrink JPEG, PNG, or WebP files.',
    tool: 'compress',
  },
  {
    name: 'Resize',
    path: '/resize',
    description: 'Change dimensions with contain, cover, or exact fit.',
    tool: 'resize',
  },
  {
    name: 'Convert',
    path: '/convert',
    description: 'Switch formats with a predictable quality fallback.',
    tool: 'convert',
  },
  {
    name: 'Rotate',
    path: '/rotate',
    description: 'Apply quarter-turn rotations and keep the UI simple.',
    tool: 'rotate',
  },
  {
    name: 'Crop',
    path: '/crop',
    description: 'Prepare for future canvas-based region selection.',
    tool: 'crop',
  },
  {
    name: 'Flip',
    path: '/flip',
    description: 'Mirror images horizontally or vertically.',
    tool: 'flip',
  },
];

export function ToolCard({ name, path, description }: ToolCardData) {
  return (
    <Link className="tool-card" to={path}>
      <strong>{name}</strong>
      <p>{description}</p>
      <span className="muted">Open tool</span>
    </Link>
  );
}
