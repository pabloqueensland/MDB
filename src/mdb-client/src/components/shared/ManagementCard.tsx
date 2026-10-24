import CardIcon from './CardIcon';
import './ManagementCard.css';
import type { ReactNode } from 'react';

export interface ManagementCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  linkLabel: string;
}

export default function ManagementCard({ title, description, icon, href, linkLabel }: ManagementCardProps) {
  return (
    <a className="management-card" href={href}>
      <CardIcon>{icon}</CardIcon>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="card-link">
        {linkLabel}
        <span aria-hidden="true">↗</span>
      </span>
    </a>
  );
}
