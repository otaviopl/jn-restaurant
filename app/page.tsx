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
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
} from 'reactstrap';
import { Icon } from '@iconify/react';
import { Order, OrderItem, SkewerFlavor, Beverage, InventoryItem } from '@/lib/store';
import KanbanBoard, { KanbanColumnId } from '@/components/KanbanBoard';
import InventoryPanel from '@/components/InventoryPanel';
import UpdateInventoryModal from '@/components/UpdateInventoryModal';
import OrderModal from '@/components/modals/OrderModal'; // New import
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal'; // New import

export default function HomePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [updateInventoryModalOpen, setUpdateInventoryModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false); // New state for OrderModal
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null); // New state for editing order
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false); // New state for DeleteConfirmModal
  const [orderToDelete, setOrderToDelete] = useState<{ id: string; customerName: string } | null>(null); // New state for order to delete

  const openUpdateInventoryModal = () => setUpdateInventoryModalOpen(true);
  const closeUpdateInventoryModal = () => setUpdateInventoryModalOpen(false);

  const openCreateOrderModal = () => {
    
    setOrderToEdit(null);
    setOrderModalOpen(true);
  };

  const openEditOrderModal = (order: Order) => {
    
    setOrderToEdit(order);
    setOrderModalOpen(true);
  };

  const closeOrderModal = () => {
    
    setOrderModalOpen(false);
    loadData(); // Reload data after order saved
  };

  const openDeleteConfirmModal = (orderId: string, customerName: string) => {
    
    setOrderToDelete({ id: orderId, customerName });
    setDeleteConfirmModalOpen(true);
  };

  const closeDeleteConfirmModal = () => {
    setDeleteConfirmModalOpen(false);
    setOrderToDelete(null);
  };

  const handleDeleteOrderConfirm = async () => {
    if (!orderToDelete) return;
    try {
      const response = await fetch(`/api/orders/${orderToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Pedido excluído com sucesso!');
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao excluir pedido');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      closeDeleteConfirmModal();
    }
  };

  const handleOrderDrop = async (orderId: string, newStatus: KanbanColumnId) => {
    
    const originalOrders = [...orders]; // Save current state for rollback

    // Optimistic update
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse error response for Kanban drop:', jsonError);
          setError('Erro ao processar resposta do servidor ao mover pedido.');
          setOrders(originalOrders); // Rollback on error
          setTimeout(() => setError(null), 5000);
          return; // Exit if JSON parsing fails
        }
        throw new Error(errorData.error || 'Erro ao atualizar status do pedido');
      }

      setSuccess('Status do pedido atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão ao atualizar status do pedido');
      setOrders(originalOrders); // Rollback on error
      setTimeout(() => setError(null), 5000);
    }
  };

  // Dynamic products from external APIs
  const [flavors, setFlavors] = useState<SkewerFlavor[]>([]);
  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'local' | 'external'>('local');

  useEffect(() => {
    loadData();
  }, []);

  const forceRefreshData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, trigger revalidation to force fresh data from external APIs
      const revalidateResponse = await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: ['external-inventory', 'external-products', 'external-orders'],
          forceSync: true // Flag to force complete sync
        })
      });

      if (!revalidateResponse.ok) {
        console.warn('Revalidation failed, but continuing with data fetch');
      }

      // Then fetch the fresh data
      await loadData();
      
      setSuccess('Dados atualizados com sucesso da API externa!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error force refreshing data:', err);
      setError('Erro ao forçar atualização dos dados');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

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
      } else {
        console.error('app/page: Failed to fetch orders:', ordersRes.status, ordersRes.statusText);
      }

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setInventory(inventoryData);
        
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setFlavors(productsData.flavors && productsData.flavors.length > 0 ? productsData.flavors : ['Carne', 'Frango', 'Queijo', 'Calabresa']);
        setBeverages(productsData.beverages && productsData.beverages.length > 0 ? productsData.beverages : ['Coca-Cola', 'Guaraná', 'Água', 'Suco']);
        setLastSync(productsData.lastSyncFormatted ? new Date(productsData.lastSyncFormatted) : null);
        setDataSource(productsData.dataSource || 'local');
      } else {
        // Fallback products if API fails
        setFlavors(['Carne', 'Frango', 'Queijo', 'Calabresa']);
        setBeverages(['Coca-Cola', 'Guaraná', 'Água', 'Suco']);
      }
    } catch (err) {
      setError('Erro ao carregar dados');
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
    <div className="container-fluid py-4">
      <Row className="mb-4">
        <Col>
          <h1>Painel de Pedidos</h1>
        </Col>
      </Row>

      {success && <Alert color="success" fade timeout={150}>{success}</Alert>}
      {error && <Alert color="danger" fade timeout={150}>{error}</Alert>}

      <Row className="mb-4">
        <Col lg="8">
          <InventoryPanel
            inventory={inventory}
            onOpenUpdateModal={openUpdateInventoryModal}
            onRefreshData={forceRefreshData}
            lastSync={lastSync}
            dataSource={dataSource}
            loading={loading}
          />
        </Col>
        <Col lg="4" className="d-flex align-items-end justify-content-end">
          <Button color="primary" onClick={openCreateOrderModal}>
            <Icon icon="mdi:plus" className="me-2" />
            Novo Pedido
          </Button>
        </Col>
      </Row>

      <KanbanBoard
        orders={orders}
        onOrderDrop={handleOrderDrop}
        onOpenEditOrderModal={openEditOrderModal}
        onOpenDeleteConfirmModal={openDeleteConfirmModal}
      />

      <OrderModal
        isOpen={orderModalOpen}
        toggle={() => setOrderModalOpen(false)} // Changed to directly close the modal
        order={orderToEdit}
        flavors={flavors}
        beverages={beverages}
        inventory={inventory}
        onOrderSaved={closeOrderModal} // This callback will handle post-save actions including closing
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmModalOpen}
        toggle={closeDeleteConfirmModal}
        onConfirm={handleDeleteOrderConfirm}
        title="Excluir Pedido"
        message={`Tem certeza que deseja excluir o pedido de ${orderToDelete?.customerName || ''}?`}
      />

      <UpdateInventoryModal
        isOpen={updateInventoryModalOpen}
        toggle={closeUpdateInventoryModal}
        inventory={inventory}
        onInventoryUpdated={loadData}
      />
    </div>
  );
}