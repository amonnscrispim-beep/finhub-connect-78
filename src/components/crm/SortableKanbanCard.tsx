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
    isSorting,
  } = useSortable({
    id: client.id,
    disabled,
    // Ensure smooth animations
    transition: {
      duration: 200,
      easing: 'ease',
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isSorting ? transition : undefined,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 100 : 'auto',
    // Prevent pointer events during drag for smoother experience
    pointerEvents: isDragging ? 'none' as const : 'auto' as const,
  };

  // Create drag handle props that will be passed to the child component
  const dragHandleProps = {
    ref: setActivatorNodeRef,
    ...attributes,
    ...listeners,
    // Prevent text selection during drag
    style: { 
      touchAction: 'none',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
    },
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging}
      data-sorting={isSorting}
      className={cn(
        'transition-transform duration-150',
        isOver && !isDragging && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background rounded-xl',
        isDragging && 'cursor-grabbing'
      )}
    >
      {React.isValidElement(children) 
        ? React.cloneElement(children as React.ReactElement<any>, {
            dragHandleProps,
            isDragging,
          })
        : children
      }
    </div>
  );
}
