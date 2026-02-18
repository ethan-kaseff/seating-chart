'use client';

import { useState } from 'react';
import { FLOOR_PRESETS, PIXELS_PER_FOOT } from '@/lib/constants';

interface ArrangeOptions {
  layout: 'grid' | 'staggered';
  spacing: number;
  objectSpacing: number;
  maxCols: number;
}

interface FloorControlsProps {
  floorWidth: number;
  floorHeight: number;
  zoom: number;
  isFullscreen: boolean;
  onFloorSizeChange: (width: number, height: number) => void;
  onArrangeTables: (options: ArrangeOptions) => void;
  onAutoSeat: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  onZoomChange: (zoom: number) => void;
  onZoomFit: () => void;
  onToggleFullscreen: () => void;
}

export default function FloorControls({
  floorWidth,
  floorHeight,
  zoom,
  isFullscreen,
  onFloorSizeChange,
  onArrangeTables,
  onAutoSeat,
  snapToGrid,
  onToggleSnap,
  onZoomChange,
  onZoomFit,
  onToggleFullscreen,
}: FloorControlsProps) {
  const [customWidth, setCustomWidth] = useState(Math.round(floorWidth / PIXELS_PER_FOOT));
  const [customHeight, setCustomHeight] = useState(Math.round(floorHeight / PIXELS_PER_FOOT));
  const [arrangeLayout, setArrangeLayout] = useState<'grid' | 'staggered'>('grid');
  const [arrangeSpacingFt, setArrangeSpacingFt] = useState(Math.round(200 / PIXELS_PER_FOOT));
  const [arrangeObjectSpacingFt, setArrangeObjectSpacingFt] = useState(Math.round(30 / PIXELS_PER_FOOT));
  const [arrangeMaxCols, setArrangeMaxCols] = useState(0);
  const [showArrangeOptions, setShowArrangeOptions] = useState(false);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = FLOOR_PRESETS.find((p) => p.label === e.target.value);
    if (preset) {
      onFloorSizeChange(preset.width, preset.height);
      setCustomWidth(Math.round(preset.width / PIXELS_PER_FOOT));
      setCustomHeight(Math.round(preset.height / PIXELS_PER_FOOT));
    }
  };

  const handleCustomSize = () => {
    const w = Math.max(10, customWidth) * PIXELS_PER_FOOT;
    const h = Math.max(10, customHeight) * PIXELS_PER_FOOT;
    onFloorSizeChange(w, h);
  };

  const currentPreset = FLOOR_PRESETS.find(
    (p) => p.width === floorWidth && p.height === floorHeight
  );

  const handleArrange = () => {
    onArrangeTables({
      layout: arrangeLayout,
      spacing: arrangeSpacingFt * PIXELS_PER_FOOT,
      objectSpacing: arrangeObjectSpacingFt * PIXELS_PER_FOOT,
      maxCols: arrangeMaxCols,
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 space-y-2 text-sm">
      {/* Main controls row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Floor Size */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">Floor:</span>
          <select
            value={currentPreset?.label || ''}
            onChange={handlePresetChange}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="" disabled>
              Preset...
            </option>
            {FLOOR_PRESETS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={customWidth}
            onChange={(e) => setCustomWidth(parseInt(e.target.value) || 10)}
            onBlur={handleCustomSize}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSize()}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
            min={10}
            title="Width (feet)"
          />
          <span className="text-gray-400">&times;</span>
          <input
            type="number"
            value={customHeight}
            onChange={(e) => setCustomHeight(parseInt(e.target.value) || 10)}
            onBlur={handleCustomSize}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSize()}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
            min={10}
            title="Height (feet)"
          />
          <span className="text-gray-400 text-xs">ft</span>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Arrange Tables */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleArrange}
            className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium"
          >
            Arrange Tables
          </button>
          <button
            onClick={() => setShowArrangeOptions(!showArrangeOptions)}
            className={`px-1.5 py-1 rounded border font-medium ${
              showArrangeOptions
                ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                : 'border-gray-300 hover:bg-gray-100 text-gray-600'
            }`}
            title="Arrange options"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>

        <button
          onClick={onAutoSeat}
          className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
          title="Auto-assign unassigned guests to tables, keeping groups together"
        >
          Auto-Seat
        </button>

        <div className="w-px h-6 bg-gray-300" />

        {/* Snap to grid */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={onToggleSnap}
            className="rounded"
          />
          <span className="text-gray-600">Snap</span>
        </label>

        <div className="w-px h-6 bg-gray-300" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500 font-medium">Zoom:</span>
          <button
            onClick={() => onZoomChange(zoom - 0.1)}
            className="px-2 py-1 hover:bg-gray-100 rounded border border-gray-300"
          >
            -
          </button>
          <span className="w-12 text-center font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(zoom + 0.1)}
            className="px-2 py-1 hover:bg-gray-100 rounded border border-gray-300"
          >
            +
          </button>
          <button
            onClick={onZoomFit}
            className="px-2 py-1 hover:bg-gray-100 rounded border border-gray-300 ml-1"
            title="Fit to viewport"
          >
            Fit
          </button>
          <button
            onClick={() => onZoomChange(1)}
            className="px-2 py-1 hover:bg-gray-100 rounded border border-gray-300"
            title="Reset to 100%"
          >
            100%
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="px-2 py-1 hover:bg-gray-100 rounded border border-gray-300"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>

      {/* Arrange options panel */}
      {showArrangeOptions && (
        <div className="flex items-center gap-4 bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-200">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-medium">Layout:</span>
            <select
              value={arrangeLayout}
              onChange={(e) => setArrangeLayout(e.target.value as 'grid' | 'staggered')}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="grid">Grid</option>
              <option value="staggered">Staggered</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-medium">Table spacing:</span>
            <input
              type="range"
              min={6}
              max={30}
              step={1}
              value={arrangeSpacingFt}
              onChange={(e) => setArrangeSpacingFt(parseInt(e.target.value))}
              className="w-24"
            />
            <span className="text-gray-500 w-14 text-center">{arrangeSpacingFt} ft</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-medium">Object clearance:</span>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={arrangeObjectSpacingFt}
              onChange={(e) => setArrangeObjectSpacingFt(parseInt(e.target.value))}
              className="w-24"
            />
            <span className="text-gray-500 w-14 text-center">{arrangeObjectSpacingFt} ft</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-medium">Tables per row:</span>
            <input
              type="number"
              min={0}
              value={arrangeMaxCols}
              onChange={(e) => setArrangeMaxCols(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
              title="0 = auto"
            />
            <span className="text-gray-400 text-xs">(0 = auto)</span>
          </div>
        </div>
      )}
    </div>
  );
}
