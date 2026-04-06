import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useImageStore } from '../store/imageStore';
import UploadZone from './UploadZone';
import EditWorkspace from './EditWorkspace';
import { ALL_TOOLS } from '../lib/toolConstants';
import type { ToolName } from '../types/image';

export default function ToolFlow() {
  const { tool } = useParams<{ tool: string }>();
  const navigate = useNavigate();
  const reset = useImageStore((s) => s.reset);
  const files = useImageStore((s) => s.files);

  const validTool = ALL_TOOLS.includes(tool as ToolName) ? (tool as ToolName) : null;

  // If files already exist (e.g. switching tool tab), go straight to edit
  const [step, setStep] = useState<'upload' | 'edit'>(() =>
    files.length > 0 ? 'edit' : 'upload',
  );

  if (!validTool) return <Navigate to="/" replace />;

  function handleConfirm() {
    setStep('edit');
  }

  function handleBack() {
    reset();
    navigate('/');
  }

  function handleAddMore() {
    setStep('upload');
  }

  function handleChangeTool(t: ToolName) {
    navigate(`/${t}`);
    // step stays 'edit', files stay in store
  }

  if (step === 'upload') {
    return <UploadZone tool={validTool} onConfirm={handleConfirm} onBack={handleBack} />;
  }

  return (
    <EditWorkspace
      tool={validTool}
      onChangeTool={handleChangeTool}
      onBack={handleBack}
      onAddMore={handleAddMore}
    />
  );
}
