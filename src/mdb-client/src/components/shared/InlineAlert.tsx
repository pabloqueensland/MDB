import './InlineAlert.css';
import Alert from '@mui/material/Alert';
import type { AlertProps } from '@mui/material/Alert';

export default function InlineAlert({ severity = 'error', className = '', ...props }: AlertProps) {
  return <Alert {...props} severity={severity} className={`inline-alert ${className}`.trim()} />;
}
