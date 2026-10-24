import CardIcon from './CardIcon';
import './ManagementCard.css';
import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';

export interface ManagementCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  linkLabel: string;
}

export default function ManagementCard({ title, description, icon, href, linkLabel }: ManagementCardProps) {
  return (
    <Card className="management-card" variant="outlined">
      <CardActionArea component="a" href={href} className="management-card-action">
        <CardContent className="management-card-content">
          <CardIcon>{icon}</CardIcon>
          <h2>{title}</h2>
          <p>{description}</p>
          <span className="card-link">
            {linkLabel}
            <span aria-hidden="true">↗</span>
          </span>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
