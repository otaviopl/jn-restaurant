import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { Navbar, NavbarBrand, Nav, NavItem, Container } from 'reactstrap';
import Link from 'next/link';
import ToasterProvider from '@/components/ToasterProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JN Burger - Backoffice',
  description: 'Sistema de gerenciamento de pedidos e estoque',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ToasterProvider />
        <Navbar color="dark" dark expand="md" className="mb-4">
          <Container>
            <NavbarBrand href="/" className="fw-bold fs-4">
              🍔 JN Burger
            </NavbarBrand>
            <Nav className="ms-auto" navbar>
              <NavItem>
                <Link href="/" className="nav-link text-white">
                  Pedidos
                </Link>
              </NavItem>
              <NavItem>
                <Link href="/inventory" className="nav-link text-white">
                  Estoque
                </Link>
              </NavItem>
            </Nav>
          </Container>
        </Navbar>
        
        <Container fluid className="px-4">
          {children}
        </Container>
      </body>
    </html>
  );
}
