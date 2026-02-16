'use client';

import { useState, useCallback, useRef } from 'react';
import { Event, Guest, Table, VenueObject, SeatingData } from '@/types';
import { useSeatingChart } from '@/hooks/useSeatingChart';
import FloorPlan from './FloorPlan';
import GuestSidebar from './GuestSidebar';
import GuestModal from './GuestModal';
import TableModal from './TableModal';
import ObjectModal from './ObjectModal';
import Tabs from './Tabs';
import { importGuestsFromExcel, exportToExcel } from '@/lib/excel';
import { VENUE_OBJECT_TYPES } from '@/lib/constants';

const OBJECT_ICONS: Record<string, string> = {
  stage: '🎭',
  bar: '🍸',
  dancefloor: '💃',
  entrance: '🚪',
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    getTableById,
  } = useSeatingChart(event.seating_data, handleSave);

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

  const handleTableClick = (tableId: string) => {
    const table = getTableById(tableId);
    if (table) {
      setEditingTable(table);
      setTableModalOpen(true);
    }
  };

  const handleObjectClick = (objectId: string) => {
    const object = state.objects.find((o) => o.id === objectId);
    if (object) {
      setEditingObject(object);
      setObjectModalOpen(true);
    }
  };

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
      addTable(data.seatCount, data.name);
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
      const guests = await importGuestsFromExcel(file);
      guests.forEach((guest) => {
        addGuest({
          ...guest,
          tableId: null,
          seatIndex: null,
        });
      });
      alert(`Imported ${guests.length} guests`);
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
          </div>

          <div className="flex items-center gap-3">
            {saving && (
              <span className="text-sm text-gray-500">Saving...</span>
            )}

            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setZoom(state.zoom - 0.1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                -
              </button>
              <span className="w-12 text-center">
                {Math.round(state.zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(state.zoom + 0.1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                +
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
            <div className="flex-1 p-4">
              <FloorPlan
                data={state}
                selectedGuestId={selectedGuestId}
                selectedSeatInfo={selectedSeatInfo}
                onTableDrag={(id, x, y) => updateTable(id, { x, y })}
                onObjectDrag={(id, x, y) => updateObject(id, { x, y })}
                onSeatClick={handleSeatClick}
                onTableClick={handleTableClick}
                onObjectClick={handleObjectClick}
              />
            </div>
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
          </>
        )}

        {activeTab === 'guests' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Group
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Meal
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Dietary
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Table
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.guests.map((guest) => {
                      const table = state.tables.find(
                        (t) => t.id === guest.tableId
                      );
                      return (
                        <tr
                          key={guest.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {guest.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {guest.group || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {guest.meal}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {guest.dietary.length > 0
                              ? guest.dietary.join(', ')
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {table ? (
                              <span className="text-green-600">{table.name}</span>
                            ) : (
                              <span className="text-orange-500">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setEditingGuest(guest);
                                setGuestModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this guest?')) {
                                  deleteGuest(guest.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {state.guests.length === 0 && (
                  <p className="text-center py-8 text-gray-500">
                    No guests added yet
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
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
                    {state.guests.length - unassignedCount}
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

              <div className="bg-white rounded-lg shadow">
                <h3 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-200">
                  Table Assignments
                </h3>
                <div className="divide-y divide-gray-100">
                  {state.tables.map((table) => {
                    const assigned = state.guests.filter(
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
                          {assigned.length} / {table.seats.length} seats
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
        )}
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
