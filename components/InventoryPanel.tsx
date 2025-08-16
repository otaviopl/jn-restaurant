'use client';

import React from 'react';
import { Card, CardHeader, CardBody, Table, Badge, Button } from 'reactstrap';
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
    <Card className="inventory-card h-100">
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

        <div className="mt-3 text-center d-flex justify-content-center gap-2">
          <Button 
            color="outline-primary" 
            size="sm" 
            onClick={onRefreshData}
            disabled={loading}
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
                <Icon icon="mdi:refresh" className="me-1" />
                Atualizar Dados
              </>
            )}
          </Button>
          <Button color="primary" size="sm" onClick={onOpenUpdateModal}>
            <Icon icon="mdi:pencil" className="me-1" />
            Atualizar Estoque
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default InventoryPanel;