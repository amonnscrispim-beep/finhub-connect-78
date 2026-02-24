import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  MeasuringStrategy,
  UniqueIdentifier,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Client, FunnelStage, FUNNEL_STAGES } from '@/types/client';

export const TOP10_BUCKET_ID = '__TOP10_PATRIMONIO__';

// All droppable IDs (stages + top10 bucket)
const ALL_DROPPABLE_IDS = [...FUNNEL_STAGES, TOP10_BUCKET_ID];

function isDroppableId(id: string): boolean {
  return ALL_DROPPABLE_IDS.includes(id);
}

interface KanbanDndContextType {
  activeId: UniqueIdentifier | null;
  activeClient: Client | null;
  overId: UniqueIdentifier | null;
  overStage: FunnelStage | string | null;
  isDragging: boolean;
}

const KanbanDndCtx = createContext<KanbanDndContextType>({
  activeId: null,
  activeClient: null,
  overId: null,
  overStage: null,
  isDragging: false,
});

export function useKanbanDnd() {
  return useContext(KanbanDndCtx);
}

interface KanbanDndProviderProps {
  children: React.ReactNode;
  clientsByStage: Record<string, Client[]>;
  onReorder: (clientId: string, targetClientId: string | null, stage: string, insertBefore: boolean) => void;
  onMoveToStage: (clientId: string, stage: string, position?: number) => void;
  onMoveToTop10: (clientId: string, position?: number) => void;
  onRemoveFromTop10: (clientId: string) => void;
  onReorderTop10: (clientId: string, targetClientId: string) => void;
}

export function KanbanDndProvider({
  children,
  clientsByStage,
  onReorder,
  onMoveToStage,
  onMoveToTop10,
  onRemoveFromTop10,
  onReorderTop10,
}: KanbanDndProviderProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [overStage, setOverStage] = useState<FunnelStage | string | null>(null);
  
  const isDraggingRef = useRef(false);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, mouseSensor, touchSensor, keyboardSensor);

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const cardCollisions = pointerCollisions.filter(
        collision => !isDroppableId(collision.id as string)
      );
      if (cardCollisions.length > 0) return cardCollisions;
    }
    return rectIntersection(args);
  }, []);

  // Find client across all buckets
  const findClient = useCallback((id: UniqueIdentifier): Client | null => {
    for (const key of Object.keys(clientsByStage)) {
      const client = clientsByStage[key]?.find(c => c.id === id);
      if (client) return client;
    }
    return null;
  }, [clientsByStage]);

  // Find which bucket/stage a client is in
  const findBucket = useCallback((id: UniqueIdentifier): string | null => {
    for (const key of Object.keys(clientsByStage)) {
      if (clientsByStage[key]?.find(c => c.id === id)) return key;
    }
    return null;
  }, [clientsByStage]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    isDraggingRef.current = true;
    setActiveId(event.active.id);
    setActiveClient(findClient(event.active.id));
  }, [findClient]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverId(null);
      setOverStage(null);
      return;
    }
    setOverId(over.id);
    if (isDroppableId(over.id as string)) {
      setOverStage(over.id as string);
    } else {
      setOverStage(findBucket(over.id));
    }
  }, [findBucket]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    isDraggingRef.current = false;
    setActiveId(null);
    setActiveClient(null);
    setOverId(null);
    setOverStage(null);

    if (!over) return;

    const activeClientId = active.id as string;
    const targetId = over.id as string;
    const sourceBucket = findBucket(activeClientId);
    if (!sourceBucket) return;

    const isSourceTop10 = sourceBucket === TOP10_BUCKET_ID;

    // Dropping on a droppable (column)
    if (isDroppableId(targetId)) {
      if (targetId === TOP10_BUCKET_ID) {
        if (!isSourceTop10) {
          onMoveToTop10(activeClientId);
        }
      } else {
        // Dropping on a funnel stage column
        const targetStage = targetId as FunnelStage;
        if (isSourceTop10) {
          // Remove from top10, the client keeps its real funnel_stage
          onRemoveFromTop10(activeClientId);
          // Only move if the client's real stage differs from target
          onMoveToStage(activeClientId, targetStage);
        } else if (String(sourceBucket) !== String(targetStage)) {
          onMoveToStage(activeClientId, targetStage);
        }
      }
      return;
    }

    // Dropping on a client card
    const targetBucket = findBucket(targetId);
    if (!targetBucket) return;
    if (activeClientId === targetId) return;

    const isTargetTop10 = targetBucket === TOP10_BUCKET_ID;

    if (isSourceTop10 && isTargetTop10) {
      // Reorder within Top 10
      onReorderTop10(activeClientId, targetId);
    } else if (!isSourceTop10 && isTargetTop10) {
      // Move into Top 10 at position
      const targetClients = clientsByStage[TOP10_BUCKET_ID] || [];
      const overIndex = targetClients.findIndex(c => c.id === targetId);
      onMoveToTop10(activeClientId, overIndex);
    } else if (isSourceTop10 && !isTargetTop10) {
      // Remove from top10 and move to target stage at position
      onRemoveFromTop10(activeClientId);
      const targetClients = clientsByStage[targetBucket] || [];
      const overIndex = targetClients.findIndex(c => c.id === targetId);
      onMoveToStage(activeClientId, targetBucket as FunnelStage, overIndex);
    } else {
      // Normal funnel stage reorder / move
      if (sourceBucket === targetBucket) {
        const stageClients = clientsByStage[sourceBucket];
        const activeIndex = stageClients.findIndex(c => c.id === activeClientId);
        const overIndex = stageClients.findIndex(c => c.id === targetId);
        if (activeIndex !== overIndex) {
          onReorder(activeClientId, targetId, sourceBucket, activeIndex > overIndex);
        }
      } else {
        const targetClients = clientsByStage[targetBucket] || [];
        const overIndex = targetClients.findIndex(c => c.id === targetId);
        onMoveToStage(activeClientId, targetBucket as FunnelStage, overIndex);
      }
    }
  }, [findBucket, clientsByStage, onReorder, onMoveToStage, onMoveToTop10, onRemoveFromTop10, onReorderTop10]);

  const handleDragCancel = useCallback(() => {
    isDraggingRef.current = false;
    setActiveId(null);
    setActiveClient(null);
    setOverId(null);
    setOverStage(null);
  }, []);

  return (
    <KanbanDndCtx.Provider value={{ activeId, activeClient, overId, overStage, isDragging: isDraggingRef.current }}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        {children}
      </DndContext>
    </KanbanDndCtx.Provider>
  );
}
