'use client';

import { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardHeader,
  CardBody,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Table,
  Badge,
  Alert,
  Spinner
} from 'reactstrap';
import { Icon } from '@iconify/react';
import { Order, OrderItem, SkewerFlavor, Beverage, InventoryItem } from '@/lib/store';

interface NewOrderItem {
  type: 'skewer' | 'beverage';
  flavor?: SkewerFlavor;
  beverage?: Beverage;
  qty: number;
}

export default function HomePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [orderItems, setOrderItems] = useState<NewOrderItem[]>([]);

  // Dynamic products from external APIs
  const [flavors, setFlavors] = useState<SkewerFlavor[]>(['Carne', 'Frango', 'Queijo', 'Calabresa']);
  const [beverages, setBeverages] = useState<Beverage[]>(['Coca-Cola', 'Guaraná', 'Água', 'Suco']);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'local' | 'external'>('local');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, inventoryRes, productsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/inventory'),
        fetch('/api/products')
      ]);

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setInventory(inventoryData);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setFlavors(productsData.flavors || ['Carne', 'Frango', 'Queijo', 'Calabresa']);
        setBeverages(productsData.beverages || ['Coca-Cola', 'Guaraná', 'Água', 'Suco']);
        setLastSync(productsData.lastSyncFormatted ? new Date(productsData.lastSyncFormatted) : null);
        setDataSource(productsData.dataSource || 'local');
      }
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const addSkewerItem = () => {
    setOrderItems([...orderItems, { type: 'skewer', flavor: 'Carne', qty: 1 }]);
  };

  const addBeverageItem = () => {
    setOrderItems([...orderItems, { type: 'beverage', beverage: 'Coca-Cola', qty: 1 }]);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<NewOrderItem>) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], ...updates };
    setOrderItems(newItems);
  };

  const getAvailableStock = (flavor: SkewerFlavor): number => {
    const item = inventory.find(inv => inv.flavor === flavor);
    return item?.quantity || 0;
  };

  const isFlavorAvailable = (flavor: SkewerFlavor): boolean => {
    return getAvailableStock(flavor) > 0;
  };

  const isFlavorLowStock = (flavor: SkewerFlavor): boolean => {
    const stock = getAvailableStock(flavor);
    return stock > 0 && stock < 5;
  };

  const canSubmitOrder = (): boolean => {
    if (!customerName.trim() || orderItems.length === 0) return false;
    
    // Check if all skewer items have available stock
    return orderItems.every(item => {
      if (item.type === 'skewer' && item.flavor) {
        return getAvailableStock(item.flavor) >= item.qty;
      }
      return true;
    });
  };

  const submitOrder = async () => {
    if (!canSubmitOrder()) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          items: orderItems
        })
      });

      if (response.ok) {
        setSuccess('Pedido criado com sucesso!');
        setCustomerName('');
        setOrderItems([]);
        await loadData();
        
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao criar pedido');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  const updateDeliveredQty = async (orderId: string, itemId: string, deliveredQty: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveredQty })
      });

      if (response.ok) {
        await loadData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao atualizar item');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      
      // Trigger manual revalidation
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: ['external-inventory', 'external-products']
        })
      });
      
      // Reload data
      await loadData();
      setSuccess('Dados atualizados com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao atualizar dados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <Row>
      <Col lg={8}>
        {/* New Order Form */}
        <Card className="mb-4">
          <CardHeader>
            <Icon icon="mdi:plus" className="me-2" />
            Novo Pedido
          </CardHeader>
          <CardBody>
            {error && <Alert color="danger">{error}</Alert>}
            {success && <Alert color="success">{success}</Alert>}

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

              {/* Order Items */}
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
                            onChange={(e) => updateItem(index, { 
                              type: e.target.value as 'skewer' | 'beverage',
                              flavor: e.target.value === 'skewer' ? 'Carne' : undefined,
                              beverage: e.target.value === 'beverage' ? 'Coca-Cola' : undefined
                            })}
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
                              {flavors.map(flavor => (
                                <option 
                                  key={flavor} 
                                  value={flavor}
                                  disabled={!isFlavorAvailable(flavor)}
                                >
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
                              {beverages.map(beverage => (
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
                              color={!isFlavorAvailable(item.flavor) ? 'danger' : isFlavorLowStock(item.flavor) ? 'warning' : 'success'}
                              className="stock-badge"
                            >
                              Estoque: {getAvailableStock(item.flavor)}
                            </Badge>
                          </div>
                        )}
                      </Col>
                      
                      <Col md={1}>
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="mt-4"
                        >
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

              <Button
                color="primary"
                size="lg"
                onClick={submitOrder}
                disabled={!canSubmitOrder() || submitting}
                className="w-100"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Criando Pedido...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:check" className="me-2" />
                    Criar Pedido
                  </>
                )}
              </Button>
            </Form>
          </CardBody>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <Icon icon="mdi:format-list-bulleted" className="me-2" />
            Pedidos ({orders.length})
          </CardHeader>
          <CardBody>
            {orders.length === 0 ? (
              <Alert color="info">
                <Icon icon="mdi:information" className="me-2" />
                Nenhum pedido encontrado
              </Alert>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className={`order-item ${order.status === 'entregue' ? 'order-delivered' : 'order-preparing'}`}
                  >
                    <Row>
                      <Col md={6}>
                        <h5 className="mb-2">
                          {order.customerName}
                          <Badge
                            color={order.status === 'entregue' ? 'success' : 'warning'}
                            className="ms-2"
                          >
                            {order.status === 'entregue' ? 'Entregue' : 'Em Preparo'}
                          </Badge>
                        </h5>
                        <small className="text-muted">
                          <Icon icon="mdi:clock" className="me-1" />
                          {formatTime(order.createdAt)}
                        </small>
                      </Col>
                      <Col md={6}>
                        <Table size="sm" className="mb-0">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Qty</th>
                              <th>Entregue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item) => (
                              <tr key={item.id}>
                                <td>
                                  {item.type === 'skewer' ? item.flavor : item.beverage}
                                </td>
                                <td>{item.qty}</td>
                                <td>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.qty}
                                    value={item.deliveredQty}
                                    onChange={(e) => 
                                      updateDeliveredQty(
                                        order.id, 
                                        item.id, 
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="delivered-qty-input"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Col>
                    </Row>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </Col>

      {/* Inventory Sidebar */}
      <Col lg={4}>
        <Card className="inventory-card">
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div>
              <Icon icon="mdi:package-variant" className="me-2" />
              Estoque Atual
            </div>
            {lastSync && (
              <div className="d-flex gap-1">
                <Badge color={dataSource === 'external' ? 'success' : 'secondary'} className="small">
                  <Icon icon={dataSource === 'external' ? 'mdi:cloud-check' : 'mdi:database'} className="me-1" />
                  {dataSource === 'external' ? 'API' : 'Local'}
                </Badge>
                <Badge color="info" className="small">
                  <Icon icon="mdi:sync" className="me-1" />
                  {new Date(lastSync).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardBody>
            <Table className="mb-0">
              <thead>
                <tr>
                  <th>Sabor</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.flavor}>
                    <td>{item.flavor}</td>
                    <td>
                      <Badge
                        color={
                          item.quantity === 0 ? 'danger' :
                          item.quantity < 5 ? 'warning' : 'success'
                        }
                      >
                        {item.quantity}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            <div className="mt-3 text-center">
              <Button
                color="outline-primary"
                size="sm"
                onClick={refreshData}
                disabled={loading}
              >
                <Icon icon="mdi:refresh" className="me-1" />
                Atualizar Dados
              </Button>
            </div>
          </CardBody>
        </Card>
      </Col>
    </Row>
  );
}
