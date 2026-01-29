import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FunnelStage } from '@/types/client';
import { cn } from '@/lib/utils';
import { useKanbanDnd } from './KanbanDndContext';

interface DroppableColumnProps {
  stage: FunnelStage;
  clientIds: string[];
  children: React.ReactNode;
}

export function DroppableColumn({ stage, clientIds, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });
  
  const { overStage, activeId } = useKanbanDnd();
  const isTargeted = overStage === stage && activeId !== null;

  return (
    <SortableContext items={clientIds} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={cn(
          'space-y-3 min-h-[200px] transition-all duration-200',
          isTargeted && 'bg-primary/5 rounded-lg p-2 -m-2'
        )}
      >
        {children}
      </div>
    </SortableContext>
  );
}
