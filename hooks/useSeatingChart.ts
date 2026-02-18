'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import { SeatingData, SeatingAction, Table, Guest, VenueObject } from '@/types';
import { DEFAULT_SEATING_DATA, TABLE_COLORS } from '@/lib/constants';

const MAX_HISTORY = 50;

interface HistoryState {
  past: SeatingData[];
  present: SeatingData;
  future: SeatingData[];
}

type HistoryAction =
  | { type: 'DISPATCH'; action: SeatingAction }
  | { type: 'UNDO' }
  | { type: 'REDO' };

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

// Actions that don't create undo history (transient UI state)
const NON_UNDOABLE_ACTIONS = new Set(['SET_ZOOM', 'SET_FLOOR_SIZE']);

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'DISPATCH': {
      const newPresent = seatingReducer(state.present, action.action);
      if (newPresent === state.present) return state;

      if (NON_UNDOABLE_ACTIONS.has(action.action.type)) {
        return { ...state, present: newPresent };
      }

      const past = [...state.past, state.present].slice(-MAX_HISTORY);
      return { past, present: newPresent, future: [] };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
      };
    }
    default:
      return state;
  }
}

export function useSeatingChart(
  initialData: SeatingData | null,
  onSave?: (data: SeatingData) => void
) {
  const [historyState, historyDispatch] = useReducer(historyReducer, {
    past: [],
    present: initialData || DEFAULT_SEATING_DATA,
    future: [],
  });

  const state = historyState.present;
  const canUndo = historyState.past.length > 0;
  const canRedo = historyState.future.length > 0;

  const dispatch = useCallback((action: SeatingAction) => {
    historyDispatch({ type: 'DISPATCH', action });
  }, []);

  const undo = useCallback(() => {
    historyDispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    historyDispatch({ type: 'REDO' });
  }, []);

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

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

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
  }, [state.tables.length, dispatch]);

  const updateTable = useCallback((id: string, updates: Partial<Table>) => {
    dispatch({ type: 'UPDATE_TABLE', payload: { id, updates } });
  }, [dispatch]);

  const deleteTable = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TABLE', payload: id });
  }, [dispatch]);

  const addGuest = useCallback((guest: Omit<Guest, 'id'>) => {
    const id = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGuest: Guest = { ...guest, id };
    dispatch({ type: 'ADD_GUEST', payload: newGuest });
    return newGuest;
  }, [dispatch]);

  const updateGuest = useCallback((id: string, updates: Partial<Guest>) => {
    dispatch({ type: 'UPDATE_GUEST', payload: { id, updates } });
  }, [dispatch]);

  const deleteGuest = useCallback((id: string) => {
    dispatch({ type: 'DELETE_GUEST', payload: id });
  }, [dispatch]);

  const assignGuest = useCallback(
    (guestId: string, tableId: string, seatIndex: number) => {
      dispatch({ type: 'ASSIGN_GUEST', payload: { guestId, tableId, seatIndex } });
    },
    [dispatch]
  );

  const unassignGuest = useCallback((guestId: string) => {
    dispatch({ type: 'UNASSIGN_GUEST', payload: guestId });
  }, [dispatch]);

  const addObject = useCallback((object: Omit<VenueObject, 'id'>) => {
    const id = `object-${Date.now()}`;
    const newObject: VenueObject = { ...object, id };
    dispatch({ type: 'ADD_OBJECT', payload: newObject });
    return newObject;
  }, [dispatch]);

  const updateObject = useCallback((id: string, updates: Partial<VenueObject>) => {
    dispatch({ type: 'UPDATE_OBJECT', payload: { id, updates } });
  }, [dispatch]);

  const deleteObject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_OBJECT', payload: id });
  }, [dispatch]);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: Math.max(0.5, Math.min(2, zoom)) });
  }, [dispatch]);

  const setData = useCallback((data: SeatingData) => {
    dispatch({ type: 'SET_DATA', payload: data });
  }, [dispatch]);

  const setFloorSize = useCallback((width: number, height: number) => {
    dispatch({ type: 'SET_FLOOR_SIZE', payload: { width, height } });
  }, [dispatch]);

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
    setFloorSize,
    getUnassignedGuests,
    getGuestById,
    getTableById,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
