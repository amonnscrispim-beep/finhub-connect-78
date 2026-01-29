import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Client } from '@/types/client';
import { cn } from '@/lib/utils';

interface SortableKanbanCardProps {
  client: Client;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SortableKanbanCard({ client, children, disabled }: SortableKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: client.id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-all duration-150',
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {React.cloneElement(children as React.ReactElement, {
        dragHandleProps: {
          ref: setActivatorNodeRef,
          ...attributes,
          ...listeners,
        },
        isDragging,
      })}
    </div>
  );
}
