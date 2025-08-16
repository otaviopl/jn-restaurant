'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardBody, CardTitle, Badge, Table, Button } from 'reactstrap';
import { Order } from '@/lib/store'; // Assuming Order is imported from lib/store
import ItemStatusBadge from './ItemStatusBadge'; // Assuming this component exists
import { Icon } from '@iconify/react';

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'todo':
        return { color: 'secondary', label: 'A Fazer' };
      case 'in_progress':
      case 'em_preparo':
        return { color: 'warning', label: 'Em Preparo' };
      case 'done':
      case 'entregue':
        return { color: 'success', label: 'Entregue' };
      case 'canceled':
      case 'cancelado':
        return { color: 'danger', label: 'Cancelado' };
      default:
        return { color: 'secondary', label: status || 'Desconhecido' };
    }
  };

  const { color, label } = getStatusConfig(status);
  
  return (
    <Badge color={color} className="me-2">
      {label}
    </Badge>
  );
};

interface KanbanCardProps {
  order: Order;
  isOverlay?: boolean;
  onOpenEditOrderModal: (order: Order) => void; // New prop
  onOpenDeleteConfirmModal: (orderId: string, customerName: string) => void; // New prop
}

const KanbanCard: React.FC<KanbanCardProps> = ({ order, isOverlay, onOpenEditOrderModal, onOpenDeleteConfirmModal }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 'auto',
    backgroundColor: isOverlay ? 'white' : undefined, // For drag overlay
    boxShadow: isOverlay ? '0px 4px 12px rgba(0, 0, 0, 0.15)' : undefined,
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group items by type and flavor/beverage to avoid showing too many rows
  const groupedItems = order.items.reduce((acc, item) => {
    const key = item.type === 'skewer' ? `skewer-${item.flavor}` : `beverage-${item.beverage}`;
    if (!acc[key]) {
      acc[key] = {
        name: item.type === 'skewer' ? item.flavor : item.beverage,
        type: item.type,
        totalQty: 0,
        deliveredQty: 0,
        status: item.status
      };
    }
    acc[key].totalQty += item.qty;
    acc[key].deliveredQty += item.deliveredQty || 0;
    return acc;
  }, {} as Record<string, { name?: string; type: string; totalQty: number; deliveredQty: number; status?: any }>);

  const groupedItemsArray = Object.values(groupedItems);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLargeOrder = groupedItemsArray.length > 5;
  const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className="kanban-card mb-3"
      >
        <CardBody onClick={() => onOpenEditOrderModal(order)}>
          <CardTitle tag="h6" className="mb-2 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <span>{order.customerName}</span>
              {hasLargeOrder && (
                <Badge color="warning" className="ms-2 small">
                  {totalItems} itens
                </Badge>
              )}
            </div>
            <div className="d-flex align-items-center">
              <StatusBadge status={order.status} />
              {/* Drag Handle */}
              <div
                ref={setActivatorNodeRef}
                className="drag-handle d-flex align-items-center"
                {...attributes}
                {...listeners}
                style={{ cursor: 'grab' }}
              >
                <Icon
                  icon="mdi:drag-variant"
                />
              </div>
            </div>
          </CardTitle>
          <small className="text-muted mb-2 d-block">
            <Icon icon="mdi:clock" className="me-1" />
            {formatTime(order.createdAt)}
          </small>
          <div className="d-flex gap-2 mb-2"> {/* Added buttons here */}
            {!isOverlay && (
              <Button
                color="outline-primary"
                size="sm"
                onClick={() => {
                  
                  onOpenEditOrderModal(order);
                }}
                title="Editar pedido"
              >
                <Icon icon="mdi:pencil" />
              </Button>
            )}
            {!isOverlay && (
              <Button
                color="outline-danger"
                size="sm"
                onClick={() => {
                  
                  onOpenDeleteConfirmModal(order.id, order.customerName);
                }}
                title="Excluir pedido"
              >
                <Icon icon="mdi:delete" />
              </Button>
            )}
          </div>
          {hasLargeOrder && !isExpanded ? (
            // For large orders, show a compact summary
            <div className="order-summary">
              <div className="d-flex justify-content-between mb-2">
                <strong>Total de itens:</strong>
                <Badge color="info">{totalItems}</Badge>
              </div>
              <div className="items-compact">
                {groupedItemsArray.slice(0, 3).map((group, index) => (
                  <div key={index} className="d-flex justify-content-between">
                    <span>{group.name}</span>
                    <span>x{group.totalQty}</span>
                  </div>
                ))}
                {groupedItemsArray.length > 3 && (
                  <div className="text-muted small">
                    +{groupedItemsArray.length - 3} outros itens...
                  </div>
                )}
              </div>
              <Button 
                size="sm" 
                color="outline-primary" 
                className="mt-2 w-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
              >
                <Icon icon="mdi:chevron-down" className="me-1" />
                Ver todos os itens
              </Button>
            </div>
          ) : (
            // For normal orders or expanded view, show the detailed table
            <div>
              <Table size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedItemsArray.map((group, index) => (
                    <tr key={index}>
                      <td>{group.name}</td>
                      <td>{group.totalQty}</td>
                      <td>
                        {group.status && <ItemStatusBadge status={group.status} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {hasLargeOrder && isExpanded && (
                <Button 
                  size="sm" 
                  color="outline-secondary" 
                  className="mt-2 w-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                >
                  <Icon icon="mdi:chevron-up" className="me-1" />
                  Recolher
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default KanbanCard;