import toast from 'react-hot-toast';

export const showSuccessToast = (message: string) => {
  toast.success(message, {
    id: message,
    duration: 3000,
    position: 'bottom-center',
    style: {
      background: '#333',
      color: '#fff',
      maxWidth: '500px',
      padding: '12px 24px',
    },
    iconTheme: {
      primary: '#10B981',
      secondary: '#fff',
    },
  });
};

export const showErrorToast = (message: string) => {
  toast.error(message, {
    id: message,
    duration: 3000,
    position: 'bottom-center',
    style: {
      background: '#333',
      color: '#fff',
      maxWidth: '500px',
      padding: '12px 24px',
    },
    iconTheme: {
      primary: '#EF4444',
      secondary: '#fff',
    },
  });
};

export const showInfoToast = (message: string) => {
  toast(message, {
    id: message,
    duration: 3000,
    position: 'bottom-center',
    style: {
      background: '#333',
      color: '#fff',
      maxWidth: '500px',
      padding: '12px 24px',
    },
  });
};