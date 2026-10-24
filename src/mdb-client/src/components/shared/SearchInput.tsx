import './SearchInput.css';
import Button from './Button';
import { useId } from 'react';

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
    <div className="search-field">
      <label htmlFor={id}>{label}</label>
      <div className="search-input-wrap">
        <input id={id} type="search" value={value} placeholder={placeholder} disabled={disabled}
          onChange={(event) => onChange(event.target.value)} />
        {value && <Button variant="ghost" size="compact" className="search-clear" type="button" disabled={disabled}
          aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange('')}>Clear</Button>}
      </div>
    </div>
  );
}
