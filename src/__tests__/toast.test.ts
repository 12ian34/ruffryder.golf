import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('toast utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showSuccessToast', () => {
    it('should call toast.success with the message', () => {
      showSuccessToast('Operation successful');

      expect(toast.success).toHaveBeenCalledWith(
        'Operation successful',
        expect.objectContaining({
          id: 'Operation successful',
          duration: 3000,
          position: 'bottom-center',
        })
      );
    });

    it('should use the message as the toast id for deduplication', () => {
      showSuccessToast('Duplicate check');

      expect(toast.success).toHaveBeenCalledWith(
        'Duplicate check',
        expect.objectContaining({
          id: 'Duplicate check',
        })
      );
    });

    it('should apply correct styling', () => {
      showSuccessToast('Test message');

      expect(toast.success).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          style: expect.objectContaining({
            background: '#333',
            color: '#fff',
            maxWidth: '500px',
            padding: '12px 24px',
          }),
        })
      );
    });

    it('should apply green icon theme for success', () => {
      showSuccessToast('Success message');

      expect(toast.success).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          iconTheme: {
            primary: '#10B981',
            secondary: '#fff',
          },
        })
      );
    });
  });

  describe('showErrorToast', () => {
    it('should call toast.error with the message', () => {
      showErrorToast('Something went wrong');

      expect(toast.error).toHaveBeenCalledWith(
        'Something went wrong',
        expect.objectContaining({
          id: 'Something went wrong',
          duration: 3000,
          position: 'bottom-center',
        })
      );
    });

    it('should use the message as the toast id for deduplication', () => {
      showErrorToast('Error duplicate check');

      expect(toast.error).toHaveBeenCalledWith(
        'Error duplicate check',
        expect.objectContaining({
          id: 'Error duplicate check',
        })
      );
    });

    it('should apply correct styling', () => {
      showErrorToast('Test error');

      expect(toast.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          style: expect.objectContaining({
            background: '#333',
            color: '#fff',
            maxWidth: '500px',
            padding: '12px 24px',
          }),
        })
      );
    });

    it('should apply red icon theme for error', () => {
      showErrorToast('Error message');

      expect(toast.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff',
          },
        })
      );
    });
  });

  describe('toast behavior', () => {
    it('should handle empty message', () => {
      showSuccessToast('');
      expect(toast.success).toHaveBeenCalledWith('', expect.any(Object));

      showErrorToast('');
      expect(toast.error).toHaveBeenCalledWith('', expect.any(Object));
    });

    it('should handle long messages', () => {
      const longMessage = 'A'.repeat(500);
      
      showSuccessToast(longMessage);
      expect(toast.success).toHaveBeenCalledWith(longMessage, expect.any(Object));

      showErrorToast(longMessage);
      expect(toast.error).toHaveBeenCalledWith(longMessage, expect.any(Object));
    });

    it('should handle special characters in message', () => {
      const specialMessage = '<script>alert("xss")</script>';
      
      showSuccessToast(specialMessage);
      expect(toast.success).toHaveBeenCalledWith(specialMessage, expect.any(Object));
    });
  });
});

