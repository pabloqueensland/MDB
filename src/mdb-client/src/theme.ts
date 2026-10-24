import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#234c39', dark: '#153925', contrastText: '#fffef4' },
    secondary: { main: '#d4df8c', contrastText: '#193b32' },
  },
  typography: { fontFamily: "'DM Sans', sans-serif" },
  shape: { borderRadius: 6 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, fontSize: 12, minHeight: 46 },
      },
    },
  },
});
