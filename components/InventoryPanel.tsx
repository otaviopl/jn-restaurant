'use client';

import React, { useEffect, useState } from 'react';
import { Progress } from 'reactstrap';

interface InventoryItem { flavor: string; quantity: number; }

export default function InventoryPanel() {
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetch('/api/inventory')
      .then(res => res.json())
      .then((data: InventoryItem[]) => {
        const sorted = [...data].sort((a, b) => a.quantity - b.quantity);
        setItems(sorted);
      })
      .catch(() => {});
  }, []);

  const getColor = (qty: number) => {
    if (qty === 0) return 'danger';
    if (qty < 10) return 'warning';
    return 'success';
  };

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.flavor}>
          <div className="flex justify-between text-sm mb-1">
            <span>{item.flavor}</span>
            <span>{item.quantity}</span>
          </div>
          <Progress value={item.quantity} max={100} color={getColor(item.quantity)} />
        </div>
      ))}
    </div>
  );
}
