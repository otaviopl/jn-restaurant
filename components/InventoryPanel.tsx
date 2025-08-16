'use client';

import React from 'react';
import { Card, CardHeader, CardBody, Table, Badge, Button, Row, Col } from 'reactstrap';
import { Icon } from '@iconify/react';
import { InventoryItem } from '@/lib/store'; // Assuming InventoryItem is imported from lib/store

interface InventoryPanelProps {
  inventory: InventoryItem[];
  lastSync: Date | null;
  dataSource: 'local' | 'external';
  onRefreshData: () => void;
  onOpenUpdateModal: () => void; // Function to open the update modal
  loading?: boolean; // Loading state for refresh button
}

const InventoryPanel: React.FC<InventoryPanelProps> = ({
  inventory,
  lastSync,
  dataSource,
  onRefreshData,
  onOpenUpdateModal,
  loading = false,
}) => {
  // Sort inventory by quantity (lowest first)
  const sortedInventory = [...inventory].sort((a, b) => a.quantity - b.quantity);

  const getStockColor = (quantity: number): string => {
    if (quantity === 0) {
      return 'danger'; // Red for error
    } else if (quantity < 10) {
      return 'warning'; // Amber for warning
    } else {
      return 'success'; // Green for success
    }
  };

  const getStockBarWidth = (quantity: number, initialQuantity?: number): string => {
    if (!initialQuantity || initialQuantity === 0) return '0%'; // Avoid division by zero
    const percentage = (quantity / initialQuantity) * 100;
    return `${Math.min(100, percentage)}%`; // Cap at 100%
  };

  return (
    <Card 
      className="inventory-card h-100"
      style={{
        borderRadius: '16px',
        border: 'none',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden'
      }}
    >
      <CardHeader 
        className="bg-white border-0 pb-0"
        style={{ padding: '24px 24px 16px' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3 inventory-header-mobile">
          <h5 className="mb-0 fw-bold d-flex align-items-center" style={{ color: '#2c3e50', fontSize: '1.25rem' }}>
            <Icon icon="mdi:package-variant" className="me-2" width="24" />
            📦 Estoque Atual
          </h5>
          {lastSync && (
            <div className="d-flex align-items-center gap-2 inventory-mobile-hide">
              <Badge 
                style={{
                  backgroundColor: dataSource === 'external' ? '#2196f3' : '#9c27b0',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontWeight: '600',
                  fontSize: '0.75rem',
                  border: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <Icon 
                  icon={dataSource === 'external' ? 'mdi:cloud-check' : 'mdi:database'} 
                  className="me-1" 
                  width="14" 
                />
                {dataSource === 'external' ? 'API Externa' : 'Local'}
              </Badge>
              <Badge 
                style={{
                  backgroundColor: '#4caf50',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontWeight: '500',
                  fontSize: '0.75rem',
                  border: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <Icon icon="mdi:sync" className="me-1" width="14" />
                {new Date(lastSync).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
              </Badge>
            </div>
          )}
        </div>
        
        {/* Desktop Summary Stats */}
        <div 
          className="d-flex gap-3 mb-3 d-none d-md-flex"
          style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            padding: '16px'
          }}
        >
          <div className="text-center flex-fill">
            <div className="fw-bold text-primary" style={{ fontSize: '1.5rem' }}>
              {sortedInventory.length}
            </div>
            <small className="text-muted">Sabores</small>
          </div>
          <div className="text-center flex-fill">
            <div className="fw-bold text-success" style={{ fontSize: '1.5rem' }}>
              {sortedInventory.reduce((total, item) => total + item.quantity, 0)}
            </div>
            <small className="text-muted">Total em Estoque</small>
          </div>
          <div className="text-center flex-fill">
            <div className="fw-bold text-warning" style={{ fontSize: '1.5rem' }}>
              {sortedInventory.filter(item => item.quantity <= 5).length}
            </div>
            <small className="text-muted">Baixo Estoque</small>
          </div>
        </div>

        {/* Mobile Compact Stats */}
        <div className="inventory-stats-mobile d-md-none">
          <Row>
            <Col xs={6}>
              <h6 style={{ color: '#3498db' }}>{sortedInventory.length}</h6>
              <small>Sabores</small>
            </Col>
            <Col xs={6}>
              <h6 style={{ color: '#27ae60' }}>{sortedInventory.reduce((total, item) => total + item.quantity, 0)}</h6>
              <small>Total</small>
            </Col>
          </Row>
        </div>
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
            {sortedInventory.map((item) => (
              <tr key={item.flavor} className={item.quantity === 0 ? 'text-danger fw-bold' : ''}>
                <td>{item.flavor}</td>
                <td>
                  <div className="d-flex align-items-center">
                    <Badge color={getStockColor(item.quantity)} className="me-2">
                      {item.quantity}
                    </Badge>
                    <div className="stock-bar-container flex-grow-1 bg-light rounded">
                      <div
                        className={`stock-bar bg-${getStockColor(item.quantity)} rounded`}
                        style={{ width: getStockBarWidth(item.quantity, item.initialQuantity || 100) }} // Assuming initialQuantity or a max value for bar
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="mt-4 d-flex justify-content-center gap-3">
          <Button 
            onClick={onRefreshData}
            disabled={loading}
            style={{
              borderRadius: '10px',
              padding: '10px 20px',
              fontWeight: '500',
              border: '2px solid #e3f2fd',
              backgroundColor: loading ? '#f5f5f5' : 'white',
              color: loading ? '#9e9e9e' : '#1976d2',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.15)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                Sincronizando...
              </>
            ) : (
              <>
                <Icon icon="mdi:refresh" className="me-2" width="16" />
                Atualizar Dados
              </>
            )}
          </Button>
          <Button 
            onClick={onOpenUpdateModal}
            style={{
              borderRadius: '10px',
              padding: '10px 20px',
              fontWeight: '500',
              border: 'none',
              background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon icon="mdi:pencil" className="me-2" width="16" />
            Atualizar Estoque
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default InventoryPanel;