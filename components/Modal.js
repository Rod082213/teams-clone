// components/Modal.js
import React from 'react';
import styles from './Modal.module.css'; // We'll create this CSS module

const Modal = ({
  isOpen,
  onClose,
  title,
  children, // Content of the modal
  onConfirm, // Optional: function to call on confirm
  confirmText = 'Confirm',
  onCancel, // Optional: function to call on cancel (if it's a confirmation modal)
  cancelText = 'Cancel',
  type = 'alert', // 'alert' or 'confirm'
  size = 'md' // 'sm', 'md', 'lg' for different sizes
}) => {
  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose(); // Close modal after confirm
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose(); // Close modal after cancel
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}> {/* Close on overlay click */}
      <div 
        className={`${styles.modalContent} ${styles[size]}`} 
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {title && <h2 className={styles.modalTitle}>{title}</h2>}
        <div className={styles.modalBody}>
          {children}
        </div>
        <div className={styles.modalFooter}>
          {type === 'confirm' && (
            <button
              onClick={handleCancel}
              className={`${styles.modalButton} ${styles.cancelButton}`}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={type === 'confirm' ? handleConfirm : onClose} // If alert, button just closes
            className={`${styles.modalButton} ${styles.confirmButton} ${type === 'alert' ? styles.alertConfirm : ''}`}
          >
            {type === 'confirm' ? confirmText : 'OK'}
          </button>
        </div>
         <button onClick={onClose} className={styles.closeButton}>
            × {/* HTML entity for 'X' */}
         </button>
      </div>
    </div>
  );
};

export default Modal;