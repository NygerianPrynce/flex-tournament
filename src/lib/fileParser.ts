import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedRow {
  [key: string]: string | number;
}

export function parseCSV(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false, // No header - just read all rows
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<string[]>) => {
        // Convert array of arrays to array of objects with first column as 'name'
        const data = results.data.map((row, index) => {
          // Take first column value as team name
          const name = row[0] ? String(row[0]).trim() : '';
          return { name, _rowIndex: index } as ParsedRow;
        }).filter(row => row.name); // Filter out empty rows
        resolve(data);
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

export function parseXLSX(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        // Convert to array of arrays (no header)
        const arrayData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as string[][];
        // Take first column from all rows
        const parsedData = arrayData
          .map((row, index) => {
            const name = row[0] ? String(row[0]).trim() : '';
            return { name, _rowIndex: index } as ParsedRow;
          })
          .filter(row => row.name); // Filter out empty rows
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function extractColumnValue(row: ParsedRow, possibleHeaders: string[]): string | undefined {
  for (const header of possibleHeaders) {
    const value = row[header] || row[header.toLowerCase()] || row[header.toUpperCase()];
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value).trim();
    }
  }
  
  // If no header matches, try first column
  const firstKey = Object.keys(row)[0];
  if (firstKey) {
    const value = row[firstKey];
    if (value && typeof value !== 'object') {
      return String(value).trim();
    }
  }
  
  return undefined;
}

export function extractSeedValue(row: ParsedRow): number | undefined {
  const seedHeaders = ['seed', 'rank', 'seeding', 'Seed', 'Rank', 'Seeding'];
  for (const header of seedHeaders) {
    const value = row[header];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

