'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, NavbarBrand, Nav, NavItem, Button, Badge } from 'reactstrap';
import { Icon } from '@iconify/react';

interface HeaderProps {
  totalOrders?: number;
  pendingOrders?: number;
  onRefreshData?: () => void;
  loading?: boolean;
  onOpenCreateOrderModal?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  totalOrders = 0, 
  pendingOrders = 0, 
  onRefreshData,
  loading = false,
  onOpenCreateOrderModal 
}) => {
  const pathname = usePathname();
  return (
    <>
    <nav 
      className="navbar navbar-expand-lg"
      style={{
        backgroundColor: '#7367f0',
        boxShadow: '0 4px 24px 0 rgba(34, 41, 47, 0.1)',
        padding: '1rem 1.5rem'
      }}
    >
      <div className="container-fluid">
        {/* Left side - Brand & Navigation */}
        <div className="d-flex align-items-center">
          <div 
            className="d-flex align-items-center justify-content-center me-3"
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              color: 'white'
            }}
          >
            <Icon icon="mdi:hamburger" width="20" height="20" />
          </div>
          <div className="me-4">
            <h5 className="mb-0 text-white fw-bold">🍔 JN Burger</h5>
            <small style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.75rem' }}>
              Sistema de Pedidos
            </small>
          </div>
          
          {/* Navigation Links */}
          <nav className="d-flex gap-1">
            <a 
              href="/"
              className="nav-link px-3 py-2 rounded text-decoration-none d-flex align-items-center"
              style={{
                color: 'white',
                backgroundColor: pathname === '/' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = pathname === '/' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <Icon icon="mdi:view-dashboard" className="me-2" width="16" />
              Pedidos
            </a>
            <a 
              href="/inventory"
              className="nav-link px-3 py-2 rounded text-decoration-none d-flex align-items-center"
              style={{
                color: pathname === '/inventory' ? 'white' : 'rgba(255, 255, 255, 0.8)',
                backgroundColor: pathname === '/inventory' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = pathname === '/inventory' ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
                e.currentTarget.style.color = pathname === '/inventory' ? 'white' : 'rgba(255, 255, 255, 0.8)';
              }}
            >
              <Icon icon="mdi:package-variant" className="me-2" width="16" />
              Estoque
            </a>
          </nav>
        </div>

        {/* Right side - Stats, Actions & User */}
        <div className="d-flex align-items-center gap-3">
          {/* Stats Cards */}
          <div className="d-flex gap-2">
            <div 
              className="d-flex align-items-center px-3 py-2"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                minWidth: '80px'
              }}
            >
              <Icon 
                icon="mdi:clipboard-text-outline" 
                width="16" 
                className="me-2" 
                style={{ color: 'white' }}
              />
              <div>
                <div className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>
                  {totalOrders}
                </div>
                <small style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.7rem' }}>
                  Total
                </small>
              </div>
            </div>

            <div 
              className="d-flex align-items-center px-3 py-2"
              style={{
                backgroundColor: 'rgba(255, 183, 77, 0.2)',
                border: '1px solid rgba(255, 183, 77, 0.3)',
                borderRadius: '8px',
                minWidth: '90px'
              }}
            >
              <Icon 
                icon="mdi:clock-outline" 
                width="16" 
                className="me-2" 
                style={{ color: '#ffb74d' }}
              />
              <div>
                <div className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>
                  {pendingOrders}
                </div>
                <small style={{ color: '#ffb74d', fontSize: '0.7rem' }}>
                  Pendentes
                </small>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={onRefreshData}
            disabled={loading}
            style={{
              backgroundColor: loading ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: '500',
              fontSize: '0.875rem',
              color: 'white',
              backdropFilter: 'blur(4px)'
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
                Atualizar Sistema
              </>
            )}
          </Button>

          {/* User Avatar */}
          <div 
            className="d-flex align-items-center justify-content-center"
            style={{
              width: '38px',
              height: '38px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            <Icon icon="mdi:account" width="18" height="18" />
          </div>
        </div>
      </div>
    </nav>
    
    {/* Action Section with Helper Text */}
    <div 
      className="bg-white border-bottom"
      style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid rgba(76, 78, 100, 0.12)',
        boxShadow: '0 2px 4px 0 rgba(34, 41, 47, 0.04)'
      }}
    >
              <div className="container-fluid">
          <div className="row align-items-center mobile-header-actions">
          {/* Helper Text Section */}
          <div className="col-md-8">
            <div className="d-flex align-items-start">
              <div 
                className="me-3 mt-1"
                style={{
                  width: '6px',
                  height: '40px',
                  backgroundColor: '#7367f0',
                  borderRadius: '3px'
                }}
              />
              <div>
                {pathname === '/' ? (
                  <>
                    <h6 className="mb-1 fw-semibold" style={{ color: '#4c4e64', fontSize: '0.95rem' }}>
                      Gerenciamento de Pedidos
                    </h6>
                    <p className="mb-2 text-muted" style={{ fontSize: '0.825rem', lineHeight: '1.4' }}>
                      Crie novos pedidos ou sincronize dados com a API externa. 
                      Use o <strong>Kanban</strong> para arrastar pedidos entre status.
                    </p>
                    <div className="d-flex align-items-center gap-3">
                      <small className="d-flex align-items-center text-muted">
                        <Icon icon="mdi:information-outline" className="me-1" width="14" />
                        Dados são sincronizados automaticamente
                      </small>
                      <small className="d-flex align-items-center text-muted">
                        <Icon icon="mdi:drag" className="me-1" width="14" />
                        Arraste cards para mudar status
                      </small>
                    </div>
                  </>
                ) : (
                  <>
                    <h6 className="mb-1 fw-semibold" style={{ color: '#4c4e64', fontSize: '0.95rem' }}>
                      Controle de Estoque
                    </h6>
                    <p className="mb-2 text-muted" style={{ fontSize: '0.825rem', lineHeight: '1.4' }}>
                      Monitore e atualize as quantidades em estoque. 
                      Dados são sincronizados com a <strong>API externa</strong> automaticamente.
                    </p>
                    <div className="d-flex align-items-center gap-3">
                      <small className="d-flex align-items-center text-muted">
                        <Icon icon="mdi:information-outline" className="me-1" width="14" />
                        Alertas para estoque baixo
                      </small>
                      <small className="d-flex align-items-center text-muted">
                        <Icon icon="mdi:sync" className="me-1" width="14" />
                        Sincronização em tempo real
                      </small>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="col-md-4 text-end">
            <div className="d-flex gap-2 justify-content-end">
              <Button
                onClick={onRefreshData}
                disabled={loading}
                color="light"
                className="d-flex align-items-center"
                style={{
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  border: '1px solid rgba(76, 78, 100, 0.2)',
                  color: '#6d6f85',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 4px 0 rgba(34, 41, 47, 0.08)'
                }}
              >
                {loading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status" style={{ width: '14px', height: '14px' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:refresh" className="me-2" width="16" />
                    {pathname === '/' ? 'Atualizar Dados' : 'Atualizar Estoque'}
                  </>
                )}
              </Button>
              
              {pathname === '/' && (
                <Button
                  onClick={onOpenCreateOrderModal}
                  style={{
                    borderRadius: '6px',
                    padding: '8px 20px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7367f0 0%, #9e95f5 100%)',
                    color: '#ffffff',
                    boxShadow: '0 3px 8px 0 rgba(115, 103, 240, 0.4)'
                  }}
                >
                  <Icon icon="mdi:plus" className="me-2" width="16" />
                  Novo Pedido
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Header;
