'use client';

import React from 'react';
import { ItemStatus } from '@/types/order';
import { STATUS_COLORS } from '@/styles/tokens';

export default function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const colors = STATUS_COLORS[status];
  const label = status.replace('_', ' ');
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}
      aria-label={`status-${status}`}
    >
      {label}
    </span>
  );
}
