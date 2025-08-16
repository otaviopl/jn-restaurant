'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  DropAnimation,
  defaultDropAnimation,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { Order } from '@/lib/store'; // Assuming Order is imported from lib/store
import { Card, CardHeader, CardBody, Col, Row } from 'reactstrap';
import { Icon } from '@iconify/react';
import KanbanCard from './KanbanCard'; // Will create this component

// Define the types for Kanban columns
export type KanbanColumnId = 'todo' | 'in_progress' | 'done' | 'canceled';

interface KanbanBoardProps {
  orders: Order[];
  onOrderDrop: (orderId: string, newStatus: KanbanColumnId) => void;
  onOpenEditOrderModal: (order: Order) => void; // New prop
  onOpenDeleteConfirmModal: (orderId: string, customerName: string) => void; // New prop
}

const dropAnimation: DropAnimation = {
  ...defaultDropAnimation,
};

// Droppable Column Component
const DroppableColumn: React.FC<{
  column: { id: KanbanColumnId; title: string; icon: string };
  orders: Order[];
  onOpenEditOrderModal: (order: Order) => void;
  onOpenDeleteConfirmModal: (orderId: string, customerName: string) => void;
}> = ({ column, orders, onOpenEditOrderModal, onOpenDeleteConfirmModal }) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <Col key={column.id} lg={3} md={6} sm={12} className="kanban-column-wrapper">
      <Card className="kanban-column h-100">
        <CardHeader className="d-flex align-items-center">
          <Icon icon={column.icon} className="me-2" />
          {column.title}
        </CardHeader>
        <div ref={setNodeRef} className="kanban-column-body">
          <CardBody>
          <SortableContext items={orders.map(order => order.id)} strategy={verticalListSortingStrategy}>
            {orders.map((order) => (
              <KanbanCard
                key={order.id}
                order={order}
                onOpenEditOrderModal={onOpenEditOrderModal}
                onOpenDeleteConfirmModal={onOpenDeleteConfirmModal}
              />
            ))}
          </SortableContext>
          </CardBody>
        </div>
      </Card>
    </Col>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ orders, onOrderDrop, onOpenEditOrderModal, onOpenDeleteConfirmModal }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const columns: { id: KanbanColumnId; title: string; icon: string }[] = [
    { id: 'todo', title: 'A Fazer', icon: 'mdi:clipboard-text-outline' },
    { id: 'in_progress', title: 'Em Preparo', icon: 'mdi:fire' },
    { id: 'done', title: 'Pronto', icon: 'mdi:check-all' },
    { id: 'canceled', title: 'Cancelado', icon: 'mdi:close-circle-outline' },
  ];

  // Group orders by their status for rendering in columns
  const ordersByStatus = columns.reduce((acc, column) => {
    // Filter orders based on the new status types
    acc[column.id] = orders.filter(order => order.status === column.id);
    return acc;
  }, {} as Record<KanbanColumnId, Order[]>);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) return;

    const draggedOrderId = active.id as string;
    const newStatus = over.id as KanbanColumnId;

    // Only update if the status has actually changed
    const currentOrder = orders.find(order => order.id === draggedOrderId);
    if (currentOrder && currentOrder.status !== newStatus) {
      onOrderDrop(draggedOrderId, newStatus);
    }

    setActiveId(null);
  };

  const getActiveOrder = () => {
    if (!activeId) return null;
    return orders.find(order => order.id === activeId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Row className="kanban-board">
        {columns.map((column) => (
          <DroppableColumn
            key={column.id}
            column={column}
            orders={ordersByStatus[column.id]}
            onOpenEditOrderModal={onOpenEditOrderModal}
            onOpenDeleteConfirmModal={onOpenDeleteConfirmModal}
          />
        ))}
      </Row>

      {typeof document !== 'undefined' && createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeId ? (
            <KanbanCard 
              order={getActiveOrder()!} 
              isOverlay 
              onOpenEditOrderModal={onOpenEditOrderModal}
              onOpenDeleteConfirmModal={onOpenDeleteConfirmModal}
            />
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};

export default KanbanBoard;