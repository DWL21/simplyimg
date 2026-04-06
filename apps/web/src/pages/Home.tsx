import { appMessages } from '../i18n/messages';
import { ToolCard, type ToolCardData } from '../components/layout/ToolCard';

interface HomeProps {
  cards: ToolCardData[];
}

export function Home({ cards }: HomeProps) {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">{appMessages.home.eyebrow}</span>
          <h1>{appMessages.home.title}</h1>
          <p>{appMessages.home.description}</p>
        </div>
        <div className="landing-note">
          <strong>{appMessages.home.currentFeaturesTitle}</strong>
          <p>{appMessages.home.currentFeaturesValue}</p>
          <span>{appMessages.home.currentFeaturesDescription}</span>
        </div>
      </section>
      <section className="tool-grid">
        {cards.map((card) => (
          <ToolCard key={card.path} {...card} />
        ))}
      </section>
    </div>
  );
}
