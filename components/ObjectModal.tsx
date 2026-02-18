'use client';

import { useState, useEffect } from 'react';
import { VenueObject } from '@/types';
import { VENUE_OBJECT_TYPES, PIXELS_PER_FOOT } from '@/lib/constants';

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
  const [widthFt, setWidthFt] = useState(Math.round(200 / PIXELS_PER_FOOT));
  const [heightFt, setHeightFt] = useState(Math.round(80 / PIXELS_PER_FOOT));
  const [color, setColor] = useState('#9333EA');
  const [padTopFt, setPadTopFt] = useState(0);
  const [padRightFt, setPadRightFt] = useState(0);
  const [padBottomFt, setPadBottomFt] = useState(0);
  const [padLeftFt, setPadLeftFt] = useState(0);
  const [uniformPadding, setUniformPadding] = useState(true);

  useEffect(() => {
    if (object) {
      setType(object.type);
      setLabel(object.label);
      setWidthFt(Math.round(object.width / PIXELS_PER_FOOT));
      setHeightFt(Math.round(object.height / PIXELS_PER_FOOT));
      setColor(object.color);
      const p = object.padding || { top: 0, right: 0, bottom: 0, left: 0 };
      setPadTopFt(Math.round(p.top / PIXELS_PER_FOOT));
      setPadRightFt(Math.round(p.right / PIXELS_PER_FOOT));
      setPadBottomFt(Math.round(p.bottom / PIXELS_PER_FOOT));
      setPadLeftFt(Math.round(p.left / PIXELS_PER_FOOT));
      setUniformPadding(p.top === p.right && p.right === p.bottom && p.bottom === p.left);
    } else {
      setType('stage');
      setLabel('');
      setWidthFt(Math.round(200 / PIXELS_PER_FOOT));
      setHeightFt(Math.round(80 / PIXELS_PER_FOOT));
      setColor('#9333EA');
      setPadTopFt(0);
      setPadRightFt(0);
      setPadBottomFt(0);
      setPadLeftFt(0);
      setUniformPadding(true);
    }
  }, [object, isOpen]);

  const handleTypeChange = (newType: VenueObject['type']) => {
    setType(newType);
    const typeConfig = VENUE_OBJECT_TYPES.find((t) => t.type === newType);
    if (typeConfig && !object) {
      setLabel(typeConfig.label);
      setWidthFt(Math.round(typeConfig.defaultWidth / PIXELS_PER_FOOT));
      setHeightFt(Math.round(typeConfig.defaultHeight / PIXELS_PER_FOOT));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    onSave({
      id: object?.id,
      type,
      label: label.trim(),
      width: widthFt * PIXELS_PER_FOOT,
      height: heightFt * PIXELS_PER_FOOT,
      color,
      padding: {
        top: padTopFt * PIXELS_PER_FOOT,
        right: padRightFt * PIXELS_PER_FOOT,
        bottom: padBottomFt * PIXELS_PER_FOOT,
        left: padLeftFt * PIXELS_PER_FOOT,
      },
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
              <div className="grid grid-cols-4 gap-2">
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
                  Width (ft)
                </label>
                <input
                  type="number"
                  value={widthFt}
                  onChange={(e) => setWidthFt(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (ft)
                </label>
                <input
                  type="number"
                  value={heightFt}
                  onChange={(e) => setHeightFt(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Exclusion Zone Padding */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Exclusion Zone (ft)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={uniformPadding}
                    onChange={(e) => {
                      setUniformPadding(e.target.checked);
                      if (e.target.checked) {
                        setPadRightFt(padTopFt);
                        setPadBottomFt(padTopFt);
                        setPadLeftFt(padTopFt);
                      }
                    }}
                    className="rounded"
                  />
                  Uniform
                </label>
              </div>
              {uniformPadding ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">All sides</label>
                  <input
                    type="number"
                    value={padTopFt}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0);
                      setPadTopFt(v);
                      setPadRightFt(v);
                      setPadBottomFt(v);
                      setPadLeftFt(v);
                    }}
                    min={0}

                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Top</label>
                    <input
                      type="number"
                      value={padTopFt}
                      onChange={(e) => setPadTopFt(Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
  
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Right</label>
                    <input
                      type="number"
                      value={padRightFt}
                      onChange={(e) => setPadRightFt(Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
  
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Bottom</label>
                    <input
                      type="number"
                      value={padBottomFt}
                      onChange={(e) => setPadBottomFt(Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
  
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Left</label>
                    <input
                      type="number"
                      value={padLeftFt}
                      onChange={(e) => setPadLeftFt(Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
  
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Tables won&apos;t be placed within this area when arranging.</p>
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
