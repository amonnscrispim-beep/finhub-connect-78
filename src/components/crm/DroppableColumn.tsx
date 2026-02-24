import React, { useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FunnelStage } from '@/types/client';
import { cn } from '@/lib/utils';
import { useKanbanDnd } from './KanbanDndContext';

interface DroppableColumnProps {
  stage: string;
  clientIds: string[];
  children: React.ReactNode;
}

export function DroppableColumn({ stage, clientIds, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });
  
  const { overStage, activeId, isDragging } = useKanbanDnd();
  const isTargeted = overStage === stage && activeId !== null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  // Auto-scroll when dragging near edges of the column
  useEffect(() => {
    if (!isDragging || !scrollRef.current) {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const container = scrollRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scrollSpeed = 8;
      const edgeThreshold = 60;

      // Check if near top or bottom edge
      const distanceFromTop = e.clientY - rect.top;
      const distanceFromBottom = rect.bottom - e.clientY;

      if (distanceFromTop < edgeThreshold && container.scrollTop > 0) {
        container.scrollTop -= scrollSpeed;
      } else if (distanceFromBottom < edgeThreshold && container.scrollTop < container.scrollHeight - container.clientHeight) {
        container.scrollTop += scrollSpeed;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
      }
    };
  }, [isDragging]);

  return (
    <SortableContext items={clientIds} strategy={verticalListSortingStrategy}>
      <div
        ref={(node) => {
          setNodeRef(node);
          (scrollRef as any).current = node;
        }}
        className={cn(
          'space-y-3 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto transition-all duration-200 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
          isTargeted && 'bg-primary/5 rounded-lg p-2 -m-2'
        )}
      >
        {children}
      </div>
    </SortableContext>
  );
}
