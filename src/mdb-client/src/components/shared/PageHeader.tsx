import type { ReactNode } from 'react';

interface PageHeaderProps {
  titleId: string;
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export default function PageHeader({ titleId, title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="section-number">{eyebrow}</span>}
        <h1 id={titleId} className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions}
    </div>
  );
}
