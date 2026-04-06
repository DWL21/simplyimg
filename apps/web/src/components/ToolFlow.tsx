import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useImageStore } from '../store/imageStore';
import EditWorkspace from './EditWorkspace';
import { ALL_TOOLS } from '../lib/toolConstants';
import type { ToolName } from '../types/image';

export default function ToolFlow() {
  const { tool } = useParams<{ tool: string }>();
  const navigate = useNavigate();
  const reset = useImageStore((s) => s.reset);

  const validTool = ALL_TOOLS.includes(tool as ToolName) ? (tool as ToolName) : null;
  if (!validTool) return <Navigate to="/" replace />;

  return (
    <EditWorkspace
      tool={validTool}
      onChangeTool={(t) => navigate(`/${t}`)}
      onBack={() => { reset(); navigate('/'); }}
    />
  );
}
