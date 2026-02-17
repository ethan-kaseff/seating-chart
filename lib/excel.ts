import * as XLSX from 'xlsx';
import { Guest, Table, VenueObject, SeatingData } from '@/types';
import { TABLE_COLORS } from '@/lib/constants';

type ImportedGuest = Omit<Guest, 'id' | 'tableId' | 'seatIndex'>;

export type ImportResult =
  | { type: 'guests'; guests: ImportedGuest[] }
  | { type: 'full'; data: SeatingData };

function parseGuestRows(rows: Record<string, string>[]): ImportedGuest[] {
  return rows.map((row) => {
    const dietaryRaw = row['Dietary'] || row['dietary'] || row['Dietary Restrictions'] || '';
    return {
      name: row['Name'] || row['name'] || row['Guest Name'] || '',
      group: row['Group'] || row['group'] || row['Party'] || '',
      meal: row['Meal'] || row['meal'] || row['Meal Preference'] || 'Standard',
      dietary: dietaryRaw
        ? dietaryRaw.split(',').map((d: string) => d.trim()).filter(Boolean)
        : [],
    };
  }).filter((g) => g.name);
}

function isFullSeatingChart(workbook: XLSX.WorkBook): boolean {
  const names = workbook.SheetNames.map((n) => n.toLowerCase());
  return names.includes('tables') && names.includes('guests');
}

function getSheet(workbook: XLSX.WorkBook, name: string): XLSX.WorkSheet | null {
  const match = workbook.SheetNames.find((n) => n.toLowerCase() === name.toLowerCase());
  return match ? workbook.Sheets[match] : null;
}

// The old HTML app uses PIXELS_PER_FOOT = 15 for coordinates.
// Floor size is stored in feet, table/object X/Y in pixels, object width/height in feet.
const OLD_APP_PIXELS_PER_FOOT = 15;

