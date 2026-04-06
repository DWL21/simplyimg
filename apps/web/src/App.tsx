import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import ModeSelect from './components/ModeSelect';
import ToolFlow from './components/ToolFlow';
import DocumentWorkspace from './components/DocumentWorkspace';
import { useDocumentStore } from './store/documentStore';
import type { ToolName } from './types/image';

function HomeRoute() {
  const navigate = useNavigate();
  return (
    <ModeSelect
      onSelectImage={(t: ToolName) => navigate(`/image/${t}`)}
      onSelectDocument={() => navigate('/document/pdf')}
    />
  );
}

function DocumentRoute() {
  const navigate = useNavigate();

  return (
    <DocumentWorkspace
      onBack={() => {
        useDocumentStore.getState().reset();
        navigate('/');
      }}
    />
  );
}

function LegacyToolRoute() {
  const { tool } = useParams<{ tool: string }>();
  return <Navigate to={`/image/${tool}`} replace />;
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/image/:tool" element={<ToolFlow />} />
        <Route path="/document/pdf" element={<DocumentRoute />} />
        <Route path="/:tool" element={<LegacyToolRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
