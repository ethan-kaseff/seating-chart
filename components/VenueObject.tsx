'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { VenueObject as VenueObjectType } from '@/types';

interface VenueObjectProps {
  object: VenueObjectType;
  zoom: number;
  onDragEnd: (id: string, x: number, y: number) => void;
  onClick: (id: string) => void;
}

const OBJECT_ICONS: Record<string, string> = {
  stage: '🎭',
  bar: '🍸',
  dancefloor: '💃',
  entrance: '🚪',
  custom: '📦',
};

export default function VenueObject({
  object,
  zoom,
  onDragEnd,
  onClick,
}: VenueObjectProps) {
  const objectRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; objX: number; objY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      objX: object.x,
      objY: object.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !objectRef.current) return;

    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;

    const newX = dragStartRef.current.objX + dx;
    const newY = dragStartRef.current.objY + dy;

    objectRef.current.style.left = `${newX}px`;
    objectRef.current.style.top = `${newY}px`;
  }, [isDragging, zoom]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;

    const newX = dragStartRef.current.objX + dx;
    const newY = dragStartRef.current.objY + dy;

    setIsDragging(false);
    dragStartRef.current = null;

    onDragEnd(object.id, newX, newY);
  }, [isDragging, zoom, object.id, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div
      ref={objectRef}
      className={`absolute flex flex-col items-center justify-center text-white font-semibold shadow-md rounded ${
        isDragging ? 'z-50 cursor-grabbing' : 'cursor-grab'
      } ${getObjectStyle()}`}
      style={{
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
        backgroundColor: object.color || undefined,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick(object.id);
        }
      }}
    >
      <span className="text-2xl">{OBJECT_ICONS[object.type] || '📦'}</span>
      <span className="text-xs mt-1">{object.label}</span>
    </div>
  );
}
