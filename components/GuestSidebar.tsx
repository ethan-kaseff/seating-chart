'use client';

import { useState, useMemo } from 'react';
import { Guest, Table } from '@/types';
import { GROUP_COLORS } from '@/lib/constants';

interface GuestSidebarProps {
  guests: Guest[];
  tables: Table[];
  selectedGuestId: string | null;
  selectedSeatInfo: { tableId: string; seatIndex: number } | null;
  onGuestSelect: (guestId: string | null) => void;
  onGuestEdit: (guest: Guest) => void;
  onGuestDelete: (guestId: string) => void;
  onUnassign: (guestId: string) => void;
}

export default function GuestSidebar({
  guests,
  tables,
  selectedGuestId,
  selectedSeatInfo,
  onGuestSelect,
  onGuestEdit,
  onGuestDelete,
  onUnassign,
}: GuestSidebarProps) {
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  // Build group color map
  const groupColorMap = useMemo(() => {
    const allGroups = Array.from(new Set(guests.map((g) => g.group).filter(Boolean))).sort();
    const map: Record<string, string> = {};
    allGroups.forEach((group, i) => {
      map[group] = GROUP_COLORS[i % GROUP_COLORS.length];
    });
    return map;
  }, [guests]);

  const filteredGuests = guests.filter((guest) => {
    const matchesSearch = guest.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'unassigned' && !guest.tableId) ||
      (filter === 'assigned' && guest.tableId);
    return matchesSearch && matchesFilter;
  });

  const getTableName = (tableId: string | null) => {
    if (!tableId) return null;
    const table = tables.find((t) => t.id === tableId);
    return table?.name || null;
  };

  const getSelectedSeatTableName = () => {
    if (!selectedSeatInfo) return null;
    const table = tables.find((t) => t.id === selectedSeatInfo.tableId);
    return table?.name || null;
  };

  const unassignedCount = guests.filter((g) => !g.tableId).length;
  const assignedCount = guests.filter((g) => g.tableId).length;

  const toggleTable = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  };

  // Guests grouped by table for seated sections
  const guestsByTable = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    tables.forEach((t) => {
      map[t.id] = [];
    });
    guests.forEach((g) => {
      if (g.tableId && map[g.tableId]) {
        map[g.tableId].push(g);
      }
    });
    return map;
  }, [guests, tables]);

  const unassignedGuests = filteredGuests.filter((g) => !g.tableId);
  const showUnassignedList = filter === 'all' || filter === 'unassigned';
  const showTableSections = filter === 'all' || filter === 'assigned';

  const renderGuestCard = (guest: Guest) => {
    const isSelected = selectedGuestId === guest.id;
    const tableName = getTableName(guest.tableId);
    const canAssignToSeat = selectedSeatInfo && !guest.tableId;
    const groupColor = guest.group ? groupColorMap[guest.group] : null;

    return (
      <div
        key={guest.id}
        draggable={!guest.tableId}
        onDragStart={(e) => {
          if (!guest.tableId) {
            e.dataTransfer.setData('guestId', guest.id);
            e.dataTransfer.effectAllowed = 'move';
          }
        }}
        className={`guest-card p-3 rounded-lg border cursor-pointer ${
          !guest.tableId ? 'cursor-grab active:cursor-grabbing' : ''
        } ${
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : canAssignToSeat
            ? 'border-green-400 bg-green-50 hover:bg-green-100'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
        onClick={() => onGuestSelect(isSelected ? null : guest.id)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {guest.name}
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {guest.group && (
                <span
                  className="inline-block px-1.5 py-0.5 text-xs rounded font-medium"
                  style={{
                    backgroundColor: groupColor ? `${groupColor}20` : '#f3e8ff',
                    color: groupColor || '#7e22ce',
                    border: `1px solid ${groupColor ? `${groupColor}40` : '#e9d5ff'}`,
                  }}
                >
                  {guest.group}
                </span>
              )}
              {guest.meal !== 'Standard' && (
                <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                  {guest.meal}
                </span>
              )}
              {guest.dietary.length > 0 && (
                <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                  {guest.dietary.length} dietary
                </span>
              )}
              {guest.notes && (
                <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded" title={guest.notes}>
                  note
                </span>
              )}
            </div>
            {tableName && (
              <p className="text-xs text-green-600 mt-1">
                Seated at {tableName}
              </p>
            )}
          </div>

          <div className="flex gap-1 ml-2">
            {guest.tableId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnassign(guest.id);
                }}
                className="p-1 text-gray-400 hover:text-orange-500"
                title="Unassign"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGuestEdit(guest);
              }}
              className="p-1 text-gray-400 hover:text-blue-500"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this guest?')) {
                  onGuestDelete(guest.id);
                }
              }}
              className="p-1 text-gray-400 hover:text-red-500"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Guests</h2>

        <input
          type="text"
          placeholder="Search guests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 text-xs font-medium rounded ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({guests.length})
          </button>
          <button
            onClick={() => setFilter('unassigned')}
            className={`flex-1 py-1.5 text-xs font-medium rounded ${
              filter === 'unassigned'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Unassigned ({unassignedCount})
          </button>
          <button
            onClick={() => setFilter('assigned')}
            className={`flex-1 py-1.5 text-xs font-medium rounded ${
              filter === 'assigned'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Seated ({assignedCount})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredGuests.length === 0 && !showTableSections ? (
          <p className="text-gray-500 text-sm text-center py-8">No guests found</p>
        ) : (
          <div className="space-y-2">
            {/* Unassigned guests flat list */}
            {showUnassignedList && unassignedGuests.length > 0 && (
              <>
                {filter === 'all' && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Unassigned ({unassignedGuests.length})
                  </p>
                )}
                {unassignedGuests.map(renderGuestCard)}
              </>
            )}

            {/* Seated by table - expandable sections */}
            {showTableSections && tables.length > 0 && (
              <>
                {filter === 'all' && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-1">
                    Seated by Table
                  </p>
                )}
                {tables.map((table) => {
                  const tableGuests = (guestsByTable[table.id] || []).filter((g) =>
                    g.name.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                  if (tableGuests.length === 0 && searchTerm) return null;
                  const isExpanded = expandedTables.has(table.id);

                  return (
                    <div key={table.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleTable(table.id)}
                        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: table.color }}
                          />
                          <span className="font-medium text-gray-700">{table.name}</span>
                          <span className="text-gray-400">
                            ({(guestsByTable[table.id] || []).length}/{table.seats.length})
                          </span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="p-2 space-y-1">
                          {tableGuests.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-2">No guests</p>
                          ) : (
                            tableGuests.map(renderGuestCard)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Empty state when no unassigned and filter is unassigned */}
            {filter === 'unassigned' && unassignedGuests.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No unassigned guests</p>
            )}
          </div>
        )}
      </div>

      {/* Help text based on selection state */}
      {selectedSeatInfo && (
        <div className="p-4 bg-green-50 border-t border-green-200">
          <p className="text-sm text-green-700">
            Seat selected at {getSelectedSeatTableName()}. Click an unassigned guest to place them here.
          </p>
        </div>
      )}
      {selectedGuestId && !selectedSeatInfo && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <p className="text-sm text-blue-700">
            Click an empty seat to assign the selected guest
          </p>
        </div>
      )}
    </div>
  );
}
