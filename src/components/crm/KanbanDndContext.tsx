import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  MeasuringStrategy,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Client, FunnelStage, FUNNEL_STAGES } from '@/types/client';
import { useClients } from '@/contexts/ClientContext';

interface KanbanDndContextType {
  activeId: UniqueIdentifier | null;
  activeClient: Client | null;
  overId: UniqueIdentifier | null;
  overStage: FunnelStage | null;
}

const KanbanDndCtx = createContext<KanbanDndContextType>({
  activeId: null,
  activeClient: null,
  overId: null,
  overStage: null,
});

export function useKanbanDnd() {
  return useContext(KanbanDndCtx);
}

interface KanbanDndProviderProps {
  children: React.ReactNode;
  clientsByStage: Record<FunnelStage, Client[]>;
  onReorder: (clientId: string, targetClientId: string | null, stage: FunnelStage, insertBefore: boolean) => void;
  onMoveToStage: (clientId: string, stage: FunnelStage, position?: number) => void;
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
  const [overStage, setOverStage] = useState<FunnelStage | null>(null);
  
  // Track if drag is in progress to prevent interference
  const isDraggingRef = useRef(false);

  // Configure sensors for better cross-browser support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find client by ID
  const findClient = useCallback((id: UniqueIdentifier): Client | null => {
    for (const stage of FUNNEL_STAGES) {
      const client = clientsByStage[stage]?.find(c => c.id === id);
      if (client) return client;
    }
    return null;
  }, [clientsByStage]);

  // Find stage by client ID
  const findStage = useCallback((id: UniqueIdentifier): FunnelStage | null => {
    for (const stage of FUNNEL_STAGES) {
      const client = clientsByStage[stage]?.find(c => c.id === id);
      if (client) return stage;
    }
    return null;
  }, [clientsByStage]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    isDraggingRef.current = true;
    setActiveId(active.id);
    setActiveClient(findClient(active.id));
  }, [findClient]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (!over) {
      setOverId(null);
      setOverStage(null);
      return;
    }

    const overId = over.id;
    setOverId(overId);

    // Check if over a stage (column)
    if (FUNNEL_STAGES.includes(overId as FunnelStage)) {
      setOverStage(overId as FunnelStage);
    } else {
      // Over a client - find its stage
      const stage = findStage(overId);
      setOverStage(stage);
    }
  }, [findStage]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    isDraggingRef.current = false;
    setActiveId(null);
    setActiveClient(null);
    setOverId(null);
    setOverStage(null);

    if (!over) return;

    const activeClientId = active.id as string;
    const overId = over.id;
    
    // Find the source stage
    const sourceStage = findStage(activeClientId);
    if (!sourceStage) return;

    // Check if dropping on a stage (column)
    if (FUNNEL_STAGES.includes(overId as FunnelStage)) {
      const targetStage = overId as FunnelStage;
      if (targetStage !== sourceStage) {
        // Move to different stage at the end
        onMoveToStage(activeClientId, targetStage);
      }
      return;
    }

    // Dropping on a client
    const targetClientId = overId as string;
    const targetStage = findStage(targetClientId);
    
    if (!targetStage) return;
    
    if (activeClientId === targetClientId) return;

    if (sourceStage === targetStage) {
      // Same stage - reorder
      const stageClients = clientsByStage[sourceStage];
      const activeIndex = stageClients.findIndex(c => c.id === activeClientId);
      const overIndex = stageClients.findIndex(c => c.id === targetClientId);
      
      if (activeIndex !== overIndex) {
        const insertBefore = activeIndex > overIndex;
        onReorder(activeClientId, targetClientId, sourceStage, insertBefore);
      }
    } else {
      // Different stage - move to position
      const targetClients = clientsByStage[targetStage];
      const overIndex = targetClients.findIndex(c => c.id === targetClientId);
      onMoveToStage(activeClientId, targetStage, overIndex);
    }
  }, [findStage, clientsByStage, onReorder, onMoveToStage]);

  const handleDragCancel = useCallback(() => {
    isDraggingRef.current = false;
    setActiveId(null);
    setActiveClient(null);
    setOverId(null);
    setOverStage(null);
  }, []);

  return (
    <KanbanDndCtx.Provider value={{ activeId, activeClient, overId, overStage }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
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