function importFullSeatingChart(workbook: XLSX.WorkBook): SeatingData {
  // Floor settings — old app stores in feet, new app uses pixels
  let floorSize = { width: 1200, height: 800 };
  const floorSheet = getSheet(workbook, 'FloorSettings');
  if (floorSheet) {
    const floorRows = XLSX.utils.sheet_to_json<Record<string, number>>(floorSheet);
    if (floorRows[0]) {
      const fw = floorRows[0]['FloorWidth'];
      const fh = floorRows[0]['FloorHeight'];
      if (fw && fh) {
        // Convert feet to pixels for the new app
        floorSize = {
          width: fw * OLD_APP_PIXELS_PER_FOOT,
          height: fh * OLD_APP_PIXELS_PER_FOOT,
        };
      }
    }
  }

  // Tables — build a map from excel TableId to internal id
  // Old app exports X/Y already in pixels, so use them directly
  const tableIdMap = new Map<number, string>();
  const tables: Table[] = [];
  const tablesSheet = getSheet(workbook, 'Tables');
  if (tablesSheet) {
    const tableRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(tablesSheet);
    tableRows.forEach((row, i) => {
      const excelId = Number(row['TableId']);
      const id = `table-${Date.now()}-${i}`;
      if (!isNaN(excelId)) {
        tableIdMap.set(excelId, id);
      }
      tables.push({
        id,
        name: String(row['Table'] || row['Name'] || `Table ${i + 1}`),
        x: Number(row['X']) || 100 + (i % 4) * 150,
        y: Number(row['Y']) || 100 + Math.floor(i / 4) * 150,
        seats: Array(Number(row['SeatCount'] || row['Capacity'] || 8))
          .fill(null)
          .map(() => ({ guestId: null })),
        color: TABLE_COLORS[i % TABLE_COLORS.length],
      });
    });
  }

  // Objects — old app exports X/Y in pixels, width/height in feet
  const objects: VenueObject[] = [];
  const objectsSheet = getSheet(workbook, 'Objects');
  if (objectsSheet) {
    const objectRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(objectsSheet);
    objectRows.forEach((row, i) => {
      const rawType = String(row['Type'] || 'custom').toLowerCase();
      const type = (['stage', 'bar', 'dancefloor', 'entrance', 'custom'].includes(rawType)
        ? rawType
        : 'custom') as VenueObject['type'];
      objects.push({
        id: `object-${Date.now()}-${i}`,
        type,
        label: String(row['Label'] || row['Name'] || type),
        x: Number(row['X']) || 0,
        y: Number(row['Y']) || 0,
        // Convert width/height from feet to pixels
        width: (Number(row['Width']) || 10) * OLD_APP_PIXELS_PER_FOOT,
        height: (Number(row['Height']) || 10) * OLD_APP_PIXELS_PER_FOOT,
        color: '#6B7280',
      });
    });
  }

  // Guests with seat assignments
  const guests: Guest[] = [];
  const guestsSheet = getSheet(workbook, 'Guests');
  if (guestsSheet) {
    const guestRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(guestsSheet);
    guestRows.forEach((row, i) => {
      // TableId can be numeric or empty string from old app
      const rawTableId = row['TableId'];
      const excelTableId = (rawTableId != null && rawTableId !== '')
        ? Number(rawTableId)
        : NaN;
      const tableId = !isNaN(excelTableId) ? (tableIdMap.get(excelTableId) || null) : null;

      const rawSeatIndex = row['SeatIndex'];
      const seatIndex = (rawSeatIndex != null && rawSeatIndex !== '')
        ? Number(rawSeatIndex)
        : null;

      // Dietary can be a single value like "None" or comma-separated
      const dietaryRaw = String(row['Dietary'] || row['Dietary Restrictions'] || '');
      const dietary = dietaryRaw
        ? dietaryRaw.split(',').map((d) => d.trim()).filter((d) => d && d !== 'None' && d !== 'Unknown')
        : [];

      const guest: Guest = {
        id: `guest-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        name: String(row['Name'] || ''),
        group: String(row['Group'] || row['Party'] || ''),
        meal: String(row['Meal'] || 'Standard'),
        dietary,
        tableId,
        seatIndex: tableId && seatIndex != null && !isNaN(seatIndex) ? seatIndex : null,
      };

      // Update the table's seat to reference this guest
      if (guest.tableId && guest.seatIndex != null) {
        const table = tables.find((t) => t.id === guest.tableId);
        if (table && guest.seatIndex < table.seats.length) {
          table.seats[guest.seatIndex] = { guestId: guest.id };
        }
      }

      if (guest.name) {
        guests.push(guest);
      }
    });
  }

  return { tables, guests, objects, floorSize, zoom: 1 };
}

export function importFromExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (isFullSeatingChart(workbook)) {
          resolve({ type: 'full', data: importFullSeatingChart(workbook) });
        } else {
          // Simple guest-only file: read the first sheet
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet);
          resolve({ type: 'guests', guests: parseGuestRows(rows) });
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// Keep for backward compatibility
export function importGuestsFromExcel(file: File): Promise<ImportedGuest[]> {
  return new Promise((resolve, reject) => {
    importFromExcel(file).then((result) => {
      if (result.type === 'guests') {
        resolve(result.guests);
      } else {
        resolve(result.data.guests.map(({ id, tableId, seatIndex, ...rest }) => rest));
      }
    }).catch(reject);
  });
}

export function exportToExcel(data: SeatingData, eventTitle: string) {
  const workbook = XLSX.utils.book_new();

  // Build a stable numeric ID map for tables
  const tableIdToNum = new Map<string, number>();
  data.tables.forEach((t, i) => tableIdToNum.set(t.id, i + 1));

  // FloorSettings sheet
  const floorSheet = XLSX.utils.json_to_sheet([{
    FloorWidth: data.floorSize.width,
    FloorHeight: data.floorSize.height,
  }]);
  XLSX.utils.book_append_sheet(workbook, floorSheet, 'FloorSettings');

  // Tables sheet
  const tableData = data.tables.map((table) => ({
    TableId: tableIdToNum.get(table.id),
    Table: table.name,
    SeatCount: table.seats.length,
    X: Math.round(table.x * 100) / 100,
    Y: Math.round(table.y * 100) / 100,
  }));
  const tableSheet = XLSX.utils.json_to_sheet(tableData);
  XLSX.utils.book_append_sheet(workbook, tableSheet, 'Tables');

  // Objects sheet
  const objectData = data.objects.map((obj, i) => ({
    ObjectId: i + 1,
    Type: obj.type,
    Label: obj.label,
    X: Math.round(obj.x * 100) / 100,
    Y: Math.round(obj.y * 100) / 100,
    Width: obj.width,
    Height: obj.height,
  }));
  const objectsSheet = XLSX.utils.json_to_sheet(objectData);
  XLSX.utils.book_append_sheet(workbook, objectsSheet, 'Objects');

  // Guests sheet
  const guestData = data.guests.map((guest) => {
    const table = data.tables.find((t) => t.id === guest.tableId);
    return {
      Name: guest.name,
      Group: guest.group,
      Meal: guest.meal,
      Dietary: guest.dietary.join(', '),
      Table: table?.name || '',
      TableId: guest.tableId ? (tableIdToNum.get(guest.tableId) ?? '') : '',
      SeatIndex: guest.seatIndex ?? '',
    };
  });
  const guestSheet = XLSX.utils.json_to_sheet(guestData);
  XLSX.utils.book_append_sheet(workbook, guestSheet, 'Guests');

  // Download
  const fileName = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_seating_chart.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
