'use client';

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
  onTableClick: (tableId: string) => void;
  onObjectClick: (objectId: string) => void;
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
}: FloorPlanProps) {
  return (
    <div
      className="floor-plan relative overflow-auto bg-gray-100 rounded-lg"
      style={{
        width: '100%',
        height: 'calc(100vh - 200px)',
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
            selectedGuestId={selectedGuestId}
            selectedSeatInfo={selectedSeatInfo}
          />
        ))}
      </div>
    </div>
  );
}
