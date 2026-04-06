import { useState } from 'react';
import { useImageStore } from './store/imageStore';
import ModeSelect from './components/ModeSelect';
import UploadZone from './components/UploadZone';
import EditWorkspace from './components/EditWorkspace';
import type { ToolName } from './types/image';

type Step = 'select' | 'upload' | 'edit';

export default function App() {
  const [step, setStep] = useState<Step>('select');
  const [tool, setTool] = useState<ToolName>('compress');
  const reset = useImageStore((s) => s.reset);

  function handleSelectTool(t: ToolName) {
    setTool(t);
    setStep('upload');
  }

  function handleFilesAdded() {
    setStep('edit');
  }

  function handleBack() {
    reset();
    setStep('select');
  }

  function handleAddMore() {
    reset();
    setStep('upload');
  }

  return (
    <div className="app">
      {step === 'select' && <ModeSelect onSelect={handleSelectTool} />}
      {step === 'upload' && (
        <UploadZone tool={tool} onFilesAdded={handleFilesAdded} onBack={handleBack} />
      )}
      {step === 'edit' && (
        <EditWorkspace
          tool={tool}
          onChangeTool={setTool}
          onBack={handleBack}
          onAddMore={handleAddMore}
        />
      )}
    </div>
  );
}
