'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import { SeatingData, SeatingAction, Table, Guest, VenueObject } from '@/types';
import { DEFAULT_SEATING_DATA, TABLE_COLORS } from '@/lib/constants';

function seatingReducer(state: SeatingData, action: SeatingAction): SeatingData {
  switch (action.type) {
    case 'SET_DATA':
      return action.payload;

    case 'ADD_TABLE':
      return { ...state, tables: [...state.tables, action.payload] };

    case 'UPDATE_TABLE':
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      };

    case 'DELETE_TABLE': {
      const tableId = action.payload;
      return {
        ...state,
        tables: state.tables.filter((t) => t.id !== tableId),
        guests: state.guests.map((g) =>
          g.tableId === tableId ? { ...g, tableId: null, seatIndex: null } : g
        ),
      };
    }

    case 'ADD_GUEST':
      return { ...state, guests: [...state.guests, action.payload] };

    case 'UPDATE_GUEST':
      return {
        ...state,
        guests: state.guests.map((g) =>
          g.id === action.payload.id ? { ...g, ...action.payload.updates } : g
        ),
      };

    case 'DELETE_GUEST':
      return {
        ...state,
        guests: state.guests.filter((g) => g.id !== action.payload),
      };

    case 'ASSIGN_GUEST': {
      const { guestId, tableId, seatIndex } = action.payload;
      // Unassign any guest currently in that seat
      const updatedGuests = state.guests.map((g) => {
        if (g.tableId === tableId && g.seatIndex === seatIndex) {
          return { ...g, tableId: null, seatIndex: null };
        }
        if (g.id === guestId) {
          return { ...g, tableId, seatIndex };
        }
        return g;
      });
      return { ...state, guests: updatedGuests };
    }

    case 'UNASSIGN_GUEST':
      return {
        ...state,
        guests: state.guests.map((g) =>
          g.id === action.payload ? { ...g, tableId: null, seatIndex: null } : g
        ),
      };

    case 'ADD_OBJECT':
      return { ...state, objects: [...state.objects, action.payload] };

    case 'UPDATE_OBJECT':
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.payload.id ? { ...o, ...action.payload.updates } : o
        ),
      };

    case 'DELETE_OBJECT':
      return {
        ...state,
        objects: state.objects.filter((o) => o.id !== action.payload),
      };

    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };

    case 'SET_FLOOR_SIZE':
      return { ...state, floorSize: action.payload };

    default:
      return state;
  }
}

export function useSeatingChart(
  initialData: SeatingData | null,
  onSave?: (data: SeatingData) => void
) {
  const [state, dispatch] = useReducer(
    seatingReducer,
    initialData || DEFAULT_SEATING_DATA
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save with debounce
  useEffect(() => {
    if (!onSave) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onSave(state);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, onSave]);

  const addTable = useCallback((seatCount: number = 8, name?: string) => {
    const id = `table-${Date.now()}`;
    const tableNumber = state.tables.length + 1;
    const table: Table = {
      id,
      name: name || `Table ${tableNumber}`,
      x: 100 + (state.tables.length % 4) * 150,
      y: 100 + Math.floor(state.tables.length / 4) * 150,
      seats: Array(seatCount).fill(null).map(() => ({ guestId: null })),
      color: TABLE_COLORS[state.tables.length % TABLE_COLORS.length],
    };
    dispatch({ type: 'ADD_TABLE', payload: table });
    return table;
  }, [state.tables.length]);

  const updateTable = useCallback((id: string, updates: Partial<Table>) => {
    dispatch({ type: 'UPDATE_TABLE', payload: { id, updates } });
  }, []);

  const deleteTable = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TABLE', payload: id });
  }, []);

  const addGuest = useCallback((guest: Omit<Guest, 'id'>) => {
    const id = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGuest: Guest = { ...guest, id };
    dispatch({ type: 'ADD_GUEST', payload: newGuest });
    return newGuest;
  }, []);

  const updateGuest = useCallback((id: string, updates: Partial<Guest>) => {
    dispatch({ type: 'UPDATE_GUEST', payload: { id, updates } });
  }, []);

  const deleteGuest = useCallback((id: string) => {
    dispatch({ type: 'DELETE_GUEST', payload: id });
  }, []);

  const assignGuest = useCallback(
    (guestId: string, tableId: string, seatIndex: number) => {
      dispatch({ type: 'ASSIGN_GUEST', payload: { guestId, tableId, seatIndex } });
    },
    []
  );

  const unassignGuest = useCallback((guestId: string) => {
    dispatch({ type: 'UNASSIGN_GUEST', payload: guestId });
  }, []);

  const addObject = useCallback((object: Omit<VenueObject, 'id'>) => {
    const id = `object-${Date.now()}`;
    const newObject: VenueObject = { ...object, id };
    dispatch({ type: 'ADD_OBJECT', payload: newObject });
    return newObject;
  }, []);

  const updateObject = useCallback((id: string, updates: Partial<VenueObject>) => {
    dispatch({ type: 'UPDATE_OBJECT', payload: { id, updates } });
  }, []);

  const deleteObject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_OBJECT', payload: id });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: Math.max(0.5, Math.min(2, zoom)) });
  }, []);

  const setData = useCallback((data: SeatingData) => {
    dispatch({ type: 'SET_DATA', payload: data });
  }, []);

  const getUnassignedGuests = useCallback(() => {
    return state.guests.filter((g) => g.tableId === null);
  }, [state.guests]);

  const getGuestById = useCallback(
    (id: string) => {
      return state.guests.find((g) => g.id === id) || null;
    },
    [state.guests]
  );

  const getTableById = useCallback(
    (id: string) => {
      return state.tables.find((t) => t.id === id) || null;
    },
    [state.tables]
  );

  return {
    state,
    dispatch,
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
    getUnassignedGuests,
    getGuestById,
    getTableById,
  };
}
