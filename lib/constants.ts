export const MEAL_OPTIONS = [
  'Standard',
  'Vegetarian',
  'Vegan',
  'Kosher',
  'Halal',
  'Gluten-Free',
  'Kids Meal',
];

export const DIETARY_OPTIONS = [
  'Nut Allergy',
  'Dairy-Free',
  'Shellfish Allergy',
  'Egg Allergy',
  'Soy Allergy',
  'Low Sodium',
  'Diabetic-Friendly',
];

export const TABLE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export const PIXELS_PER_FOOT = 15;

export const FLOOR_PRESETS = [
  { label: 'Small (40×30 ft)', width: 40 * 15, height: 30 * 15 },
  { label: 'Medium (60×40 ft)', width: 60 * 15, height: 40 * 15 },
  { label: 'Large (100×60 ft)', width: 100 * 15, height: 60 * 15 },
  { label: 'Ballroom (150×80 ft)', width: 150 * 15, height: 80 * 15 },
];

export const GROUP_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#84CC16', '#14B8A6', '#6366F1', '#F43F5E',
];

export const VENUE_OBJECT_TYPES = [
  { type: 'stage', label: 'Stage', defaultWidth: 200, defaultHeight: 80 },
  { type: 'bar', label: 'Bar', defaultWidth: 120, defaultHeight: 40 },
  { type: 'dancefloor', label: 'Dance Floor', defaultWidth: 150, defaultHeight: 150 },
  { type: 'entrance', label: 'Entrance', defaultWidth: 60, defaultHeight: 30 },
  { type: 'buffet', label: 'Buffet', defaultWidth: 150, defaultHeight: 50 },
  { type: 'dj', label: 'DJ Booth', defaultWidth: 80, defaultHeight: 60 },
  { type: 'photobooth', label: 'Photo Booth', defaultWidth: 80, defaultHeight: 80 },
  { type: 'restrooms', label: 'Restrooms', defaultWidth: 80, defaultHeight: 60 },
  { type: 'kitchen', label: 'Kitchen', defaultWidth: 120, defaultHeight: 80 },
  { type: 'custom', label: 'Custom', defaultWidth: 80, defaultHeight: 80 },
] as const;

export const DEFAULT_SEATING_DATA = {
  tables: [],
  guests: [],
  objects: [],
  floorSize: { width: 1200, height: 800 },
  zoom: 1,
};
