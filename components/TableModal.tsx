'use client';

import { useState, useEffect } from 'react';
import { Table } from '@/types';
import { TABLE_COLORS } from '@/lib/constants';

interface TableModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; seatCount: number; color: string; id?: string }) => void;
  onDelete?: () => void;
}

export default function TableModal({
  table,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: TableModalProps) {
  const [name, setName] = useState('');
  const [seatCount, setSeatCount] = useState(8);
  const [color, setColor] = useState(TABLE_COLORS[0]);

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
  }, [table, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: table?.id,
      name: name.trim(),
      seatCount,
      color,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
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
