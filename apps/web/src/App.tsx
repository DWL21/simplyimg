import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import ModeSelect from './components/ModeSelect';
import ToolFlow from './components/ToolFlow';
import DocumentWorkspace from './components/DocumentWorkspace';
import MarkdownEditorWorkspace from './components/MarkdownEditorWorkspace';
import { useAppLocale } from './i18n/messages';
import { getPrivacyPolicyContent, getTermsContent } from './lib/legalContent';
import { LegalDocumentPage } from './pages/LegalDocumentPage';
import { AccountPage } from './pages/AccountPage';
import { HistoryPage } from './pages/HistoryPage';
import { useDocumentStore } from './store/documentStore';
import { useMarkdownEditorStore } from './store/markdownEditorStore';
import type { ToolName } from './types/image';

interface DocumentRouteState {
  source?: 'markdown-editor';
  editorMode?: 'new' | 'edit';
}

interface MarkdownEditorRouteState {
  mode?: 'new' | 'edit';
}

function HomeRoute() {
  const navigate = useNavigate();
  return (
    <ModeSelect
      onSelectImage={(t: ToolName) => navigate(`/image/${t}`)}
      onSelectDocument={() => navigate('/document/pdf')}
      onSelectDocumentEditor={() => {
        useMarkdownEditorStore.getState().reset();
        navigate('/document/write', { state: { mode: 'new' } });
      }}
      onSelectDocumentFileEdit={() => {
        useMarkdownEditorStore.getState().reset();
        navigate('/document/write', { state: { mode: 'edit' } });
      }}
    />
  );
}

function DocumentRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as DocumentRouteState | null;

  return (
    <DocumentWorkspace
      returnToEditor={state?.source === 'markdown-editor'}
      onBack={() => {
        useDocumentStore.getState().reset();
        if (state?.source === 'markdown-editor') {
          navigate('/document/write', { state: { mode: state.editorMode ?? 'new' } });
          return;
        }

        navigate('/');
      }}
    />
  );
}

function MarkdownEditorRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as MarkdownEditorRouteState | null;

  return (
    <MarkdownEditorWorkspace
      entryMode={state?.mode === 'edit' ? 'edit' : 'new'}
      onBack={() => navigate('/')}
      onOpenPdf={async (markdown, fileName) => {
        await useDocumentStore.getState().loadDraft(markdown, fileName);
        navigate('/document/pdf', {
          state: {
            source: 'markdown-editor',
            editorMode: state?.mode === 'edit' ? 'edit' : 'new',
          },
        });
      }}
    />
  );
}

function PrivacyRoute() {
  const locale = useAppLocale();
  return <LegalDocumentPage document={getPrivacyPolicyContent(locale)} />;
}

function TermsRoute() {
  const locale = useAppLocale();
  return <LegalDocumentPage document={getTermsContent(locale)} />;
}

function LegacyToolRoute() {
  const { tool } = useParams<{ tool: string }>();
  return <Navigate to={`/image/${tool}`} replace />;
}

export default function App() {
  useAppLocale();

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/image/:tool" element={<ToolFlow />} />
        <Route path="/document/pdf" element={<DocumentRoute />} />
        <Route path="/document/write" element={<MarkdownEditorRoute />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/privacy" element={<PrivacyRoute />} />
        <Route path="/terms" element={<TermsRoute />} />
        <Route path="/:tool" element={<LegacyToolRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
