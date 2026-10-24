import './SearchInput.css';
import Button from './Button';
import { useId } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

interface SearchInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchInput({ label, value, onChange, placeholder, disabled = false }: SearchInputProps) {
  const id = useId();

  return (
    <TextField className="search-field" id={id} label={label} type="search" fullWidth
      value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)}
      slotProps={{ input: { endAdornment: value ? <InputAdornment position="end">
        <Button variant="ghost" size="compact" disabled={disabled}
          aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange('')}>Clear</Button>
      </InputAdornment> : undefined } }} />
  );
}
