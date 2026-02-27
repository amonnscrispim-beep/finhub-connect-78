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
import { Client, FunnelStage, KANBAN_COLUMN_STAGES } from '@/types/client';

// All droppable IDs = the 6 kanban columns
const ALL_DROPPABLE_IDS: string[] = [...KANBAN_COLUMN_STAGES];

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
}

export function KanbanDndProvider({
  children,
  clientsByStage,
  onReorder,
  onMoveToStage,
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

  const findClient = useCallback((id: UniqueIdentifier): Client | null => {
    for (const key of Object.keys(clientsByStage)) {
      const client = clientsByStage[key]?.find(c => c.id === id);
      if (client) return client;
    }
    return null;
  }, [clientsByStage]);

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

    // Dropping on a droppable column
    if (isDroppableId(targetId)) {
      if (String(sourceBucket) !== String(targetId)) {
        onMoveToStage(activeClientId, targetId);
      }
      return;
    }

    // Dropping on a client card
    const targetBucket = findBucket(targetId);
    if (!targetBucket) return;
    if (activeClientId === targetId) return;

    if (sourceBucket === targetBucket) {
      // Reorder within same column
      const stageClients = clientsByStage[sourceBucket];
      const activeIndex = stageClients.findIndex(c => c.id === activeClientId);
      const overIndex = stageClients.findIndex(c => c.id === targetId);
      if (activeIndex !== overIndex) {
        onReorder(activeClientId, targetId, sourceBucket, activeIndex > overIndex);
      }
    } else {
      // Move to different column at position
      const targetClients = clientsByStage[targetBucket] || [];
      const overIndex = targetClients.findIndex(c => c.id === targetId);
      onMoveToStage(activeClientId, targetBucket, overIndex);
    }
  }, [findBucket, clientsByStage, onReorder, onMoveToStage]);

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
