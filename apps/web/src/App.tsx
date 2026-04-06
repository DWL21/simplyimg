import { Navigate, Route, Routes } from 'react-router-dom';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { toolCards } from './components/layout/ToolCard';
import { Home } from './pages/Home';
import { Compress } from './pages/Compress';
import { Resize } from './pages/Resize';
import { Convert } from './pages/Convert';
import { Rotate } from './pages/Rotate';
import { Crop } from './pages/Crop';
import { Flip } from './pages/Flip';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home cards={toolCards} />} />
          <Route path="/compress" element={<Compress />} />
          <Route path="/resize" element={<Resize />} />
          <Route path="/convert" element={<Convert />} />
          <Route path="/rotate" element={<Rotate />} />
          <Route path="/crop" element={<Crop />} />
          <Route path="/flip" element={<Flip />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
