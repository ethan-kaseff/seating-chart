'use client';

import { useState, useEffect, useMemo } from 'react';
import { Table, Guest } from '@/types';
import { TABLE_COLORS, GROUP_COLORS } from '@/lib/constants';

interface TableModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; seatCount: number; color: string; id?: string; preselectedGuestIds?: string[] }) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  unassignedGuests?: Guest[];
}

export default function TableModal({
  table,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  unassignedGuests,
}: TableModalProps) {
  const [name, setName] = useState('');
  const [seatCount, setSeatCount] = useState(8);
  const [color, setColor] = useState(TABLE_COLORS[0]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (table) {
      setName(table.name);
      setSeatCount(table.seats.length);
      setColor(table.color);
    } else {
      setName('');
      setSeatCount(8);
      setColor(TABLE_COLORS[0]);
    }
    setSelectedGuestIds(new Set());
  }, [table, isOpen]);

  // Group unassigned guests by group
  const guestsByGroup = useMemo(() => {
    if (!unassignedGuests || table) return {};
    const groups: Record<string, Guest[]> = {};
    unassignedGuests.forEach((g) => {
      const key = g.group || '(No Group)';
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });
    return groups;
  }, [unassignedGuests, table]);

  const groupColorMap = useMemo(() => {
    const allGroups = Object.keys(guestsByGroup).filter((g) => g !== '(No Group)').sort();
    const map: Record<string, string> = {};
    allGroups.forEach((group, i) => {
      map[group] = GROUP_COLORS[i % GROUP_COLORS.length];
    });
    return map;
  }, [guestsByGroup]);

  const toggleGuest = (guestId: string) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);

      // Auto-adjust seat count if selected exceeds current
      if (next.size > seatCount) {
        setSeatCount(next.size);
      }
      return next;
    });
  };

  const toggleGroup = (groupGuests: Guest[]) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      const allSelected = groupGuests.every((g) => next.has(g.id));
      if (allSelected) {
        groupGuests.forEach((g) => next.delete(g.id));
      } else {
        groupGuests.forEach((g) => next.add(g.id));
      }
      if (next.size > seatCount) {
        setSeatCount(next.size);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: table?.id,
      name: name.trim(),
      seatCount,
      color,
      preselectedGuestIds: !table && selectedGuestIds.size > 0 ? Array.from(selectedGuestIds) : undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  const showGuestSelection = !table && unassignedGuests && unassignedGuests.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-xl shadow-xl w-full mx-4 ${showGuestSelection ? 'max-w-lg max-h-[90vh] overflow-y-auto' : 'max-w-md'}`}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {table ? 'Edit Table' : 'Add Table'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Table Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Table 1, Head Table"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Seats
              </label>
              <input
                type="number"
                value={seatCount}
                onChange={(e) => setSeatCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                min={1}
                max={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {table ? 'Note: Changing seat count may unassign some guests' : ''}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Color
              </label>
              <div className="flex gap-2">
                {TABLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Guest pre-selection for new tables */}
            {showGuestSelection && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pre-assign Guests ({selectedGuestIds.size} selected)
                </label>
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {Object.entries(guestsByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupGuests]) => {
                    const allSelected = groupGuests.every((g) => selectedGuestIds.has(g.id));
                    const someSelected = groupGuests.some((g) => selectedGuestIds.has(g.id));
                    const gColor = groupColorMap[group];

                    return (
                      <div key={group}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupGuests)}
                          className="w-full px-3 py-1.5 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 border-b border-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            readOnly
                            className="rounded"
                          />
                          <span
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={gColor ? {
                              backgroundColor: `${gColor}20`,
                              color: gColor,
                            } : undefined}
                          >
                            {group}
                          </span>
                          <span className="text-gray-400 text-xs">({groupGuests.length})</span>
                        </button>
                        {groupGuests.map((guest) => (
                          <label
                            key={guest.id}
                            className="flex items-center gap-2 px-3 py-1.5 pl-8 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedGuestIds.has(guest.id)}
                              onChange={() => toggleGuest(guest.id)}
                              className="rounded"
                            />
                            <span className="text-gray-700">{guest.name}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {table && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this table? All guests will be unassigned.')) {
                      onDelete();
                      onClose();
                    }
                  }}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              )}
              {table && onDuplicate && (
                <button
                  type="button"
                  onClick={() => {
                    onDuplicate();
                    onClose();
                  }}
                  className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
                >
                  Duplicate
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {table ? 'Save Changes' : 'Add Table'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
