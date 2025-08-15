# 🍔 JN Burger - Backoffice

Sistema de gerenciamento de pedidos e estoque para espetinhos e bebidas, desenvolvido com **Next.js 14** e **TypeScript**.

## ✨ Funcionalidades

### 📋 Gestão de Pedidos
- ✅ Formulário dinâmico para criação de pedidos
- ✅ Seleção de espetinhos (Carne, Frango, Queijo, Calabresa) e bebidas
- ✅ Validação automática de estoque
- ✅ Controle de entrega por item
- ✅ Status visual dos pedidos (Em Preparo / Entregue)

### 📦 Controle de Estoque
- ✅ Visualização em tempo real do estoque
- ✅ Edição manual das quantidades
- ✅ Alertas visuais para baixo estoque
- ✅ Ações rápidas (reabastecer, estoque mínimo)
- ✅ Decremento automático ao criar pedidos

### 🎨 Interface
- ✅ Design moderno com Bootstrap + Reactstrap
- ✅ Layout responsivo e intuitivo
- ✅ Cores e badges para status visuais
- ✅ Navegação simples entre páginas

## 🚀 Como Executar

### Pré-requisitos
- **Node.js** 18+ 
- **pnpm** (gerenciador de pacotes)

### Instalação

1. **Clone ou extraia o projeto**
   ```bash
   cd kn-buurger-backoffice
   ```

2. **Instale as dependências**
   ```bash
   pnpm install
   ```

3. **Configure variáveis de ambiente (opcional)**
   ```bash
   cp env.example .env.local
   ```
   
   Edite `.env.local` com suas configurações:
   ```bash
   WEBHOOK_URL=https://seu-webhook.exemplo.com/api/webhook
   WEBHOOK_SECRET=sua-chave-secreta-aqui
   WEBHOOK_TIMEOUT=5000
   ```

4. **Execute o servidor de desenvolvimento**
   ```bash
   pnpm dev
   ```

5. **Acesse o sistema**
   ```
   http://localhost:3000
   ```

### Deploy na Vercel

1. **Build do projeto**
   ```bash
   pnpm build
   ```

2. **Deploy automático**
   - Conecte seu repositório Git à Vercel
   - O deploy será automático a cada push na branch principal

## 📁 Estrutura do Projeto

```
├── app/
│   ├── api/
│   │   ├── inventory/route.ts      # API do estoque
│   │   ├── orders/
│   │   │   ├── route.ts            # API de pedidos
│   │   │   └── [orderId]/items/[itemId]/route.ts
│   │   └── webhook/
│   │       └── test/route.ts       # Endpoint para testar webhooks
│   ├── inventory/
│   │   └── page.tsx                # Página de gestão de estoque
│   ├── layout.tsx                  # Layout principal com navegação
│   ├── page.tsx                    # Página principal (pedidos)
│   └── globals.css                 # Estilos customizados
├── lib/
│   ├── store.ts                    # Estado em memória e lógica de negócio
│   └── webhook.ts                  # Utilitários para envio de webhooks
├── package.json                    # Dependências e scripts
├── tsconfig.json                   # Configuração TypeScript
├── env.example                     # Exemplo de variáveis de ambiente
└── README.md                       # Este arquivo
```

## 🛠️ Tecnologias Utilizadas

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **UI**: Bootstrap 5 + Reactstrap
- **Ícones**: Iconify React
- **Estado**: Memória local (lib/store.ts)
- **Gerenciador**: pnpm

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev

# Build de produção
pnpm build

# Executar build
pnpm start

# Linting
pnpm lint
```

## 📊 Estado da Aplicação

O sistema utiliza **estado em memória** para simplicidade do MVP:

- **Estoque inicial**: 20 unidades por sabor
- **Pedidos**: Armazenados em array local
- **Persistência**: Reinicia a cada reload do servidor

### Migração Futura para Banco de Dados

A estrutura está preparada para migração:
- Types definidos em `lib/store.ts`
- APIs REST já estruturadas
- Separação clara entre UI e lógica de negócio

## 🔗 Integração com APIs Externas

O sistema usa uma abordagem **híbrida** para máxima confiabilidade:

### 📤 Webhooks Enviados (Outbound)

- **`order.created`**: Disparado quando um novo pedido é criado
- **`order.updated`**: Disparado quando um pedido é atualizado (entrega de itens)
- **`inventory.updated`**: Disparado quando o estoque é modificado

### 📥 APIs Externas com Cache (Inbound)

- **GET endpoints** para buscar dados externos
- **Cache automático** com revalidação (5 minutos padrão)
- **Fallback local** quando API externa indisponível
- **Revalidação manual** via interface ou API

### Configuração

Configure as variáveis de ambiente no arquivo `.env.local`:

```bash
# 📤 Webhook Configuration (Envio)
WEBHOOK_URL=https://seu-sistema.com/webhook
WEBHOOK_SECRET=sua-chave-secreta
WEBHOOK_TIMEOUT=5000

