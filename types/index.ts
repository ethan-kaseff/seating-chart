export interface Guest {
  id: string;
  name: string;
  group: string;
  meal: string;
  dietary: string[];
  tableId: string | null;
  seatIndex: number | null;
}

export interface Seat {
  guestId: string | null;
}

export interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  seats: Seat[];
  color: string;
}

export interface VenueObject {
  id: string;
  type: 'stage' | 'bar' | 'dancefloor' | 'entrance' | 'custom';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface SeatingData {
  tables: Table[];
  guests: Guest[];
  objects: VenueObject[];
  floorSize: { width: number; height: number };
  zoom: number;
}

export interface Event {
  id: number;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  created_by: number;
  seating_data: SeatingData;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

export type SeatingAction =
  | { type: 'SET_DATA'; payload: SeatingData }
  | { type: 'ADD_TABLE'; payload: Table }
  | { type: 'UPDATE_TABLE'; payload: { id: string; updates: Partial<Table> } }
  | { type: 'DELETE_TABLE'; payload: string }
  | { type: 'ADD_GUEST'; payload: Guest }
  | { type: 'UPDATE_GUEST'; payload: { id: string; updates: Partial<Guest> } }
  | { type: 'DELETE_GUEST'; payload: string }
  | { type: 'ASSIGN_GUEST'; payload: { guestId: string; tableId: string; seatIndex: number } }
  | { type: 'UNASSIGN_GUEST'; payload: string }
  | { type: 'ADD_OBJECT'; payload: VenueObject }
  | { type: 'UPDATE_OBJECT'; payload: { id: string; updates: Partial<VenueObject> } }
  | { type: 'DELETE_OBJECT'; payload: string }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_FLOOR_SIZE'; payload: { width: number; height: number } };
