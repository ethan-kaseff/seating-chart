'use client';

import { useState, useCallback, useRef } from 'react';
import { Event, Guest, Table, VenueObject, SeatingData } from '@/types';
import { useSeatingChart } from '@/hooks/useSeatingChart';
import FloorPlan from './FloorPlan';
import FloorControls from './FloorControls';
import GuestSidebar from './GuestSidebar';
import GuestModal from './GuestModal';
import TableModal from './TableModal';
import ObjectModal from './ObjectModal';
import Tabs from './Tabs';
import { importFromExcel, exportToExcel } from '@/lib/excel';
import { VENUE_OBJECT_TYPES } from '@/lib/constants';

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

interface SeatingChartProps {
  event: Event;
  onSave: (data: SeatingData) => Promise<void>;
}

export default function SeatingChart({ event, onSave }: SeatingChartProps) {
  const [activeTab, setActiveTab] = useState('floor');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedSeatInfo, setSelectedSeatInfo] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [objectModalOpen, setObjectModalOpen] = useState(false);
  const [showObjectMenu, setShowObjectMenu] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingObject, setEditingObject] = useState<VenueObject | null>(null);
  const [saving, setSaving] = useState(false);
  const [guestListSearch, setGuestListSearch] = useState('');
  const [guestListFilter, setGuestListFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set());
  const [shareCopied, setShareCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const floorContainerRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(
    async (data: SeatingData) => {
      setSaving(true);
      try {
        await onSave(data);
      } finally {
        setSaving(false);
      }
    },
    [onSave]
  );

  const {
    state,
    addTable,
    updateTable,
    deleteTable,
    addGuest,
    updateGuest,
    deleteGuest,
    assignGuest,
    unassignGuest,
    addObject,
    updateObject,
    deleteObject,
    setZoom,
    setData,
    setFloorSize,
    getTableById,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSeatingChart(event.seating_data, handleSave);

  const arrangeTables = useCallback((options: {
    layout: 'grid' | 'staggered';
    spacing: number;
    objectSpacing: number;
    maxCols: number;
  }) => {
    if (state.tables.length === 0) return;
    const { layout, spacing, objectSpacing, maxCols } = options;

    const tableRadius = 70;
    const tableCount = state.tables.length;
    const margin = tableRadius + 10;

    // Build object exclusion zones
    const objectBounds = state.objects.map((obj) => {
      const pad = obj.padding || { top: 0, right: 0, bottom: 0, left: 0 };
      return {
        left: obj.x - Math.max(pad.left, objectSpacing),
        top: obj.y - Math.max(pad.top, objectSpacing),
        right: obj.x + obj.width + Math.max(pad.right, objectSpacing),
        bottom: obj.y + obj.height + Math.max(pad.bottom, objectSpacing),
      };
    });

    const overlapsObject = (x: number, y: number) =>
      objectBounds.some(
        (b) =>
          x + tableRadius > b.left &&
          x - tableRadius < b.right &&
          y + tableRadius > b.top &&
          y - tableRadius < b.bottom
      );

    // Helper: compute all positions for a given floor width
    const computePositions = (floorW: number) => {
      const cols2 = maxCols > 0 ? maxCols : Math.ceil(Math.sqrt(tableCount));
      const rowH = layout === 'staggered' ? spacing * 0.866 : spacing;
      const pos: { x: number; y: number }[] = [];

      // Generate all available grid slots, skipping any that overlap objects
      // Keep generating rows until we have enough slots for all tables
      const slots: { x: number; y: number; row: number }[] = [];
      // Scan Y positions in fine increments to find clear rows close to objects
      const scanStep = rowH / 2; // scan at half-row intervals for tighter packing
      let y = margin;
      let placedRows = 0;
      let lastPlacedY = -Infinity;
      while (slots.length < tableCount && y < 10000) {
        // Only place a new row if we're at least rowH away from the last placed row
        if (y - lastPlacedY < rowH - 1) {
          y += scanStep;
          continue;
        }

        const isOddRow = layout === 'staggered' && placedRows % 2 === 1;
        const stagger = layout === 'staggered'
          ? (isOddRow ? spacing / 4 : -spacing / 4)
          : 0;

        const rowW = (cols2 - 1) * spacing;
        const startX = (floorW - rowW) / 2 + stagger;

        // Check if at least one slot in this row is clear
        let rowSlots: { x: number; y: number }[] = [];
        for (let col = 0; col < cols2; col++) {
          const x = startX + col * spacing;
          if (!overlapsObject(x, y)) {
            rowSlots.push({ x, y });
          }
        }

        if (rowSlots.length > 0) {
          rowSlots.forEach((s) => slots.push({ ...s, row: placedRows }));
          placedRows++;
          lastPlacedY = y;
          y += rowH; // jump ahead by full row height
        } else {
          y += scanStep; // try a bit lower
        }
      }

      // Take the first tableCount slots
      for (let i = 0; i < tableCount && i < slots.length; i++) {
        pos.push({ x: slots[i].x, y: slots[i].y });
      }

      // Now re-center each row based on how many tables actually landed in it
      const rowGroups = new Map<number, number[]>();
      pos.forEach((p, i) => {
        const rKey = Math.round(p.y);
        if (!rowGroups.has(rKey)) rowGroups.set(rKey, []);
        rowGroups.get(rKey)!.push(i);
      });

      const sortedRows = Array.from(rowGroups.entries()).sort((a, b) => a[0] - b[0]);
      sortedRows.forEach(([, indices], rowIdx) => {
        const count = indices.length;
        if (count === 0) return;

        const isOddRow = layout === 'staggered' && rowIdx % 2 === 1;
        const stagger = layout === 'staggered'
          ? (isOddRow ? spacing / 4 : -spacing / 4)
          : 0;

        const rowW = (count - 1) * spacing;
        const startX = (floorW - rowW) / 2 + stagger;

        // Sort indices by current X to maintain order
        indices.sort((a, b) => pos[a].x - pos[b].x);
        indices.forEach((idx, col) => {
          pos[idx].x = startX + col * spacing;
        });
      });

      return pos;
    };

    // Compute positions for current floor
    let floorW = state.floorSize.width;
    let floorH = state.floorSize.height;
    let positions = computePositions(floorW);

    // Calculate the actual bounding box of all placed tables
    const minX = Math.min(...positions.map((p) => p.x)) - tableRadius;
    const maxX = Math.max(...positions.map((p) => p.x)) + tableRadius;
    const maxY = Math.max(...positions.map((p) => p.y)) + tableRadius;
    const neededW = maxX + margin;
    const neededH = maxY + margin;

    // Check if floor is too small OR too large
    const tooSmall = neededW > floorW || neededH > floorH || minX < 0;
    const tooLarge = neededW < floorW * 0.6 || neededH < floorH * 0.6;

    if (tooSmall || tooLarge) {
      const suggestW = Math.max(neededW, minX < 0 ? neededW - minX + margin : neededW);
      const suggestH = neededH;
      const suggestWFt = Math.ceil(suggestW / 15);
      const suggestHFt = Math.ceil(suggestH / 15);
      const currentWFt = Math.round(floorW / 15);
      const currentHFt = Math.round(floorH / 15);

      const message = tooSmall
        ? `Tables don't fit in the current floor (${currentWFt}×${currentHFt} ft).\n\nResize to ${suggestWFt}×${suggestHFt} ft to fit all ${tableCount} tables?`
        : `The floor (${currentWFt}×${currentHFt} ft) is larger than needed.\n\nResize to ${suggestWFt}×${suggestHFt} ft to better fit ${tableCount} tables?`;

      if (window.confirm(message)) {
        floorW = suggestW;
        floorH = suggestH;
        setFloorSize(floorW, floorH);
        // Recompute with new size
        positions = computePositions(floorW);
      } else if (tooSmall) {
        // Still arrange but with current floor — some may be off-screen
        // That's OK, user chose not to resize
      }
    }

    // Apply all positions — never skip a table
    state.tables.forEach((table, i) => {
      updateTable(table.id, { x: positions[i].x, y: positions[i].y });
    });
  }, [state.tables, state.objects, state.floorSize.width, state.floorSize.height, updateTable, setFloorSize]);

  const zoomFit = useCallback(() => {
    if (!floorContainerRef.current) return;
    const container = floorContainerRef.current;
    const containerWidth = container.clientWidth - 32; // padding
    const containerHeight = container.clientHeight - 32;
    const scaleX = containerWidth / state.floorSize.width;
    const scaleY = containerHeight / state.floorSize.height;
    const newZoom = Math.min(scaleX, scaleY, 2);
    setZoom(Math.max(0.5, Math.round(newZoom * 100) / 100));
  }, [state.floorSize, setZoom]);

  const autoSeatByGroup = useCallback(() => {
    const unassigned = state.guests.filter((g) => !g.tableId);
    if (unassigned.length === 0 || state.tables.length === 0) return;

    // Group unassigned guests
    const groups: Record<string, Guest[]> = {};
    unassigned.forEach((g) => {
      const key = g.group || `__solo_${g.id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });

    // Sort groups by size (largest first) for better packing
    const sortedGroups = Object.values(groups).sort((a, b) => b.length - a.length);

    // Compute available seats per table
    const tableAvail: { tableId: string; available: number[] }[] = state.tables.map((t) => {
      const taken = new Set(
        state.guests.filter((g) => g.tableId === t.id && g.seatIndex !== null).map((g) => g.seatIndex!)
      );
      const available: number[] = [];
      for (let i = 0; i < t.seats.length; i++) {
        if (!taken.has(i)) available.push(i);
      }
      return { tableId: t.id, available };
    });

    // Assign groups to tables
    for (const groupGuests of sortedGroups) {
      // Find table with enough contiguous seats, or most available
      let bestTable = tableAvail
        .filter((t) => t.available.length >= groupGuests.length)
        .sort((a, b) => a.available.length - b.available.length)[0];

      if (!bestTable) {
        // Split across tables if no single table fits
        let remaining = [...groupGuests];
        for (const ta of tableAvail) {
          if (remaining.length === 0) break;
          while (ta.available.length > 0 && remaining.length > 0) {
            const guest = remaining.shift()!;
            const seatIdx = ta.available.shift()!;
            assignGuest(guest.id, ta.tableId, seatIdx);
          }
        }
        continue;
      }

      for (const guest of groupGuests) {
        const seatIdx = bestTable.available.shift()!;
        assignGuest(guest.id, bestTable.tableId, seatIdx);
      }
    }
  }, [state.guests, state.tables, assignGuest]);

  // Handle seat click - supports both workflows:
  // 1. Click seat first, then click guest to assign
  // 2. Click guest first, then click seat to assign
  const handleSeatClick = (tableId: string, seatIndex: number, guestId: string | null) => {
    // If we have a selected guest and clicking an empty seat, assign them
    if (selectedGuestId && !guestId) {
      assignGuest(selectedGuestId, tableId, seatIndex);
      setSelectedGuestId(null);
      setSelectedSeatInfo(null);
      return;
    }

    // If clicking on an occupied seat
    if (guestId) {
      // If we have a selected seat and clicking a guest, do nothing (can't swap easily)
      // Instead, select this guest for moving
      setSelectedGuestId(guestId);
      setSelectedSeatInfo(null);
      return;
    }

    // Clicking an empty seat - select it so we can assign a guest from sidebar
    if (selectedSeatInfo?.tableId === tableId && selectedSeatInfo?.seatIndex === seatIndex) {
      // Clicking same seat deselects it
      setSelectedSeatInfo(null);
    } else {
      setSelectedSeatInfo({ tableId, seatIndex });
      setSelectedGuestId(null);
    }
  };

  // Handle guest selection from sidebar
  const handleGuestSelect = (guestId: string | null) => {
    if (guestId && selectedSeatInfo) {
      // If we have a seat selected and clicking a guest, assign them
      assignGuest(guestId, selectedSeatInfo.tableId, selectedSeatInfo.seatIndex);
      setSelectedSeatInfo(null);
      setSelectedGuestId(null);
    } else {
      // Normal guest selection
      setSelectedGuestId(guestId);
      if (guestId) {
        setSelectedSeatInfo(null);
      }
    }
  };

  const handleTableClick = (tableId: string, e?: React.MouseEvent | MouseEvent) => {
    if (e && e.shiftKey) {
      setSelectedTableIds((prev) => {
        const next = new Set(prev);
        if (next.has(tableId)) next.delete(tableId);
        else next.add(tableId);
        return next;
      });
      return;
    }
    setSelectedTableIds(new Set());
    setSelectedObjectIds(new Set());
    const table = getTableById(tableId);
    if (table) {
      setEditingTable(table);
      setTableModalOpen(true);
    }
  };

  const handleObjectClick = (objectId: string, e?: React.MouseEvent | MouseEvent) => {
    if (e && e.shiftKey) {
      setSelectedObjectIds((prev) => {
        const next = new Set(prev);
        if (next.has(objectId)) next.delete(objectId);
        else next.add(objectId);
        return next;
      });
      return;
    }
    setSelectedTableIds(new Set());
    setSelectedObjectIds(new Set());
    const object = state.objects.find((o) => o.id === objectId);
    if (object) {
      setEditingObject(object);
      setObjectModalOpen(true);
    }
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedTableIds.size === 0 && selectedObjectIds.size === 0) return;
    const count = selectedTableIds.size + selectedObjectIds.size;
    if (!confirm(`Delete ${count} selected item(s)?`)) return;
    selectedTableIds.forEach((id) => deleteTable(id));
    selectedObjectIds.forEach((id) => deleteObject(id));
    setSelectedTableIds(new Set());
    setSelectedObjectIds(new Set());
  }, [selectedTableIds, selectedObjectIds, deleteTable, deleteObject]);

  const handleGuestSave = (
    guestData: Omit<Guest, 'id' | 'tableId' | 'seatIndex'> & { id?: string }
  ) => {
    if (guestData.id) {
      updateGuest(guestData.id, guestData);
    } else {
      addGuest({
        ...guestData,
        tableId: null,
        seatIndex: null,
      });
    }
    setEditingGuest(null);
  };

  const handleTableSave = (data: {
    name: string;
    seatCount: number;
    color: string;
    id?: string;
    preselectedGuestIds?: string[];
  }) => {
    if (data.id) {
      const table = getTableById(data.id);
      if (table) {
        const currentSeatCount = table.seats.length;
        let newSeats = [...table.seats];

        if (data.seatCount > currentSeatCount) {
          for (let i = currentSeatCount; i < data.seatCount; i++) {
            newSeats.push({ guestId: null });
          }
        } else if (data.seatCount < currentSeatCount) {
          state.guests.forEach((guest) => {
            if (
              guest.tableId === data.id &&
              guest.seatIndex !== null &&
              guest.seatIndex >= data.seatCount
            ) {
              unassignGuest(guest.id);
            }
          });
          newSeats = newSeats.slice(0, data.seatCount);
        }

        updateTable(data.id, {
          name: data.name,
          color: data.color,
          seats: newSeats,
        });
      }
    } else {
      const newTable = addTable(data.seatCount, data.name);
      // Pre-assign selected guests
      if (data.preselectedGuestIds && newTable) {
        data.preselectedGuestIds.forEach((guestId, i) => {
          if (i < data.seatCount) {
            assignGuest(guestId, newTable.id, i);
          }
        });
      }
    }
    setEditingTable(null);
  };

  const handleObjectSave = (
    data: Omit<VenueObject, 'id' | 'x' | 'y'> & { id?: string }
  ) => {
    if (data.id) {
      updateObject(data.id, data);
    } else {
      addObject({
        ...data,
        x: 100,
        y: 100,
      });
    }
    setEditingObject(null);
  };

  const handleAddObject = (type: VenueObject['type']) => {
    const config = VENUE_OBJECT_TYPES.find((t) => t.type === type);
    if (config) {
      addObject({
        type,
        label: config.label,
        x: 100 + state.objects.length * 20,
        y: 100 + state.objects.length * 20,
        width: config.defaultWidth,
        height: config.defaultHeight,
        color: '',
      });
    }
    setShowObjectMenu(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importFromExcel(file);
      if (result.type === 'full') {
        setData(result.data);
        alert(`Imported full seating chart: ${result.data.guests.length} guests, ${result.data.tables.length} tables, ${result.data.objects.length} objects`);
      } else {
        result.guests.forEach((guest) => {
          addGuest({
            ...guest,
            tableId: null,
            seatIndex: null,
          });
        });
        alert(`Imported ${result.guests.length} guests`);
      }
    } catch (error) {
      alert('Failed to import file. Please check the format.');
      console.error(error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    exportToExcel(state, event.title);
  };

  const tabs = [
    { id: 'floor', label: 'Floor Plan' },
    { id: 'guests', label: 'Guest List', count: state.guests.length },
    { id: 'summary', label: 'Summary' },
  ];

  const unassignedCount = state.guests.filter((g) => !g.tableId).length;
  const assignedCount = state.guests.length - unassignedCount;
  const totalSeats = state.tables.reduce((sum, t) => sum + t.seats.length, 0);
  const availableSeats = totalSeats - assignedCount;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{event.title}</h1>
            {event.event_date && (
              <p className="text-sm text-gray-500">
                {new Date(event.event_date).toLocaleDateString()}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {state.guests.length} guests | {assignedCount} seated | {unassignedCount} unassigned | {state.tables.length} tables | {availableSeats} seats available
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saving && (
              <span className="text-sm text-gray-500">Saving...</span>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
                </svg>
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
                </svg>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Import Excel
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Export Excel
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Print
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/share/${event.id}`;
                navigator.clipboard.writeText(url).then(() => {
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                });
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {shareCopied ? 'Link Copied!' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex justify-between items-center">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingTable(null);
                setTableModalOpen(true);
              }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Table
            </button>
            <button
              onClick={() => {
                setEditingGuest(null);
                setGuestModalOpen(true);
              }}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              + Add Guest
            </button>

            {/* Add Object Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowObjectMenu(!showObjectMenu)}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                + Add Object
              </button>

              {showObjectMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowObjectMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    {VENUE_OBJECT_TYPES.map((obj) => (
                      <button
                        key={obj.type}
                        onClick={() => handleAddObject(obj.type)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <span className="text-xl">{OBJECT_ICONS[obj.type]}</span>
                        <span className="text-sm text-gray-700">{obj.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'floor' && (
          <>
            <div
              ref={floorContainerRef}
              className={`flex-1 flex flex-col ${
                isFullscreen ? 'fixed inset-0 z-40 bg-gray-50' : ''
              }`}
            >
              <FloorControls
                floorWidth={state.floorSize.width}
                floorHeight={state.floorSize.height}
                zoom={state.zoom}
                isFullscreen={isFullscreen}
                onFloorSizeChange={setFloorSize}
                onArrangeTables={(opts) => arrangeTables(opts)}
                onAutoSeat={autoSeatByGroup}
                snapToGrid={snapToGrid}
                onToggleSnap={() => setSnapToGrid(!snapToGrid)}
                onZoomChange={setZoom}
                onZoomFit={zoomFit}
                onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              />
              {(selectedTableIds.size > 0 || selectedObjectIds.size > 0) && (
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-3 text-sm">
                  <span className="text-blue-700 font-medium">
                    {selectedTableIds.size + selectedObjectIds.size} selected
                  </span>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
                  >
                    Delete Selected
                  </button>
                  <button
                    onClick={() => { setSelectedTableIds(new Set()); setSelectedObjectIds(new Set()); }}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-xs font-medium text-gray-600"
                  >
                    Clear Selection
                  </button>
                  <span className="text-blue-500 text-xs">Shift+click to select more</span>
                </div>
              )}
              <div className="flex-1 p-4">
                <FloorPlan
                  data={state}
                  selectedGuestId={selectedGuestId}
                  selectedSeatInfo={selectedSeatInfo}
                  onTableDrag={(id, x, y) => {
                    const gridSize = 20;
                    const nx = snapToGrid ? Math.round(x / gridSize) * gridSize : x;
                    const ny = snapToGrid ? Math.round(y / gridSize) * gridSize : y;
                    updateTable(id, { x: nx, y: ny });
                  }}
                  onObjectDrag={(id, x, y) => {
                    const gridSize = 20;
                    const nx = snapToGrid ? Math.round(x / gridSize) * gridSize : x;
                    const ny = snapToGrid ? Math.round(y / gridSize) * gridSize : y;
                    updateObject(id, { x: nx, y: ny });
                  }}
                  onSeatClick={handleSeatClick}
                  onTableClick={handleTableClick}
                  onObjectClick={handleObjectClick}
                  onZoomChange={setZoom}
                  onObjectResize={(id, w, h) => updateObject(id, { width: w, height: h })}
                  snapToGrid={snapToGrid}
                  gridSize={20}
                  selectedTableIds={selectedTableIds}
                  selectedObjectIds={selectedObjectIds}
                  onGuestDrop={(guestId, tableId, seatIndex) => {
                    assignGuest(guestId, tableId, seatIndex);
                    setSelectedGuestId(null);
                    setSelectedSeatInfo(null);
                  }}
                />
              </div>
            </div>
            {!isFullscreen && (
              <GuestSidebar
                guests={state.guests}
                tables={state.tables}
                selectedGuestId={selectedGuestId}
                selectedSeatInfo={selectedSeatInfo}
                onGuestSelect={handleGuestSelect}
                onGuestEdit={(guest) => {
                  setEditingGuest(guest);
                  setGuestModalOpen(true);
                }}
                onGuestDelete={deleteGuest}
                onUnassign={unassignGuest}
              />
            )}
          </>
        )}

        {activeTab === 'guests' && (() => {
          const filteredGuestList = state.guests.filter((guest) => {
            const matchesSearch = guest.name.toLowerCase().includes(guestListSearch.toLowerCase()) ||
              guest.group.toLowerCase().includes(guestListSearch.toLowerCase());
            const matchesFilter =
              guestListFilter === 'all' ||
              (guestListFilter === 'unassigned' && !guest.tableId) ||
              (guestListFilter === 'assigned' && guest.tableId);
            return matchesSearch && matchesFilter;
          });

          return (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              {/* Search and filter bar */}
              <div className="flex gap-3 mb-4 items-center">
                <input
                  type="text"
                  placeholder="Search by name or group..."
                  value={guestListSearch}
                  onChange={(e) => setGuestListSearch(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-1">
                  {(['all', 'unassigned', 'assigned'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setGuestListFilter(f)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg ${
                        guestListFilter === f
                          ? f === 'unassigned' ? 'bg-orange-100 text-orange-700' : f === 'assigned' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'unassigned' ? 'Unassigned' : 'Assigned'}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {filteredGuestList.length} of {state.guests.length}
                </span>
              </div>

              <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Group</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Meal</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Dietary</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Notes</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Table</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuestList.map((guest) => {
                      const guestTable = state.tables.find((t) => t.id === guest.tableId);
                      return (
                        <tr key={guest.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{guest.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{guest.group || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{guest.meal}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{guest.dietary.length > 0 ? guest.dietary.join(', ') : '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={guest.notes}>{guest.notes || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            {guestTable ? (
                              <span className="text-green-600">{guestTable.name}</span>
                            ) : (
                              <span className="text-orange-500">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => { setEditingGuest(guest); setGuestModalOpen(true); }}
                              className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                            >Edit</button>
                            <button
                              onClick={() => { if (confirm('Delete this guest?')) deleteGuest(guest.id); }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredGuestList.length === 0 && (
                  <p className="text-center py-8 text-gray-500">
                    {state.guests.length === 0 ? 'No guests added yet' : 'No matching guests'}
                  </p>
                )}
              </div>
            </div>
          </div>
          );
        })()}

        {activeTab === 'summary' && (() => {
          // Compute meal types across all guests
          const mealTypes = Array.from(new Set(state.guests.map((g) => g.meal))).sort();

          // Compute guests separated from their group
          const separatedGuests: { guest: Guest; guestTable: string; groupTables: string[] }[] = [];
          const groupMembers: Record<string, Guest[]> = {};
          state.guests.forEach((g) => {
            if (g.group) {
              if (!groupMembers[g.group]) groupMembers[g.group] = [];
              groupMembers[g.group].push(g);
            }
          });
          Object.values(groupMembers).forEach((members) => {
            if (members.length < 2) return;
            const seatedMembers = members.filter((m) => m.tableId);
            if (seatedMembers.length < 2) return;
            const tableIds = Array.from(new Set(seatedMembers.map((m) => m.tableId!)));
            if (tableIds.length <= 1) return;
            // Multiple tables — each member at a different table from others
            seatedMembers.forEach((m) => {
              const otherTables = tableIds.filter((t) => t !== m.tableId);
              const otherTableNames = otherTables.map((t) => state.tables.find((tbl) => tbl.id === t)?.name || t);
              const thisTableName = state.tables.find((tbl) => tbl.id === m.tableId)?.name || m.tableId || '';
              separatedGuests.push({ guest: m, guestTable: thisTableName, groupTables: otherTableNames });
            });
          });

          return (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto grid gap-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-500">Total Guests</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {state.guests.length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-500">Assigned</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {assignedCount}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-500">Unassigned</p>
                  <p className="text-2xl font-semibold text-orange-500">
                    {unassignedCount}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-500">Tables</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {state.tables.length}
                  </p>
                </div>
              </div>

              {/* Guests Separated from Group */}
              {separatedGuests.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg shadow">
                  <h3 className="px-4 py-3 font-medium text-amber-800 border-b border-amber-200">
                    Guests Separated from Group
                  </h3>
                  <div className="p-4 space-y-2">
                    {separatedGuests.map((s) => (
                      <div key={s.guest.id} className="text-sm text-amber-700">
                        <span className="font-medium">{s.guest.name}</span>
                        {' '}({s.guest.group}) is at {s.guestTable}, but group members are also at {s.groupTables.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow">
                <h3 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-200">
                  Table Assignments
                </h3>
                <div className="divide-y divide-gray-100">
                  {state.tables.map((table) => {
                    const tableGuests = state.guests.filter(
                      (g) => g.tableId === table.id
                    );
                    return (
                      <div
                        key={table.id}
                        className="px-4 py-3 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: table.color }}
                          />
                          <span className="font-medium">{table.name}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {tableGuests.length} / {table.seats.length} seats
                        </div>
                      </div>
                    );
                  })}
                  {state.tables.length === 0 && (
                    <p className="px-4 py-8 text-center text-gray-500">
                      No tables added yet
                    </p>
                  )}
                </div>
              </div>

              {/* Meals by Table */}
              {state.tables.length > 0 && mealTypes.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <h3 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-200">
                    Meals by Table
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Table</th>
                          {mealTypes.map((meal) => (
                            <th key={meal} className="px-3 py-2 text-center font-medium text-gray-500">{meal}</th>
                          ))}
                          <th className="px-3 py-2 text-center font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.tables.map((table) => {
                          const tableGuests = state.guests.filter((g) => g.tableId === table.id);
                          const mealCounts: Record<string, number> = {};
                          tableGuests.forEach((g) => {
                            mealCounts[g.meal] = (mealCounts[g.meal] || 0) + 1;
                          });
                          return (
                            <tr key={table.id} className="border-b border-gray-100">
                              <td className="px-4 py-2 font-medium">
                                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: table.color }} />
                                {table.name}
                              </td>
                              {mealTypes.map((meal) => (
                                <td key={meal} className="px-3 py-2 text-center text-gray-600">
                                  {mealCounts[meal] || 0}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-center font-medium">{tableGuests.length}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-4 py-2">Total</td>
                          {mealTypes.map((meal) => (
                            <td key={meal} className="px-3 py-2 text-center">
                              {state.guests.filter((g) => g.meal === meal).length}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center">{state.guests.length}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow">
                <h3 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-200">
                  Meal Breakdown
                </h3>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(
                      state.guests.reduce(
                        (acc, g) => {
                          acc[g.meal] = (acc[g.meal] || 0) + 1;
                          return acc;
                        },
                        {} as Record<string, number>
                      )
                    ).map(([meal, count]) => (
                      <div key={meal} className="flex justify-between">
                        <span className="text-gray-600">{meal}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}
      </div>

      {/* Modals */}
      <GuestModal
        guest={editingGuest}
        isOpen={guestModalOpen}
        onClose={() => {
          setGuestModalOpen(false);
          setEditingGuest(null);
        }}
        onSave={handleGuestSave}
      />

      <TableModal
        table={editingTable}
        isOpen={tableModalOpen}
        onClose={() => {
          setTableModalOpen(false);
          setEditingTable(null);
        }}
        onSave={handleTableSave}
        onDelete={
          editingTable ? () => deleteTable(editingTable.id) : undefined
        }
        onDuplicate={
          editingTable
            ? () => {
                addTable(editingTable.seats.length, `${editingTable.name} (copy)`);
                setEditingTable(null);
              }
            : undefined
        }
        unassignedGuests={state.guests.filter((g) => !g.tableId)}
      />

      <ObjectModal
        object={editingObject}
        isOpen={objectModalOpen}
        onClose={() => {
          setObjectModalOpen(false);
          setEditingObject(null);
        }}
        onSave={handleObjectSave}
        onDelete={
          editingObject ? () => deleteObject(editingObject.id) : undefined
        }
      />
    </div>
  );
}
