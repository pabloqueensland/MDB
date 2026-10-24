import type { HTMLAttributes, TableHTMLAttributes } from 'react';
import './DataTable.css';

export default function DataTable({ className = '', ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={`school-table ${className}`.trim()} />;
}

export function TableScroll({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`school-table-scroll ${className}`.trim()} />;
}
