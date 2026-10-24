import type { HTMLAttributes } from 'react';
import './ManagementPanel.css';

export default function ManagementPanel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`schools-panel ${className}`.trim()} />;
}

export function PanelHeading({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`schools-panel-heading ${className}`.trim()} />;
}