# 📥 External Data APIs (GET endpoints com cache)
EXTERNAL_INVENTORY_URL=https://api.sistema-externo.com/inventory
EXTERNAL_PRODUCTS_URL=https://api.sistema-externo.com/products
EXTERNAL_API_KEY=sua-api-key-aqui

# 🗂️ Webhook Receiver (Legacy - opcional)
WEBHOOK_RECEIVE_SECRET=chave-secreta-para-receber
```

### 📤 Payload de Webhook Enviado

Exemplo de payload enviado:

```json
{
  "event": "order.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "order": {
      "id": "abc123",
      "customerName": "João Silva",
      "items": [...],
      "status": "em_preparo",
      "totalItems": 5,
      "deliveredItems": 0
    }
  },
  "metadata": {
    "source": "jn-burger-backoffice",
    "version": "1.0.0"
  }
}
```

### 📥 APIs Externas Esperadas

**Endpoint de Estoque:**
```bash
GET ${EXTERNAL_INVENTORY_URL}
Authorization: Bearer ${EXTERNAL_API_KEY}

Response:
[
  {
    "row_number": 2,
    "Espetinhos": "Carne",
    "Quantidade Inicial": 45,
    "Estoque": 45
  },
  {
    "row_number": 3,
    "Espetinhos": "Misto",
    "Quantidade Inicial": 30,
    "Estoque": 30
  },
  {
    "row_number": 4,
    "Espetinhos": "Coração",
    "Quantidade Inicial": 25,
    "Estoque": 25
  }
]
```

**Mapeamento de Sabores:**
- `Carne` → `Carne`
- `Frango` → `Frango`
- `Queijo` → `Queijo`
- `Calabresa` → `Calabresa`
- `Misto` → `Carne` (agrupado)
- `Coração` → `Frango` (agrupado)
- Sabores desconhecidos são ignorados com warning

**Processamento dos Dados:**
- **Agrupamento**: Múltiplos itens externos podem ser somados em um sabor interno
- **Quantidade Inicial**: Campo `"Quantidade Inicial"` da API externa
- **Estoque Atual**: Campo `"Estoque"` da API externa
- **Logs**: Sistema registra mapeamentos e avisos no console
- **Cache**: Dados ficam cached por 5 minutos, 30s no modo realtime

**Endpoint de Produtos (Opcional):**
```bash
GET ${EXTERNAL_PRODUCTS_URL}
Authorization: Bearer ${EXTERNAL_API_KEY}

Response:
{
  "skewerFlavors": ["Carne", "Frango", "Queijo", "Calabresa"],
  "beverages": ["Coca-Cola", "Guaraná", "Água", "Suco"],
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "source": "external-system"
}
```

**Fallbacks Inteligentes:**
- Se `EXTERNAL_PRODUCTS_URL` não configurado → extrai sabores do inventário
- Se API externa falhar → usa dados locais automaticamente
- Se sabor desconhecido → ignora com warning (não quebra o sistema)
- Bebidas sempre usam padrão: Coca-Cola, Guaraná, Água, Suco

### ⚡ Cache e Performance

- **Cache padrão**: 5 minutos (300 segundos)
- **Cache tempo real**: 30 segundos (`/api/inventory/realtime`)
- **Fallback automático** para dados locais
- **Revalidação manual** via botão na interface

### 🧪 Testes e Endpoints

**📤 Testar Webhooks de Envio:**
```bash
# Verificar configuração
GET /api/webhook/test

# Enviar webhook de teste
POST /api/webhook/test
{
  "event": "test.event",
  "testData": { "message": "Teste" }
}
```

**📥 Testar APIs Externas:**
```bash
# Buscar estoque (com cache)
GET /api/inventory

# Buscar estoque em tempo real (cache 30s)
GET /api/inventory/realtime

# Buscar produtos (com cache)
GET /api/products

# Revalidação manual
POST /api/revalidate
{
  "tags": ["external-inventory", "external-products"]
}
```

**🔍 Monitoramento:**
```bash
# Headers de resposta incluem:
X-Data-Source: external | local
X-Cache-Status: fresh | stale | fallback | error-fallback
```

### Autenticação

- **Header `X-Webhook-Secret`**: Contém a chave secreta configurada
- **Header `X-Webhook-Signature`**: HMAC SHA-256 do payload para verificação

## 🎯 Próximos Passos

- [ ] Integração com banco de dados (MongoDB/PostgreSQL)
- [ ] Autenticação de usuários
- [ ] Relatórios de vendas
- [ ] Notificações em tempo real
- [ ] App mobile para clientes

## 📞 Suporte

Para dúvidas ou sugestões, abra uma issue no repositório.

---

**JN Burger Backoffice** - Sistema desenvolvido para otimizar o gerenciamento de pedidos de espetinhos! 🍢
