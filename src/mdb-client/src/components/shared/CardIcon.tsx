import type { ReactNode } from 'react';
import './CardIcon.css';

export default function CardIcon({ children }: { children: ReactNode }) {
  return <span className="card-icon" aria-hidden="true">{children}</span>;
}
