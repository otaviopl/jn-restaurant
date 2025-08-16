'use client';

import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { Order } from '@/types/order';

interface Props {
  isOpen: boolean;
  toggle: () => void;
  order?: Order;
}

export default function OrderModal({ isOpen, toggle, order }: Props) {
  return (
    <Modal isOpen={isOpen} toggle={toggle} aria-label="order-modal">
      <ModalHeader toggle={toggle}>{order ? 'Editar Pedido' : 'Novo Pedido'}</ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600">Form placeholder</p>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>Cancelar</Button>
        <Button color="primary">Salvar</Button>
      </ModalFooter>
    </Modal>
  );
}
