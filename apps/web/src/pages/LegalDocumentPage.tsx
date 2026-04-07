import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import type { LegalDocumentContent } from '../lib/legalContent';

interface LegalDocumentPageProps {
  document: LegalDocumentContent;
}

export function LegalDocumentPage({ document }: LegalDocumentPageProps) {
  return (
    <div className="legal-page">
      <div className="legal-shell">
        <header className="legal-header">
          <Link className="legal-back" to="/">
            ← 홈으로
          </Link>
          <div className="legal-header-copy">
            <span className="legal-eyebrow">SIMPLYIMG LEGAL</span>
            <h1>{document.title}</h1>
            <p>{document.summary}</p>
          </div>
        </header>

        <article className="legal-card">
          <div className="legal-sections">
            {document.sections.map((section) => (
              <section key={section.title} className="legal-section">
                <h2>{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>

        <Footer />
      </div>
    </div>
  );
}
