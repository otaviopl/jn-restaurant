'use client';

import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';

interface Props {
  isOpen: boolean;
  toggle: () => void;
}

export default function InventoryModal({ isOpen, toggle }: Props) {
  return (
    <Modal isOpen={isOpen} toggle={toggle} aria-label="inventory-modal">
      <ModalHeader toggle={toggle}>Atualizar estoque</ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600">Conteúdo do estoque</p>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>Cancelar</Button>
        <Button color="primary">Salvar</Button>
      </ModalFooter>
    </Modal>
  );
}
