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
  Row,
  Col,
  Badge,
} from 'reactstrap';
import { Icon } from '@iconify/react';
import { Order, OrderItem, SkewerFlavor, Beverage, InventoryItem } from '@/lib/store';

// Define a type for the form's order item, which might differ slightly from OrderItem
interface FormOrderItem {
  type: 'skewer' | 'beverage';
  flavor?: SkewerFlavor;
  beverage?: Beverage;
  qty: number;
}

interface OrderModalProps {
  isOpen: boolean;
  toggle: () => void;
  order?: Order | null; // Optional: if provided, it's an edit operation
  flavors: SkewerFlavor[];
  beverages: Beverage[];
  inventory: InventoryItem[];
  onOrderSaved: () => void; // Callback to refresh orders in parent
}

const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  toggle,
  order,
  flavors,
  beverages,
  inventory,
  onOrderSaved,
}) => {
  
  const [customerName, setCustomerName] = useState('');
  const [orderItems, setOrderItems] = useState<FormOrderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setError(null);
      setSuccess(null);
      if (order) {
        // Editing existing order
        setCustomerName(order.customerName);
        setOrderItems(
          order.items.map((item) => ({
            type: item.type,
            flavor: item.flavor,
            beverage: item.beverage,
            qty: item.qty,
          }))
        );
      } else {
        // Creating new order
        setCustomerName('');
        setOrderItems([]);
      }
    }
  }, [isOpen, order]);

  const getAvailableStock = (flavor: SkewerFlavor): number => {
    if (!inventory || !Array.isArray(inventory)) {
      return 0;
    }
    const item = inventory.find((inv) => inv.flavor === flavor);
    return item?.quantity || 0;
  };

  const isFlavorAvailable = (flavor: SkewerFlavor): boolean => {
    return getAvailableStock(flavor) > 0;
  };

  const isFlavorLowStock = (flavor: SkewerFlavor): boolean => {
    const stock = getAvailableStock(flavor);
    return stock > 0 && stock < 5;
  };

  const addSkewerItem = () => {
    const defaultFlavor = flavors.length > 0 ? flavors[0] : 'Carne';
    setOrderItems([...orderItems, { type: 'skewer', flavor: defaultFlavor, qty: 1 }]);
  };

  const addBeverageItem = () => {
    const defaultBeverage = beverages.length > 0 ? beverages[0] : 'Coca-Cola';
    setOrderItems([...orderItems, { type: 'beverage', beverage: defaultBeverage, qty: 1 }]);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<FormOrderItem>) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], ...updates };
    setOrderItems(newItems);
  };

  const canSubmit = (): boolean => {
    if (!customerName.trim() || orderItems.length === 0) return false;

    // Check if all skewer items have available stock
    return orderItems.every((item) => {
      if (item.type === 'skewer' && item.flavor) {
        return getAvailableStock(item.flavor) >= item.qty;
      }
      return true;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      customerName: customerName.trim(),
      items: orderItems,
    };

    try {
      const response = await fetch(order ? `/api/orders/${order.id}` : '/api/orders', {
        method: order ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess(order ? 'Pedido atualizado com sucesso!' : 'Pedido criado com sucesso!');
        onOrderSaved(); // Trigger parent to refresh data
        setTimeout(() => {
          setSuccess(null);
          toggle(); // Close modal after success
        }, 1500);
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
          setError('Erro ao processar resposta do servidor.');
          return; // Exit if JSON parsing fails
        }
        setError(errorData.error || 'Erro ao salvar pedido.');
        setTimeout(() => {
          setError(null);
        }, 5000);
      }
    } catch (err) {
      // console.error('Erro de conexão ao salvar pedido:', err); // Keep for debugging if needed
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" fade timeout={150}>
      <ModalHeader toggle={toggle}>
        <Icon icon={order ? 'mdi:pencil' : 'mdi:plus'} className="me-2" />
        {order ? 'Editar Pedido' : 'Novo Pedido'}
      </ModalHeader>
      <ModalBody>
        {error && <Alert color="danger" fade timeout={150}>{error}</Alert>}
        {success && <Alert color="success" fade timeout={150}>{success}</Alert>}
        <Form>
          <FormGroup>
            <Label for="customerName">Nome do Cliente *</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Digite o nome do cliente"
            />
          </FormGroup>

          <div className="mb-3">
            <Label className="fw-bold">Itens do Pedido</Label>

            {orderItems.map((item, index) => (
              <div key={index} className="order-item">
                <Row className="align-items-center">
                  <Col md={3}>
                    <FormGroup>
                      <Label>Tipo</Label>
                      <Input
                        type="select"
                        value={item.type}
                        onChange={(e) =>
                          updateItem(index, {
                            type: e.target.value as 'skewer' | 'beverage',
                            flavor:
                              e.target.value === 'skewer'
                                ? flavors.length > 0
                                  ? flavors[0]
                                  : 'Carne'
                                : undefined,
                            beverage:
                              e.target.value === 'beverage'
                                ? beverages.length > 0
                                  ? beverages[0]
                                  : 'Coca-Cola'
                                : undefined,
                          })
                        }
                      >
                        <option value="skewer">Espetinho</option>
                        <option value="beverage">Bebida</option>
                      </Input>
                    </FormGroup>
                  </Col>

                  <Col md={4}>
                    <FormGroup>
                      <Label>{item.type === 'skewer' ? 'Sabor' : 'Bebida'}</Label>
                      {item.type === 'skewer' ? (
                        <Input
                          type="select"
                          value={item.flavor || ''}
                          onChange={(e) => updateItem(index, { flavor: e.target.value as SkewerFlavor })}
                        >
                          {flavors.map((flavor) => (
                            <option key={flavor} value={flavor} disabled={!isFlavorAvailable(flavor)}>
                              {flavor} {!isFlavorAvailable(flavor) ? '(Indisponível)' : ''}
                            </option>
                          ))}
                        </Input>
                      ) : (
                        <Input
                          type="select"
                          value={item.beverage || ''}
                          onChange={(e) => updateItem(index, { beverage: e.target.value as Beverage })}
                        >
                          {beverages.map((beverage) => (
                            <option key={beverage} value={beverage}>
                              {beverage}
                            </option>
                          ))}
                        </Input>
                      )}
                    </FormGroup>
                  </Col>

                  <Col md={2}>
                    <FormGroup>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(index, { qty: parseInt(e.target.value) || 1 })}
                      />
                    </FormGroup>
                  </Col>

                  <Col md={2}>
                    {item.type === 'skewer' && item.flavor && (
                      <div className="mt-4">
                        <Badge
                          color={
                            !isFlavorAvailable(item.flavor)
                              ? 'danger'
                              : isFlavorLowStock(item.flavor)
                              ? 'warning'
                              : 'success'
                          }
                          className="stock-badge"
                        >
                          Estoque: {getAvailableStock(item.flavor)}
                        </Badge>
                      </div>
                    )}
                  </Col>

                  <Col md={1}>
                    <Button color="danger" size="sm" onClick={() => removeItem(index)} className="mt-4">
                      <Icon icon="mdi:delete" />
                    </Button>
                  </Col>
                </Row>
              </div>
            ))}

            <div className="d-flex gap-2 mt-3">
              <Button color="outline-primary" onClick={addSkewerItem}>
                <Icon icon="mdi:plus" className="me-1" />
                Adicionar Espetinho
              </Button>
              <Button color="outline-info" onClick={addBeverageItem}>
                <Icon icon="mdi:plus" className="me-1" />
                Adicionar Bebida
              </Button>
            </div>
          </div>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle} disabled={submitting}>
          Cancelar
        </Button>
        <Button color="primary" onClick={handleSubmit} disabled={!canSubmit() || submitting}>
          {submitting ? (
            <>
              <Spinner size="sm" className="me-2" />
              Salvando...
            </>
          ) : (
            <>
              <Icon icon="mdi:check" className="me-2" />
              {order ? 'Salvar Alterações' : 'Criar Pedido'}
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default OrderModal;