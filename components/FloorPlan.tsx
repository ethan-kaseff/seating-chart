'use client';

import { useEffect, useRef } from 'react';
import { SeatingData } from '@/types';
import Table from './Table';
import VenueObject from './VenueObject';

interface FloorPlanProps {
  data: SeatingData;
  selectedGuestId: string | null;
  selectedSeatInfo: { tableId: string; seatIndex: number } | null;
  onTableDrag: (id: string, x: number, y: number) => void;
  onObjectDrag: (id: string, x: number, y: number) => void;
  onSeatClick: (tableId: string, seatIndex: number, guestId: string | null) => void;
  onTableClick: (tableId: string, e?: React.MouseEvent | MouseEvent) => void;
  onObjectClick: (objectId: string, e?: React.MouseEvent | MouseEvent) => void;
  selectedTableIds?: Set<string>;
  selectedObjectIds?: Set<string>;
  onZoomChange?: (zoom: number) => void;
  onObjectResize?: (id: string, width: number, height: number) => void;
  onGuestDrop?: (guestId: string, tableId: string, seatIndex: number) => void;
  snapToGrid?: boolean;
  gridSize?: number;
}

export default function FloorPlan({
  data,
  selectedGuestId,
  selectedSeatInfo,
  onTableDrag,
  onObjectDrag,
  onSeatClick,
  onTableClick,
  onObjectClick,
  onZoomChange,
  onObjectResize,
  onGuestDrop,
  selectedTableIds,
  selectedObjectIds,
  snapToGrid,
  gridSize,
}: FloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Ctrl+wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onZoomChange) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.5, Math.min(2, data.zoom + delta));
      onZoomChange(newZoom);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [data.zoom, onZoomChange]);

  return (
    <div
      ref={containerRef}
      className="floor-plan relative overflow-auto bg-gray-100 rounded-lg"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <div
        className="relative"
        style={{
          width: data.floorSize.width * data.zoom,
          height: data.floorSize.height * data.zoom,
          transform: `scale(${data.zoom})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Venue objects */}
        {data.objects.map((object) => (
          <VenueObject
            key={object.id}
            object={object}
            zoom={data.zoom}
            onDragEnd={onObjectDrag}
            onClick={onObjectClick}
            onResize={onObjectResize}
            isSelected={selectedObjectIds?.has(object.id)}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
          />
        ))}

        {/* Tables */}
        {data.tables.map((table) => (
          <Table
            key={table.id}
            table={table}
            guests={data.guests}
            zoom={data.zoom}
            onDragEnd={onTableDrag}
            onSeatClick={onSeatClick}
            onTableClick={onTableClick}
            onGuestDrop={onGuestDrop}
            selectedGuestId={selectedGuestId}
            selectedSeatInfo={selectedSeatInfo}
            isMultiSelected={selectedTableIds?.has(table.id)}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
          />
        ))}
      </div>
    </div>
  );
}
