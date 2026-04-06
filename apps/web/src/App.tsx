import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import ModeSelect from './components/ModeSelect';
import ToolFlow from './components/ToolFlow';
import type { ToolName } from './types/image';

function HomeRoute() {
  const navigate = useNavigate();
  return <ModeSelect onSelect={(t: ToolName) => navigate(`/${t}`)} />;
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/:tool" element={<ToolFlow />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
