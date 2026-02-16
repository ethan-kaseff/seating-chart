'use client';

import { useState, useEffect } from 'react';
import { VenueObject } from '@/types';
import { VENUE_OBJECT_TYPES } from '@/lib/constants';

interface ObjectModalProps {
  object: VenueObject | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<VenueObject, 'id' | 'x' | 'y'> & { id?: string }) => void;
  onDelete?: () => void;
}

export default function ObjectModal({
  object,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: ObjectModalProps) {
  const [type, setType] = useState<VenueObject['type']>('stage');
  const [label, setLabel] = useState('');
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(80);
  const [color, setColor] = useState('#9333EA');

  useEffect(() => {
    if (object) {
      setType(object.type);
      setLabel(object.label);
      setWidth(object.width);
      setHeight(object.height);
      setColor(object.color);
    } else {
      setType('stage');
      setLabel('');
      setWidth(200);
      setHeight(80);
      setColor('#9333EA');
    }
  }, [object, isOpen]);

  const handleTypeChange = (newType: VenueObject['type']) => {
    setType(newType);
    const typeConfig = VENUE_OBJECT_TYPES.find((t) => t.type === newType);
    if (typeConfig && !object) {
      setLabel(typeConfig.label);
      setWidth(typeConfig.defaultWidth);
      setHeight(typeConfig.defaultHeight);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    onSave({
      id: object?.id,
      type,
      label: label.trim(),
      width,
      height,
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
            {object ? 'Edit Object' : 'Add Venue Object'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {VENUE_OBJECT_TYPES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => handleTypeChange(t.type)}
                    className={`px-3 py-2 text-sm rounded-lg border ${
                      type === t.type
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Object label"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Math.max(20, parseInt(e.target.value) || 20))}
                  min={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Math.max(20, parseInt(e.target.value) || 20))}
                  min={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex gap-3 pt-4">
              {object && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this object?')) {
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
                {object ? 'Save Changes' : 'Add Object'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
