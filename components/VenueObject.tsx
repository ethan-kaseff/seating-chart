'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { VenueObject as VenueObjectType } from '@/types';

interface VenueObjectProps {
  object: VenueObjectType;
  zoom: number;
  onDragEnd: (id: string, x: number, y: number) => void;
  onClick: (id: string, e?: React.MouseEvent) => void;
  onResize?: (id: string, width: number, height: number) => void;
  isSelected?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
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

export default function VenueObject({
  object,
  zoom,
  onDragEnd,
  onClick,
  onResize,
  isSelected,
  snapToGrid,
  gridSize = 20,
}: VenueObjectProps) {
  const objectRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; objX: number; objY: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const didDragRef = useRef(false);

  const snap = (v: number) => snapToGrid ? Math.round(v / gridSize) * gridSize : v;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    didDragRef.current = false;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      objX: object.x,
      objY: object.y,
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: object.width,
      h: object.height,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing && resizeStartRef.current && objectRef.current) {
      const dx = (e.clientX - resizeStartRef.current.x) / zoom;
      const dy = (e.clientY - resizeStartRef.current.y) / zoom;
      const newW = Math.max(30, resizeStartRef.current.w + dx);
      const newH = Math.max(30, resizeStartRef.current.h + dy);
      objectRef.current.style.width = `${newW}px`;
      objectRef.current.style.height = `${newH}px`;
      return;
    }

    if (!isDragging || !dragStartRef.current || !objectRef.current) return;

    didDragRef.current = true;
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;

    const newX = snap(dragStartRef.current.objX + dx);
    const newY = snap(dragStartRef.current.objY + dy);

    objectRef.current.style.left = `${newX}px`;
    objectRef.current.style.top = `${newY}px`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, isResizing, zoom, snapToGrid, gridSize]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isResizing && resizeStartRef.current) {
      const dx = (e.clientX - resizeStartRef.current.x) / zoom;
      const dy = (e.clientY - resizeStartRef.current.y) / zoom;
      const newW = Math.max(30, resizeStartRef.current.w + dx);
      const newH = Math.max(30, resizeStartRef.current.h + dy);
      setIsResizing(false);
      resizeStartRef.current = null;
      onResize?.(object.id, Math.round(newW), Math.round(newH));
      return;
    }

    if (!isDragging || !dragStartRef.current) return;

    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;

    const newX = snap(dragStartRef.current.objX + dx);
    const newY = snap(dragStartRef.current.objY + dy);

    setIsDragging(false);
    dragStartRef.current = null;

    onDragEnd(object.id, newX, newY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, isResizing, zoom, object.id, onDragEnd, onResize, snapToGrid, gridSize]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const getObjectStyle = () => {
    switch (object.type) {
      case 'stage':
        return 'bg-purple-600';
      case 'bar':
        return 'bg-amber-600';
      case 'dancefloor':
        return 'bg-pink-500';
      case 'entrance':
        return 'bg-green-600';
      case 'buffet':
        return 'bg-orange-600';
      case 'dj':
        return 'bg-indigo-600';
      case 'photobooth':
        return 'bg-cyan-600';
      case 'restrooms':
        return 'bg-slate-600';
      case 'kitchen':
        return 'bg-yellow-700';
      default:
        return 'bg-gray-600';
    }
  };

  const pad = object.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const hasPadding = pad.top > 0 || pad.right > 0 || pad.bottom > 0 || pad.left > 0;

  return (
    <>
      {/* Exclusion zone visualization */}
      {hasPadding && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: object.x - pad.left,
            top: object.y - pad.top,
            width: object.width + pad.left + pad.right,
            height: object.height + pad.top + pad.bottom,
            border: '2px dashed rgba(239, 68, 68, 0.4)',
            borderRadius: 4,
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
          }}
        />
      )}

      <div
        ref={objectRef}
        className={`absolute flex flex-col items-center justify-center text-white font-semibold shadow-md rounded ${
          isDragging ? 'z-50 cursor-grabbing' : isResizing ? 'z-50' : 'cursor-grab'
        } ${getObjectStyle()} ${isSelected ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}
        style={{
          left: object.x,
          top: object.y,
          width: object.width,
          height: object.height,
          backgroundColor: object.color || undefined,
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          if (!isDragging && !isResizing && !didDragRef.current) {
            e.stopPropagation();
            onClick(object.id, e);
          }
        }}
      >
        <span className="text-2xl">{OBJECT_ICONS[object.type] || '📦'}</span>
        <span className="text-xs mt-1">{object.label}</span>

        {/* Resize handle */}
        {onResize && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeMouseDown}
            style={{
              background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.6) 50%)',
            }}
          />
        )}
      </div>
    </>
  );
}
