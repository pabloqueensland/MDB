import ManagementCard from './shared/ManagementCard';
import type { ManagementCardProps } from './shared/ManagementCard';

interface DashboardHomeProps {
  cards: ManagementCardProps[];
}

export default function DashboardHome({ cards }: DashboardHomeProps) {
  return (
    <section aria-label="Dashboard">
      <div className="dashboard-cards">
        {cards.map((card) => <ManagementCard key={card.href} {...card} />)}
      </div>
    </section>
  );
}
