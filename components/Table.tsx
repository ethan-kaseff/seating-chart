'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Table as TableType, Guest } from '@/types';

interface TableProps {
  table: TableType;
  guests: Guest[];
  zoom: number;
  onDragEnd: (id: string, x: number, y: number) => void;
  onSeatClick: (tableId: string, seatIndex: number, guestId: string | null) => void;
  onTableClick: (tableId: string) => void;
  selectedGuestId: string | null;
  selectedSeatInfo: { tableId: string; seatIndex: number } | null;
}

export default function Table({
  table,
  guests,
  zoom,
  onDragEnd,
  onSeatClick,
  onTableClick,
  selectedGuestId,
  selectedSeatInfo,
}: TableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; tableX: number; tableY: number } | null>(null);

  const tableSize = 100;
  const seatSize = 28;
  const seatDistance = tableSize / 2 + 20;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking on a seat
    if ((e.target as HTMLElement).classList.contains('table-seat')) return;

    e.preventDefault();
    setIsDragging(true);

    // Store the initial mouse position and table position
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tableX: table.x,
      tableY: table.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !tableRef.current) return;

    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;

    const newX = dragStartRef.current.tableX + dx;
    const newY = dragStartRef.current.tableY + dy;

    // Update position visually
    tableRef.current.style.left = `${newX - tableSize / 2 - seatDistance}px`;
    tableRef.current.style.top = `${newY - tableSize / 2 - seatDistance}px`;
  }, [isDragging, zoom, tableSize, seatDistance]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;

    const newX = dragStartRef.current.tableX + dx;
    const newY = dragStartRef.current.tableY + dy;

    setIsDragging(false);
    dragStartRef.current = null;

    onDragEnd(table.id, newX, newY);
  }, [isDragging, zoom, table.id, onDragEnd]);

  // Use document-level event listeners for drag
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

  const getGuestForSeat = (seatIndex: number): Guest | undefined => {
    return guests.find(
      (g) => g.tableId === table.id && g.seatIndex === seatIndex
    );
  };

  const isSeatSelected = (seatIndex: number): boolean => {
    return selectedSeatInfo?.tableId === table.id && selectedSeatInfo?.seatIndex === seatIndex;
  };

  return (
    <div
      ref={tableRef}
      className={`absolute ${isDragging ? 'z-50 cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: table.x - tableSize / 2 - seatDistance,
        top: table.y - tableSize / 2 - seatDistance,
        width: tableSize + seatDistance * 2,
        height: tableSize + seatDistance * 2,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Table center */}
      <div
        className="absolute rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg cursor-pointer hover:opacity-90"
        style={{
          width: tableSize,
          height: tableSize,
          left: seatDistance,
          top: seatDistance,
          backgroundColor: table.color,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onTableClick(table.id);
        }}
      >
        {table.name}
      </div>

      {/* Seats */}
      {table.seats.map((_, index) => {
        const angle = (index / table.seats.length) * 2 * Math.PI - Math.PI / 2;
        const seatX = seatDistance + tableSize / 2 + Math.cos(angle) * seatDistance - seatSize / 2;
        const seatY = seatDistance + tableSize / 2 + Math.sin(angle) * seatDistance - seatSize / 2;
        const guest = getGuestForSeat(index);
        const isSelected = isSeatSelected(index);
        const isAvailableForGuest = selectedGuestId && !guest;

        return (
          <div
            key={index}
            className={`table-seat absolute rounded-full border-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
              isSelected
                ? 'bg-blue-200 border-blue-500 ring-2 ring-blue-400'
                : guest
                ? 'bg-gray-700 border-gray-700 text-white hover:ring-2 hover:ring-gray-400'
                : isAvailableForGuest
                ? 'bg-green-100 border-green-400 hover:bg-green-200 animate-pulse'
                : 'bg-white border-gray-300 hover:border-gray-400'
            }`}
            style={{
              width: seatSize,
              height: seatSize,
              left: seatX,
              top: seatY,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSeatClick(table.id, index, guest?.id || null);
            }}
            title={guest?.name || (selectedGuestId ? 'Click to place guest here' : `Seat ${index + 1}`)}
          >
            {guest ? guest.name.charAt(0).toUpperCase() : ''}
          </div>
        );
      })}
    </div>
  );
}
