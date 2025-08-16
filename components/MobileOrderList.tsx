'use client';

import React, { useState } from 'react';
import { Card, CardBody, Badge, Button, Row, Col } from 'reactstrap';
import { Icon } from '@iconify/react';
import { Order } from '@/lib/store';
import { KanbanColumnId } from './KanbanBoard';

interface MobileOrderListProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: KanbanColumnId) => void;
  onOpenEditOrderModal: (order: Order) => void;
  onOpenDeleteConfirmModal: (orderId: string, customerName: string) => void;
}

const MobileOrderList: React.FC<MobileOrderListProps> = ({
  orders,
  onStatusChange,
  onOpenEditOrderModal,
  onOpenDeleteConfirmModal
}) => {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'todo':
        return { color: '#6c757d', label: 'A Fazer', icon: 'mdi:clock-outline' };
      case 'in_progress':
      case 'em_preparo':
        return { color: '#ffc107', label: 'Em Preparo', icon: 'mdi:chef-hat' };
      case 'done':
      case 'entregue':
        return { color: '#28a745', label: 'Pronto', icon: 'mdi:check-circle' };
      case 'canceled':
      case 'cancelado':
        return { color: '#dc3545', label: 'Cancelado', icon: 'mdi:close-circle' };
      default:
        return { color: '#6c757d', label: status || 'Desconhecido', icon: 'mdi:help-circle' };
    }
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getOrderTotal = (order: Order) => {
    return order.items.reduce((total, item) => total + (item.qty || 0), 0);
  };

  const toggleExpanded = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const handleStatusChange = (order: Order, newStatus: KanbanColumnId) => {
    onStatusChange(order.id, newStatus);
  };

  // Group orders by status for better organization
  const groupedOrders = orders.reduce((acc, order) => {
    const status = order.status || 'todo';
    if (!acc[status]) acc[status] = [];
    acc[status].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const statusOrder = ['todo', 'in_progress', 'done', 'canceled'];

  return (
    <div className="mobile-kanban-list">
      {statusOrder.map((status) => {
        const statusOrders = groupedOrders[status] || [];
        if (statusOrders.length === 0) return null;

        const statusConfig = getStatusConfig(status);

        return (
          <div key={status} className="mb-4">
            {/* Status Section Header */}
            <div 
              className="d-flex align-items-center mb-3 p-2 rounded"
              style={{ 
                backgroundColor: `${statusConfig.color}15`,
                border: `1px solid ${statusConfig.color}30`
              }}
            >
              <Icon 
                icon={statusConfig.icon} 
                width="20" 
                style={{ color: statusConfig.color }} 
                className="me-2" 
              />
              <h6 className="mb-0 fw-semibold" style={{ color: statusConfig.color }}>
                {statusConfig.label} ({statusOrders.length})
              </h6>
            </div>

            {/* Orders in this status */}
            {statusOrders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              const statusConf = getStatusConfig(order.status || 'todo');

              return (
                <Card 
                  key={order.id} 
                  className={`mobile-order-card status-${order.status || 'todo'} mb-3`}
                  style={{ borderLeft: `4px solid ${statusConf.color}` }}
                >
                  <CardBody className="p-3">
                    {/* Order Header */}
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="flex-grow-1">
                        <h6 className="mb-1 fw-semibold" style={{ color: '#4c4e64' }}>
                          {order.customerName}
                        </h6>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <Badge 
                            style={{ 
                              backgroundColor: statusConf.color,
                              color: statusConf.color === '#ffc107' ? '#212529' : 'white',
                              fontSize: '0.7rem'
                            }}
                          >
                            <Icon icon={statusConf.icon} width="12" className="me-1" />
                            {statusConf.label}
                          </Badge>
                          <small className="text-muted">
                            <Icon icon="mdi:clock-outline" width="12" className="me-1" />
                            {formatTime(order.createdAt)}
                          </small>
                        </div>
                      </div>
                      <Button
                        color="link"
                        size="sm"
                        onClick={() => toggleExpanded(order.id)}
                        className="p-1"
                        style={{ color: '#6c757d' }}
                      >
                        <Icon 
                          icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} 
                          width="20" 
                        />
                      </Button>
                    </div>

                    {/* Quick Order Summary */}
                    <div className="d-flex align-items-center justify-content-between text-muted mb-2">
                      <small>
                        <Icon icon="mdi:food" width="14" className="me-1" />
                        {getOrderTotal(order)} itens
                      </small>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-top pt-3 mt-2">
                        {/* Items List */}
                        <div className="mb-3">
                          <small className="text-muted fw-semibold d-block mb-2">ITENS:</small>
                          <div className="table-responsive-mobile">
                            {order.items.map((item, index) => (
                              <div 
                                key={index} 
                                className="d-flex justify-content-between align-items-center py-1 border-bottom"
                              >
                                <span className="fw-medium" style={{ fontSize: '0.875rem' }}>
                                  {item.flavor || item.beverage}
                                </span>
                                <Badge 
                                  color="light" 
                                  className="text-dark"
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {item.qty}x
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Note: observations não está na interface Order, removendo por enquanto */}

                        {/* Status Change Buttons */}
                        <div className="mobile-status-selector">
                          <small className="text-muted fw-semibold d-block mb-2">ALTERAR STATUS:</small>
                          <div className="mobile-status-buttons">
                            <button
                              className={`mobile-status-btn status-todo ${order.status === 'todo' ? 'active' : ''}`}
                              onClick={() => handleStatusChange(order, 'todo')}
                              disabled={order.status === 'todo'}
                            >
                              <Icon icon="mdi:clock-outline" width="12" className="me-1" />
                              A Fazer
                            </button>
                            <button
                              className={`mobile-status-btn status-in_progress ${order.status === 'in_progress' ? 'active' : ''}`}
                              onClick={() => handleStatusChange(order, 'in_progress')}
                              disabled={order.status === 'in_progress'}
                            >
                              <Icon icon="mdi:chef-hat" width="12" className="me-1" />
                              Preparo
                            </button>
                            <button
                              className={`mobile-status-btn status-done ${order.status === 'done' ? 'active' : ''}`}
                              onClick={() => handleStatusChange(order, 'done')}
                              disabled={order.status === 'done'}
                            >
                              <Icon icon="mdi:check-circle" width="12" className="me-1" />
                              Pronto
                            </button>
                            <button
                              className={`mobile-status-btn status-canceled ${order.status === 'canceled' ? 'active' : ''}`}
                              onClick={() => handleStatusChange(order, 'canceled')}
                              disabled={order.status === 'canceled'}
                            >
                              <Icon icon="mdi:close-circle" width="12" className="me-1" />
                              Cancelar
                            </button>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mobile-action-buttons mt-3 pt-2 border-top">
                          <Button
                            color="primary"
                            size="sm"
                            onClick={() => onOpenEditOrderModal(order)}
                            className="me-2"
                          >
                            <Icon icon="mdi:pencil" width="14" className="me-1" />
                            Editar
                          </Button>
                          <Button
                            color="danger"
                            size="sm"
                            outline
                            onClick={() => onOpenDeleteConfirmModal(order.id, order.customerName)}
                          >
                            <Icon icon="mdi:delete" width="14" className="me-1" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        );
      })}

      {orders.length === 0 && (
        <div className="text-center py-5 text-muted">
          <Icon icon="mdi:clipboard-text-outline" width="48" className="mb-3 d-block mx-auto" />
          <p>Nenhum pedido encontrado</p>
        </div>
      )}
    </div>
  );
};

export default MobileOrderList;
