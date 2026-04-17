import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ImageIcon,
  Minimize2,
  ArrowLeftRight,
  Crop,
  RotateCw,
  FlipHorizontal2,
  FilePlus,
  FileEdit,
  FileOutput,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '../i18n/messages';
import type { ToolName } from '../types/image';
import { Footer } from './layout/Footer';

interface Props {
  onSelectImage: (tool: ToolName) => void;
  onSelectDocument: () => void;
  onSelectDocumentEditor: () => void;
  onSelectDocumentFileEdit: () => void;
}

type FilterKey = 'all' | 'image' | 'doc';

interface ToolDef {
  id: string;
  cat: 'image' | 'doc';
  icon: React.ReactNode;
  meta: string;
  tag?: string;
  action: () => void;
}

export default function ModeSelect({
  onSelectImage,
  onSelectDocument,
  onSelectDocumentEditor,
  onSelectDocumentFileEdit,
}: Props) {
  const { locale, messages } = useI18n();
  const [filter, setFilter] = useState<FilterKey>('all');

  const ko = locale === 'ko';

  const tools: ToolDef[] = [
    {
      id: 'compress',
      cat: 'image',
      icon: <Minimize2 size={22} strokeWidth={1.6} />,
      meta: 'JPG · PNG · WebP · SVG',
      action: () => onSelectImage('compress'),
    },
    {
      id: 'resize',
      cat: 'image',
      icon: <ImageIcon size={22} strokeWidth={1.6} />,
      meta: ko ? '일괄 처리 · 픽셀' : 'Batch · px',
      action: () => onSelectImage('resize'),
    },
    {
      id: 'convert',
      cat: 'image',
      icon: <ArrowLeftRight size={22} strokeWidth={1.6} />,
      meta: '5 formats · batch',
      action: () => onSelectImage('convert'),
    },
    {
      id: 'crop',
      cat: 'image',
      icon: <Crop size={22} strokeWidth={1.6} />,
      meta: ko ? '자유 비율' : 'Free ratio',
      action: () => onSelectImage('crop'),
    },
    {
      id: 'rotate',
      cat: 'image',
      icon: <RotateCw size={22} strokeWidth={1.6} />,
      meta: '90° · 180° · 270°',
      action: () => onSelectImage('rotate'),
    },
    {
      id: 'flip',
      cat: 'image',
      icon: <FlipHorizontal2 size={22} strokeWidth={1.6} />,
      meta: ko ? '가로 · 세로' : 'H · V',
      action: () => onSelectImage('flip'),
    },
    {
      id: 'mdNew',
      cat: 'doc',
      icon: <FilePlus size={22} strokeWidth={1.6} />,
      meta: 'Markdown',
      tag: 'NEW',
      action: onSelectDocumentEditor,
    },
    {
      id: 'mdEdit',
      cat: 'doc',
      icon: <FileEdit size={22} strokeWidth={1.6} />,
      meta: '.md',
      tag: 'EDIT',
      action: onSelectDocumentFileEdit,
    },
    {
      id: 'mdPdf',
      cat: 'doc',
      icon: <FileOutput size={22} strokeWidth={1.6} />,
      meta: 'Markdown → PDF',
      tag: 'PDF',
      action: onSelectDocument,
    },
  ];

  const toolName = (id: string) => {
    const map: Record<string, Record<string, string>> = {
      compress: { ko: '이미지 압축', en: 'Compress' },
      resize:   { ko: '크기 조절', en: 'Resize' },
      convert:  { ko: '형식 변환', en: 'Convert' },
      crop:     { ko: '자르기', en: 'Crop' },
      rotate:   { ko: '회전', en: 'Rotate' },
      flip:     { ko: '반전', en: 'Flip' },
      mdNew:    { ko: '새 마크다운', en: 'New Markdown' },
      mdEdit:   { ko: 'MD 파일 편집', en: 'Edit Markdown' },
      mdPdf:    { ko: 'PDF로 변환', en: 'Markdown → PDF' },
    };
    return map[id]?.[locale] ?? id;
  };

  const toolDesc = (id: string) => {
    if (id in messages.modeSelect.toolDescriptions) {
      return messages.modeSelect.toolDescriptions[id as ToolName];
    }
    const docDescs: Record<string, Record<string, string>> = {
      mdNew:  { ko: '빈 MD 파일을 새로 작성합니다', en: 'Start a new markdown document' },
      mdEdit: { ko: '기존 MD 파일을 불러와 수정합니다', en: 'Open and edit an existing .md file' },
      mdPdf:  { ko: '마크다운을 PDF 문서로 저장합니다', en: 'Export your markdown as PDF' },
    };
    return docDescs[id]?.[locale] ?? '';
  };

  const filtered = tools.filter(t =>
    filter === 'all' || t.cat === filter
  );

  const filterLabels: Record<FilterKey, string> = {
    all:   ko ? `전체 · ${tools.length}` : `All · ${tools.length}`,
    image: ko ? '이미지 · 6' : 'Image · 6',
    doc:   ko ? '문서 · 3' : 'Docs · 3',
  };

  return (
    <div className="home-page">
      {/* Top nav */}
      <nav className="home-nav">
        <Link to="/" className="wordmark">
          <span className="wordmark-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M6 16l4-4 3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="9" r="1.4" fill="currentColor" />
            </svg>
          </span>
          Simply<span className="wordmark-light">Img</span>
        </Link>
        <div className="home-nav-right">
          <LangToggle />
        </div>
      </nav>

      {/* Scrollable body */}
      <div className="home-body">
        {/* Hero */}
        <section className="home-hero">
          <p className="home-eyebrow">SIMPLYIMG</p>
          <h1 className="home-title">
            {ko ? '필요한 작업을\n바로 시작하세요' : 'Start any task\nright now'}
          </h1>
          <p className="home-subtitle">
            {ko
              ? '이미지 편집부터 문서 변환까지, 설치 없이 브라우저에서.'
              : 'Image editing to document conversion — all in the browser, no install.'}
          </p>

          <div className="home-tabs" role="tablist">
            {(['all', 'image', 'doc'] as FilterKey[]).map(f => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                className={`home-tab${filter === f ? ' is-active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        </section>

        {/* Tool grid */}
        <section className="home-grid">
          {filtered.map(tool => (
            <button
              key={tool.id}
              className="tool-tile"
              onClick={tool.action}
            >
              <div className="tool-tile-icon">{tool.icon}</div>
              <div className="tool-tile-body">
                <div className="tool-tile-name">
                  {toolName(tool.id)}
                  {tool.tag && <span className="tool-tile-tag">{tool.tag}</span>}
                </div>
                <p className="tool-tile-desc">{toolDesc(tool.id)}</p>
              </div>
              <div className="tool-tile-footer">
                <span>{tool.meta}</span>
                <span className="tool-tile-arrow"><ArrowRight size={14} /></span>
              </div>
            </button>
          ))}
        </section>

        {/* Footer */}
        <footer className="home-footer">
          <div className="home-footer-links">
            <Link to="/privacy">{messages.footer.privacyPolicy}</Link>
            <Link to="/terms">{messages.footer.termsOfService}</Link>
            <LangToggle />
          </div>
        </footer>
      </div>
    </div>
  );
}

function LangToggle() {
  const { locale, setLocale, messages } = useI18n();
  return (
    <div className="lang-toggle">
      <button
        className={`lang-toggle-btn${locale === 'ko' ? ' is-active' : ''}`}
        onClick={() => setLocale('ko')}
      >
        {messages.language.korean}
      </button>
      <button
        className={`lang-toggle-btn${locale === 'en' ? ' is-active' : ''}`}
        onClick={() => setLocale('en')}
      >
        {messages.language.english}
      </button>
    </div>
  );
}
