import ManagementCard from './shared/ManagementCard';
import type { ManagementCardProps } from './shared/ManagementCard';
import PageHeader from './shared/PageHeader';

interface DashboardHomeProps {
  cards: ManagementCardProps[];
}

export default function DashboardHome({ cards }: DashboardHomeProps) {
  return (
    <section aria-labelledby="dashboard-title">
      <PageHeader
        titleId="dashboard-title"
        eyebrow="YOUR NEXT CHAPTER"
        title="Welcome to your dashboard."
        description="Your community. Your practice. Your next move."
      />
      <div className="dashboard-cards">
        {cards.map((card) => <ManagementCard key={card.href} {...card} />)}
      </div>
    </section>
  );
}
