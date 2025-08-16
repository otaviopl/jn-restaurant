'use client';

import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';

interface Props {
  isOpen: boolean;
  toggle: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({ isOpen, toggle, onConfirm }: Props) {
  return (
    <Modal isOpen={isOpen} toggle={toggle} aria-label="confirm-delete">
      <ModalHeader toggle={toggle}>Confirmar exclusão</ModalHeader>
      <ModalBody>Tem certeza que deseja excluir?</ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>Cancelar</Button>
        <Button color="danger" onClick={onConfirm}>Excluir</Button>
      </ModalFooter>
    </Modal>
  );
}
