import './Navigation.css';
import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Chip from '@mui/material/Chip';
import Toolbar from '@mui/material/Toolbar';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';
import Brand from '../shared/Brand';
import Button from '../shared/Button';

interface NavigationProps {
  items: { page: string; label: string; icon: ReactNode }[];
  page: string;
  email: string;
  isPlatform: boolean;
  onLogout: () => void;
}

export default function Navigation({ items, page, email, isPlatform, onLogout }: NavigationProps) {
  const mobile = useMediaQuery('(max-width:650px)');
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [mobile, page, email]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      {mobile && <AppBar position="sticky" elevation={0} className="mobile-navigation-bar">
        <Toolbar className="mobile-navigation-toolbar">
          <Brand href="#/dashboard" label="MDB dashboard" />
          <Button variant="inverse" size="icon" aria-label="Open navigation menu"
            aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </Toolbar>
      </AppBar>}

      <Drawer variant={mobile ? 'temporary' : 'permanent'} open={!mobile || open} onClose={closeMenu}
        className={mobile ? 'mobile-navigation-drawer' : 'desktop-navigation-drawer'}
        slotProps={{ paper: { className: 'navigation-paper' } }}>
        <div className="navigation-content" id={menuId}>
          <div className="navigation-heading">
            <div onClick={closeMenu}><Brand href="#/dashboard" label="MDB dashboard" /></div>
            {mobile && <Button variant="inverse" size="icon" aria-label="Close navigation menu" onClick={closeMenu}>×</Button>}
          </div>

          <List component="nav" aria-label="Main navigation" className="navigation-list">
            {items.map((item) => (
              <ListItemButton key={item.page} component="a" href={`#/${item.page}`} selected={page === item.page}
                aria-current={page === item.page ? 'page' : undefined} onClick={closeMenu}>
                <ListItemIcon><span aria-hidden="true">{item.icon}</span></ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>

          <div className="navigation-account">
            <span className="navigation-account-label">SIGNED IN AS</span>
            <strong>{email}</strong>
            {isPlatform && <Chip size="small" color="secondary" className="navigation-role" label="Platform admin" />}
            <Button variant="inverse" className="navigation-sign-out" onClick={onLogout}>Sign out <span aria-hidden="true">↗</span></Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
