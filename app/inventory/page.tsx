'use client';

import { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardHeader,
  CardBody,
  Table,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Alert,
  Spinner,
  Badge
} from 'reactstrap';
import { Icon } from '@iconify/react';
import { InventoryItem, SkewerFlavor } from '@/lib/store';
import Header from '@/components/layout/Header';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editedInventory, setEditedInventory] = useState<Record<SkewerFlavor, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/realtime'); // Changed endpoint
      
      if (response.ok) {
        const data = await response.json();
        // The new endpoint returns an object with an 'inventory' property
        setInventory(data.inventory);
        
        // Initialize edited inventory dynamically based on fetched data
        const initialEdited: Record<SkewerFlavor, number> = {};
        data.inventory.forEach((item: InventoryItem) => {
          initialEdited[item.flavor] = item.quantity;
        });
        setEditedInventory(initialEdited);
        setHasChanges(false);
        setSuccess('Estoque recarregado com sucesso!'); // Added success message
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao carregar estoque');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (flavor: SkewerFlavor, quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    setEditedInventory(prev => ({
      ...prev,
      [flavor]: newQuantity
    }));
    
    // Check if there are changes
    const originalItem = inventory.find(item => item.flavor === flavor);
    const hasCurrentChanges = Object.entries(editedInventory).some(([f, q]) => {
      if (f === flavor) return newQuantity !== (originalItem?.quantity || 0);
      const origItem = inventory.find(item => item.flavor === f as SkewerFlavor);
      return q !== (origItem?.quantity || 0);
    });
    
    setHasChanges(hasCurrentChanges);
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: editedInventory })
      });

      if (response.ok) {
        const updatedInventory = await response.json();
        setInventory(updatedInventory);
        setHasChanges(false);
        setSuccess('Estoque atualizado com sucesso!');
        
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao salvar estoque');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    const originalInventory: Record<SkewerFlavor, number> = {
      Carne: 0,
      Frango: 0,
      Queijo: 0,
      Calabresa: 0
    };
    inventory.forEach(item => {
      originalInventory[item.flavor] = item.quantity;
    });
    setEditedInventory(originalInventory);
    setHasChanges(false);
    setError(null);
  };

  const getStockStatus = (quantity: number): { color: string; text: string } => {
    if (quantity === 0) return { color: 'danger', text: 'Esgotado' };
    if (quantity < 5) return { color: 'warning', text: 'Baixo Estoque' };
    if (quantity < 10) return { color: 'info', text: 'Estoque Normal' };
    return { color: 'success', text: 'Estoque Alto' };
  };

  const getTotalStock = (): number => {
    return Object.values(editedInventory).reduce((total, qty) => total + qty, 0);
  };

  const getLowStockCount = (): number => {
    return Object.values(editedInventory).filter(qty => qty > 0 && qty < 5).length;
  };

  const getOutOfStockCount = (): number => {
    return Object.values(editedInventory).filter(qty => qty === 0).length;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#f4f5f9' }}>
      <Header 
        totalOrders={0}
        pendingOrders={0}
        onRefreshData={() => window.location.reload()}
        loading={loading}
      />
      
      <div className="container-fluid" style={{ padding: '20px 24px' }}>
        <Row>
          <Col lg={8} className="mx-auto">
        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <CardBody>
                <h3 className="text-primary">{getTotalStock()}</h3>
                <small className="text-muted">Total em Estoque</small>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <CardBody>
                <h3 className="text-warning">{getLowStockCount()}</h3>
                <small className="text-muted">Baixo Estoque</small>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <CardBody>
                <h3 className="text-danger">{getOutOfStockCount()}</h3>
                <small className="text-muted">Esgotados</small>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <CardBody>
                <h3 className="text-success">{inventory.length}</h3>
                <small className="text-muted">Total de Sabores</small>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Inventory Management */}
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div>
              <Icon icon="mdi:package-variant" className="me-2" />
              Gerenciamento de Estoque
            </div>
            {hasChanges && (
              <Badge color="warning">
                <Icon icon="mdi:pencil" className="me-1" />
                Alterações não salvas
              </Badge>
            )}
          </CardHeader>
          <CardBody>
                        {error && <Alert color="danger" fade timeout={150}>{error}</Alert>}
            {success && <Alert color="success" fade timeout={150}>{success}</Alert>}

            <Alert color="info" className="mb-3" fade={false}>
              <Icon icon="mdi:cloud-sync" className="me-2" />
              <strong>Sincronização Externa:</strong> As alterações no estoque são automaticamente enviadas para o sistema externo quando salvas.
            </Alert>

            <Form>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Sabor</th>
                    <th>Qtd Inicial</th>
                    <th>Qtd Atual</th>
                    <th>Nova Quantidade</th>
                    <th>Status</th>
                    <th>Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const currentQty = editedInventory[item.flavor] || 0;
                    const stockStatus = getStockStatus(currentQty);
                    const isChanged = currentQty !== item.quantity;
                    
                    return (
                      <tr key={item.flavor} className={isChanged ? 'table-warning' : ''}>
                        <td className="fw-bold">{item.flavor}</td>
                        <td>
                          {item.initialQuantity ? (
                            <Badge color="info">
                              {item.initialQuantity}
                            </Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <Badge color={getStockStatus(item.quantity).color}>
                            {item.quantity}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <Button
                              color="outline-secondary"
                              size="sm"
                              onClick={() => updateQuantity(item.flavor, currentQty - 1)}
                              disabled={currentQty <= 0}
                              className="me-2"
                            >
                              <Icon icon="mdi:minus" />
                            </Button>
                            
                            <Input
                              type="number"
                              min="0"
                              value={currentQty}
                              onChange={(e) => updateQuantity(item.flavor, parseInt(e.target.value) || 0)}
                              className="text-center"
                              style={{ width: '80px' }}
                            />
                            
                            <Button
                              color="outline-secondary"
                              size="sm"
                              onClick={() => updateQuantity(item.flavor, currentQty + 1)}
                              className="ms-2"
                            >
                              <Icon icon="mdi:plus" />
                            </Button>
                          </div>
                        </td>
                        <td>
                          <Badge color={stockStatus.color}>
                            {stockStatus.text}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              color="outline-success"
                              size="sm"
                              onClick={() => updateQuantity(item.flavor, 20)}
                              title="Reabastecer (20)"
                            >
                              <Icon icon="mdi:refresh" />
                            </Button>
                            <Button
                              color="outline-info"
                              size="sm"
                              onClick={() => updateQuantity(item.flavor, currentQty + 10)}
                              title="Adicionar 10"
                            >
                              +10
                            </Button>
                            <Button
                              color="outline-danger"
                              size="sm"
                              onClick={() => updateQuantity(item.flavor, 0)}
                              title="Zerar estoque"
                            >
                              <Icon icon="mdi:delete" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>

              {hasChanges && (
                <div className="d-flex justify-content-between mt-4">
                  <Button
                    color="secondary"
                    onClick={discardChanges}
                    disabled={saving}
                  >
                    <Icon icon="mdi:close" className="me-2" />
                    Desfazer Alterações
                  </Button>
                  
                  <Button
                    color="primary"
                    size="lg"
                    onClick={saveChanges}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:content-save" className="me-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!hasChanges && (
                <div className="text-center mt-4">
                  <Button
                    color="outline-primary"
                    onClick={loadInventory}
                  >
                    <Icon icon="mdi:refresh" className="me-2" />
                    Recarregar Estoque
                  </Button>
                </div>
              )}
            </Form>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-4">
          <CardHeader>
            <Icon icon="mdi:lightning-bolt" className="me-2" />
            Ações Rápidas
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={6}>
                <Button
                  color="success"
                  className="w-100 mb-2"
                  onClick={() => {
                    const fullStock: Record<SkewerFlavor, number> = {
                      Carne: 20,
                      Frango: 20,
                      Queijo: 20,
                      Calabresa: 20
                    };
                    inventory.forEach(item => {
                      fullStock[item.flavor] = 20;
                    });
                    setEditedInventory(fullStock);
                    setHasChanges(true);
                  }}
                >
                  <Icon icon="mdi:package-up" className="me-2" />
                  Reabastecer Tudo (20 cada)
                </Button>
              </Col>
              <Col md={6}>
                <Button
                  color="warning"
                  className="w-100 mb-2"
                  onClick={() => {
                    const minStock: Record<SkewerFlavor, number> = {
                      Carne: 5,
                      Frango: 5,
                      Queijo: 5,
                      Calabresa: 5
                    };
                    inventory.forEach(item => {
                      minStock[item.flavor] = Math.max(5, editedInventory[item.flavor]);
                    });
                    setEditedInventory(minStock);
                    setHasChanges(true);
                  }}
                >
                  <Icon icon="mdi:alert" className="me-2" />
                  Estoque Mínimo (5 cada)
                </Button>
              </Col>
            </Row>
          </CardBody>
        </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
