import React from 'react';
import { Badge } from 'reactstrap';
import { ItemStatus } from '@/types/order';
import { statusColorMap } from '@/styles/tokens';

interface ItemStatusBadgeProps {
  status: ItemStatus;
}

const statusTextMap: Record<ItemStatus, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Preparo',
  done: 'Pronto',
  canceled: 'Cancelado',
};

const ItemStatusBadge: React.FC<ItemStatusBadgeProps> = ({ status }) => {
  const className = statusColorMap[status];
  const text = statusTextMap[status];

  return (
    <Badge className={`px-2 py-1 rounded-full text-xs font-semibold ${className}`}>
      {text}
    </Badge>
  );
};

export default ItemStatusBadge;