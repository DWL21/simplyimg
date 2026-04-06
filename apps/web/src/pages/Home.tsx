import { ToolCard, type ToolCardData } from '../components/layout/ToolCard';

interface HomeProps {
  cards: ToolCardData[];
}

export function Home({ cards }: HomeProps) {
  return (
    <div className="page">
      <section className="hero">
        <h1>Process images locally first.</h1>
        <p>
          This scaffold gives you a router, upload flow, store, and adapter boundaries for a
          client-first image editor with worker fallback.
        </p>
        <div className="pill-row">
          <span className="chip">React 19</span>
          <span className="chip">Vite</span>
          <span className="chip">Zustand</span>
          <span className="chip">Web Worker ready</span>
        </div>
      </section>
      <section className="grid cards">
        {cards.map((card) => (
          <ToolCard key={card.path} {...card} />
        ))}
      </section>
    </div>
  );
}
