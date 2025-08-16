'use client';

import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { Icon } from '@iconify/react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  toggle: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  toggle,
  onConfirm,
  title,
  message,
}) => {
  const handleConfirm = () => {
    onConfirm();
    toggle(); // Close modal after confirmation
  };

  return (
    <Modal 
      isOpen={isOpen} 
      toggle={toggle} 
      fade 
      timeout={150}
      style={{ maxWidth: '500px' }}
    >
      <div style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <ModalHeader 
          toggle={toggle}
          style={{
            backgroundColor: '#fef2f2',
            borderBottom: 'none',
            padding: '24px 24px 16px'
          }}
        >
          <div className="d-flex align-items-center">
            <div 
              className="d-flex align-items-center justify-content-center me-3"
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#fee2e2',
                borderRadius: '12px',
                color: '#dc2626'
              }}
            >
              <Icon icon="mdi:alert-circle-outline" width="24" />
            </div>
            <div>
              <h5 className="mb-0 fw-bold" style={{ color: '#dc2626' }}>
                {title}
              </h5>
              <small className="text-muted">Esta ação não pode ser desfeita</small>
            </div>
          </div>
        </ModalHeader>
        <ModalBody style={{ padding: '16px 24px 24px' }}>
          <p className="mb-0" style={{ color: '#374151', lineHeight: '1.6' }}>
            {message}
          </p>
        </ModalBody>
        <ModalFooter style={{ borderTop: 'none', padding: '0 24px 24px' }}>
          <div className="d-flex gap-3 w-100">
            <Button 
              onClick={toggle}
              style={{
                flex: 1,
                borderRadius: '10px',
                padding: '12px',
                fontWeight: '500',
                border: '2px solid #e5e7eb',
                backgroundColor: 'white',
                color: '#6b7280'
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              style={{
                flex: 1,
                borderRadius: '10px',
                padding: '12px',
                fontWeight: '500',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              <Icon icon="mdi:delete" className="me-2" width="16" />
              Excluir
            </Button>
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;