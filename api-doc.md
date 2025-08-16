Aqui está a versão em **Markdown**, organizada com clareza para que seu programador entenda a integração entre as APIs internas e externas, incluindo detalhes sobre segurança, cache, formatação, idempotência e práticas recomendadas.

---

````markdown
# Integração Interna ⇄ Externa (Pedidos & Estoque)

## 1. Endpoints Externos

- **WEBHOOK_URL** → *Inbound* (somente leitura): envia snapshots de pedidos.
  ```json
  [
    { "row_number": 2, "Cliente": "Jose", "Itens": "coração x 1 / carne x 1", "Situação": "Em preparo" },
    { "row_number": 3, "Cliente": "otávio teste", "Itens": "queijo x 1", "Situação": "todo" }
  ]
````

**Ação interna:** parse + normalização + atualizar cache de pedidos.

* **EXTERNAL\_ORDER\_UPDATE\_URL / EXTERNAL\_ORDERS\_URL** → *Outbound*: criação/atualização de pedidos.

  ```json
  {
    "event": "order.updated",
    "timestamp": "2025-08-16T15:04:53.456Z",
    "data": {
      "order": {
        "id": "3",
        "customerName": "otávio teste",
        "items": [...],
        "status": "em_preparo",
        "createdAt": "2025-08-16T15:01:11.321Z",
        "totalItems": 2,
        "deliveredItems": 0
      }
    },
    "metadata": { "source": "jn-burger-backoffice", "version": "1.0.0" }
  }
  ```

  **Ação interna:** enviar payload ao mover ou editar pedido.

* **EXTERNAL\_INVENTORY\_UPDATE\_URL** → *Outbound*: envio do estado completo do estoque.

  ```json
  [
    { "Espetinhos": "Carne", "Estoque": 41 },
    { "Espetinhos": "Frango", "Estoque": 0 },
    ...
  ]
  ```

  **Ação interna:** ao atualizar estoque, enviar e atualizar cache.

---

## 2. Parsing & Normalização (Inbound)

* **Itens**: transformar string `"coração x 1 / carne x 1"` em array tipado:

  ```ts
  {
    id,
    type: "skewer",
    flavor: "coração",
    qty: 1,
    deliveredQty?: 0
  }
  ```

  * Separar por `/`, depois `" x "`.
  * Corrigir typos conhecidos (ex.: `"Quejio"` → `"Queijo"`).
  * Normalizar flavor para *lowercase* key, manter acento na exibição.

* **Situação** → status interno:

  * `"todo"` ou `"A fazer"` → `todo`
  * `"Em preparo"` / `"em_preparo"` → `in_progress`
  * `"Pronto"` / `"Entregue"` → `done`

* **Cliente**: trim, normalizar caixa, acentos preservados só para visual.

* **Item status**: cada item possui `status: 'todo' | 'in_progress' | 'done' | 'canceled'`, derivado de `deliveredQty`.

---

## 3. Cache Interno (Fonte de Verdade UI)

* **Armazenar**:

  * `orders::<orderId>` + `orders::list` (index por status)
  * `inventory::byFlavor` + `inventory::list`

* **Atualizar/reindexar**:

  * Ao **inbound webhook**: upsert + reindex.
  * Ao **sucesso outbound**: aplicar mesmo upsert (confirmação otimista).

* **GET interno**: adicionar `ETag` ou `Last-Modified` para revalidação eficiente.

---

## 4. Confiabilidade e Idempotência

* Webhooks podem ser duplicados/out-of-order → tratar idempotência por `hash(source, order.id, updatedAt)`.

* **Idempotency-Key (HTTP)** para outbound (POST/PATCH):

  * Use UUID único. ([IETF Draft 2025](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header-06)) ([adyen.medium.com][1], [IETF Datatracker][2])
  * Permite retries sem duplicação.

* Retry com mesma key até sucesso ou erro definitivo.

---

## 5. Segurança de Webhooks (Inbound)

* **Verificação HMAC** para garantir integridade/autenticidade:

  * Ex.: GitHub usa `X-Hub-Signature-256` com HMAC-SHA256. ([go.outseta.com][3], [GitHub Docs][4])
  * Calcule HMAC do corpo raw com a chave secreta e compare com header.

---

## 6. Regras de UI/Semântica

* **Arrastar card** → status do pedido muda (PATCH outbound, otimista, rollback em erro).
* **Entregar item** → aumenta `deliveredQty`; `status = done` se entrega completa.
* **Toasts**: feedback não crítico (requisito: react-hot-toast).
* **Modais**: ações destrutivas (excluir) ou erros críticos.
* **Correções de typos** em estoque com dicionário.

---

## 7. Convenções de Status

| Externo (WEBHOOK\_URL)   | Interno (Pedido) | Interno (Item)                  |
| ------------------------ | ---------------- | ------------------------------- |
| todo / A fazer           | `todo`           | `todo` (padrão)                 |
| Em preparo / em\_preparo | `in_progress`    | `in_progress`                   |
| Pronto / Entregue        | `done`           | `done` se `deliveredQty == qty` |
| Cancelado (se houver)    | `canceled`       | `canceled`                      |

---

## 8. Esqueleto de Código

```ts
// Webhook inbound handler
async function onWebhook(req) {
  verifyHMAC(req); // 401 se inválido
  const arr = await req.json();
  for (const r of arr) {
    const items = parseItems(r.Itens);
    const status = mapStatus(r.Situação);
    const orderId = String(r.row_number);
    await upsertOrderCache({ id: orderId, customer: r.Cliente, items, status });
  }
  return new Response('ok');
}

// Outbound update (drag/edit)
async function updateOrder(order) {
  const body = { event: 'order.updated', timestamp: new Date().toISOString(), data: { order }, metadata: { source: 'jn-burger-backoffice', version: '1.0.0' } };
  const idempKey = makeIdempotencyKey(body);
  const res = await fetch(EXTERNAL_ORDER_UPDATE_URL, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempKey },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('failed');
  await upsertOrderCache(order);
}
```

---

Se quiser, posso transformar isso em um README para o repo ou checklist de testes (webhook duplicado, retry idempotente, correção de typo, etc.).

```
::contentReference[oaicite:30]{index=30}
```

[1]: https://adyen.medium.com/a-developers-guide-to-hmac-validation-for-adyen-webhooks-581dffb454a8?utm_source=chatgpt.com "A Developer's Guide to HMAC Validation for Adyen Webhooks"
[2]: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/?utm_source=chatgpt.com "The Idempotency-Key HTTP Header Field"
[3]: https://go.outseta.com/support/kb/articles/Rm85R5Q4/secure-and-verify-webhooks-with-a-sha256-signature?utm_source=chatgpt.com "Secure and verify webhooks with a SHA256 Signature"
[4]: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries?utm_source=chatgpt.com "Validating webhook deliveries"
