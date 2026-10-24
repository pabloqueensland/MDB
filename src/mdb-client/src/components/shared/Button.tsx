import './Button.css';
import MuiButton from '@mui/material/Button';
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button';

interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'inverse' | 'tab' | 'segmented';
  size?: 'default' | 'compact' | 'icon';
  fullWidth?: boolean;
}

export default function Button({ variant = 'primary', size = 'default', fullWidth = false, type = 'button', className = '', ...props }: ButtonProps) {
  const classes = ['button', `button--${variant}`, `button--${size}`, fullWidth ? 'button--full' : '', className].filter(Boolean).join(' ');
  const muiVariant = variant === 'primary' ? 'contained' : variant === 'secondary' ? 'outlined' : 'text';

  return <MuiButton {...props} type={type} className={classes} variant={muiVariant}
    size={size === 'default' ? 'medium' : 'small'} fullWidth={fullWidth} />;
}
