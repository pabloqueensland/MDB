import './NotificationSnackbar.css';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Portal from '@mui/material/Portal';

interface Props {
  message: string;
  onClose: () => void;
}

export default function NotificationSnackbar({ message, onClose }: Props) {
  return (
    <Portal>
      <Snackbar key={message} open={Boolean(message)} autoHideDuration={5000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') {
            onClose();
          }
        }}>
        <Alert severity="success" variant="filled" role="status" className="notification-alert" onClose={onClose}>
          {message}
        </Alert>
      </Snackbar>
    </Portal>
  );
}
