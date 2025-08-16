'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Alert,
  Spinner,
  Table,
} from 'reactstrap';
import { Icon } from '@iconify/react';
import { InventoryItem } from '@/lib/store'; // Assuming InventoryItem is imported from lib/store

interface UpdateInventoryModalProps {
  isOpen: boolean;
  toggle: () => void;
  inventory: InventoryItem[];
  onInventoryUpdated: () => void; // Callback to refresh inventory data in parent
}

const UpdateInventoryModal: React.FC<UpdateInventoryModalProps> = ({
  isOpen,
  toggle,
  inventory,
  onInventoryUpdated,
}) => {
  const [currentInventory, setCurrentInventory] = useState<InventoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Initialize currentInventory with a deep copy of the inventory prop
    setCurrentInventory(inventory.map(item => ({ ...item })));
  }, [inventory]);

  const handleQuantityChange = (flavor: string, newQuantity: number) => {
    setCurrentInventory(prevInventory =>
      prevInventory.map(item =>
        item.flavor === flavor ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const updates: Record<string, number> = {};
    currentInventory.forEach(item => {
      // Only send updates for items whose quantity has changed
      const originalItem = inventory.find(inv => inv.flavor === item.flavor);
      if (originalItem && originalItem.quantity !== item.quantity) {
        updates[item.flavor] = item.quantity;
      }
    });

    if (Object.keys(updates).length === 0) {
      setError('Nenhuma alteração de quantidade para salvar.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        setSuccess('Estoque atualizado com sucesso!');
        onInventoryUpdated(); // Trigger parent to refresh data
        setTimeout(() => {
          setSuccess(null);
          toggle(); // Close modal after success
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao atualizar estoque.');
      }
    } catch (err) {
      setError('Erro de conexão ao atualizar estoque.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" fade timeout={150}>
      <ModalHeader toggle={toggle}>
        <Icon icon="mdi:pencil" className="me-2" />
        Atualizar Estoque
      </ModalHeader>
      <ModalBody>
        {error && <Alert color="danger" fade timeout={150}>{error}</Alert>}
        {success && <Alert color="success" fade timeout={150}>{success}</Alert>}
        <Form>
          <Table bordered responsive>
            <thead>
              <tr>
                <th>Sabor</th>
                <th>Quantidade Atual</th>
                <th>Nova Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {currentInventory.map(item => (
                <tr key={item.flavor}>
                  <td>{item.flavor}</td>
                  <td>{inventory.find(inv => inv.flavor === item.flavor)?.quantity}</td>
                  <td>
                    <FormGroup className="mb-0">
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={e => handleQuantityChange(item.flavor, parseInt(e.target.value) || 0)}
                      />
                    </FormGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle} disabled={submitting}>
          Cancelar
        </Button>
        <Button color="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Spinner size="sm" className="me-2" />
              Salvando...
            </>
          ) : (
            <>
              <Icon icon="mdi:check" className="me-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default UpdateInventoryModal;