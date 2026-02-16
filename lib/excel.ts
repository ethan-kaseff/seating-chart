import * as XLSX from 'xlsx';
import { Guest, Table, SeatingData } from '@/types';

export function importGuestsFromExcel(file: File): Promise<Omit<Guest, 'id' | 'tableId' | 'seatIndex'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet);

        const guests = rows.map((row) => ({
          name: row['Name'] || row['name'] || row['Guest Name'] || '',
          group: row['Group'] || row['group'] || row['Party'] || '',
          meal: row['Meal'] || row['meal'] || row['Meal Preference'] || 'Standard',
          dietary: row['Dietary'] || row['dietary'] || row['Dietary Restrictions']
            ? (row['Dietary'] || row['dietary'] || row['Dietary Restrictions'])
                .split(',')
                .map((d: string) => d.trim())
                .filter(Boolean)
            : [],
        })).filter((g) => g.name);

        resolve(guests);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function exportToExcel(data: SeatingData, eventTitle: string) {
  const workbook = XLSX.utils.book_new();

  // Guest list sheet
  const guestData = data.guests.map((guest) => {
    const table = data.tables.find((t) => t.id === guest.tableId);
    return {
      'Name': guest.name,
      'Group': guest.group,
      'Meal': guest.meal,
      'Dietary Restrictions': guest.dietary.join(', '),
      'Table': table?.name || 'Unassigned',
      'Seat': guest.seatIndex !== null ? guest.seatIndex + 1 : '',
    };
  });

  const guestSheet = XLSX.utils.json_to_sheet(guestData);
  XLSX.utils.book_append_sheet(workbook, guestSheet, 'Guests');

  // Table summary sheet
  const tableData = data.tables.map((table) => {
    const assignedGuests = data.guests.filter((g) => g.tableId === table.id);
    return {
      'Table': table.name,
      'Capacity': table.seats.length,
      'Assigned': assignedGuests.length,
      'Available': table.seats.length - assignedGuests.length,
      'Guests': assignedGuests.map((g) => g.name).join(', '),
    };
  });

  const tableSheet = XLSX.utils.json_to_sheet(tableData);
  XLSX.utils.book_append_sheet(workbook, tableSheet, 'Tables');

  // Summary sheet
  const unassignedCount = data.guests.filter((g) => !g.tableId).length;
  const summaryData = [
    { 'Metric': 'Total Guests', 'Value': data.guests.length },
    { 'Metric': 'Assigned Guests', 'Value': data.guests.length - unassignedCount },
    { 'Metric': 'Unassigned Guests', 'Value': unassignedCount },
    { 'Metric': 'Total Tables', 'Value': data.tables.length },
    { 'Metric': 'Total Seats', 'Value': data.tables.reduce((acc, t) => acc + t.seats.length, 0) },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Download
  const fileName = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_seating_chart.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
