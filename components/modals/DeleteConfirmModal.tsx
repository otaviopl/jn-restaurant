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
    <Modal isOpen={isOpen} toggle={toggle} fade timeout={150}>
      <ModalHeader toggle={toggle}>
        <Icon icon="mdi:alert-circle-outline" className="me-2 text-danger" />
        {title}
      </ModalHeader>
      <ModalBody>{message}</ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          Cancelar
        </Button>
        <Button color="danger" onClick={handleConfirm}>
          <Icon icon="mdi:delete" className="me-2" />
          Excluir
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteConfirmModal;