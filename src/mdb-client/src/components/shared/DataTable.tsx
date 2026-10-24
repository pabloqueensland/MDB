import Table from '@mui/material/Table';
import type { TableProps } from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import type { TableContainerProps } from '@mui/material/TableContainer';
import './DataTable.css';

export default function DataTable({ className = '', ...props }: TableProps) {
  return <Table {...props} className={`school-table ${className}`.trim()} />;
}

export function TableScroll({ className = '', ...props }: TableContainerProps) {
  return <TableContainer {...props} className={`school-table-scroll ${className}`.trim()} />;
}
