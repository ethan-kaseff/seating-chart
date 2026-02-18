'use client';

import { Event, SeatingData } from '@/types';

interface ShareViewProps {
  event: Event;
}

const OBJECT_ICONS: Record<string, string> = {
  stage: '🎭',
  bar: '🍸',
  dancefloor: '💃',
  entrance: '🚪',
  buffet: '🍽️',
  dj: '🎧',
  photobooth: '📸',
  restrooms: '🚻',
  kitchen: '👨‍🍳',
  custom: '📦',
};

export default function ShareView({ event }: ShareViewProps) {
  const data: SeatingData = event.seating_data;
  const tableSize = 100;
  const seatSize = 28;
  const seatDistance = tableSize / 2 + 20;

  const seatedCount = data.guests.filter((g) => g.tableId).length;
  const unassignedCount = data.guests.length - seatedCount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
        {event.description && (
          <p className="text-gray-600 mt-1">{event.description}</p>
        )}
        <div className="flex gap-4 mt-2 text-sm text-gray-500">
          {event.event_date && <span>{new Date(event.event_date).toLocaleDateString()}</span>}
          {event.location && <span>{event.location}</span>}
          <span>{data.guests.length} guests</span>
          <span>{seatedCount} seated</span>
          {unassignedCount > 0 && (
            <span className="text-amber-600">{unassignedCount} unassigned</span>
          )}
          <span>{data.tables.length} tables</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Floor plan */}
        <div className="flex-1 p-4">
          <div
            className="relative bg-gray-100 rounded-lg overflow-auto mx-auto"
            style={{ maxHeight: '70vh' }}
          >
            <div
              className="relative"
              style={{
                width: data.floorSize.width,
                height: data.floorSize.height,
              }}
            >
              {/* Venue objects */}
              {data.objects.map((obj) => (
                <div
                  key={obj.id}
                  className="absolute flex flex-col items-center justify-center text-white font-semibold shadow-md rounded"
                  style={{
                    left: obj.x,
                    top: obj.y,
                    width: obj.width,
                    height: obj.height,
                    backgroundColor: obj.color || undefined,
                  }}
                >
                  <span className="text-2xl">{OBJECT_ICONS[obj.type] || '📦'}</span>
                  <span className="text-xs mt-1">{obj.label}</span>
                </div>
              ))}

              {/* Tables */}
              {data.tables.map((table) => {
                const tableGuests = data.guests.filter((g) => g.tableId === table.id);
                return (
                  <div
                    key={table.id}
                    className="absolute"
                    style={{
                      left: table.x - tableSize / 2 - seatDistance,
                      top: table.y - tableSize / 2 - seatDistance,
                      width: tableSize + seatDistance * 2,
                      height: tableSize + seatDistance * 2,
                    }}
                  >
                    {/* Table circle */}
                    <div
                      className="absolute rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg"
                      style={{
                        width: tableSize,
                        height: tableSize,
                        left: seatDistance,
                        top: seatDistance,
                        backgroundColor: table.color,
                      }}
                    >
                      {table.name}
                    </div>

                    {/* Capacity badge */}
                    <div
                      className="absolute text-xs font-bold rounded-full px-1.5 py-0.5 shadow-sm border border-white"
                      style={{
                        left: seatDistance + tableSize - 8,
                        top: seatDistance + tableSize - 8,
                        backgroundColor: table.color,
                        color: 'white',
                        fontSize: '10px',
                        lineHeight: '1',
                        minWidth: '20px',
                        textAlign: 'center',
                      }}
                    >
                      {tableGuests.length}/{table.seats.length}
                    </div>

                    {/* Seats */}
                    {table.seats.map((_, index) => {
                      const angle = (index / table.seats.length) * 2 * Math.PI - Math.PI / 2;
                      const seatX = seatDistance + tableSize / 2 + Math.cos(angle) * seatDistance - seatSize / 2;
                      const seatY = seatDistance + tableSize / 2 + Math.sin(angle) * seatDistance - seatSize / 2;
                      const guest = data.guests.find(
                        (g) => g.tableId === table.id && g.seatIndex === index
                      );

                      return (
                        <div
                          key={index}
                          className={`absolute rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                            guest
                              ? 'bg-gray-700 border-gray-700 text-white'
                              : 'bg-white border-gray-300'
                          }`}
                          style={{
                            width: seatSize,
                            height: seatSize,
                            left: seatX,
                            top: seatY,
                          }}
                          title={guest?.name || `Seat ${index + 1}`}
                        >
                          {guest ? guest.name.charAt(0).toUpperCase() : ''}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Guest list sidebar */}
        <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold mb-3">Guest List</h2>
          {data.tables.map((table) => {
            const tableGuests = data.guests
              .filter((g) => g.tableId === table.id)
              .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
            if (tableGuests.length === 0) return null;
            return (
              <div key={table.id} className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: table.color }}
                  />
                  <span className="font-medium text-sm">
                    {table.name} ({tableGuests.length}/{table.seats.length})
                  </span>
                </div>
                <ul className="ml-5 space-y-0.5">
                  {tableGuests.map((guest) => (
                    <li key={guest.id} className="text-sm text-gray-700">
                      {guest.name}
                      {guest.meal && (
                        <span className="text-gray-400 ml-1">({guest.meal})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {unassignedCount > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-sm text-amber-600 mb-1">
                Unassigned ({unassignedCount})
              </h3>
              <ul className="ml-5 space-y-0.5">
                {data.guests
                  .filter((g) => !g.tableId)
                  .map((guest) => (
                    <li key={guest.id} className="text-sm text-gray-500">
                      {guest.name}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
