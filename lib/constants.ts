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

export const VENUE_OBJECT_TYPES = [
  { type: 'stage', label: 'Stage', defaultWidth: 200, defaultHeight: 80 },
  { type: 'bar', label: 'Bar', defaultWidth: 120, defaultHeight: 40 },
  { type: 'dancefloor', label: 'Dance Floor', defaultWidth: 150, defaultHeight: 150 },
  { type: 'entrance', label: 'Entrance', defaultWidth: 60, defaultHeight: 30 },
  { type: 'custom', label: 'Custom', defaultWidth: 80, defaultHeight: 80 },
] as const;

export const DEFAULT_SEATING_DATA = {
  tables: [],
  guests: [],
  objects: [],
  floorSize: { width: 1200, height: 800 },
  zoom: 1,
};
