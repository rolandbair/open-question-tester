import Papa from 'papaparse';
import type { CsvRow } from '../types';

export function parsePromptFile(text: string): { number: string; prompt: string }[] | null {
  try {
    // Each row: [number, prompt]
    const results = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
    const prompts = (results.data as string[][])
      .filter(row => row[0] && row[1])
      .map(row => ({ number: row[0], prompt: row[1] }));
    if (prompts.length === 0) return null;
    return prompts;
  } catch {
    return null;
  }
}

/**
 * Parses a CSV file and logs detailed information for debugging.
 * @param data The CSV file (File object)
 * @param requiredKeys Array of required column keys (case-insensitive, trimmed)
 * @param onSuccess Callback with all parsed rows (including extra columns)
 * @param onError Callback with error message
 */
export function parseTableCsv(
  data: File,
  requiredKeys: string[],
  onSuccess: (rows: CsvRow[]) => void,
  onError: (msg: string) => void
) {
  Papa.parse(data, {
    header: true,
    complete: (results) => {
      try {
        console.log('[CSV Utils] Raw parsed data:', results.data);
        const parsed = results.data as Record<string, any>[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          onError('No rows found in CSV');
          return;
        }
        // Normalize keys for each row
        const normalizedRows: Record<string, any>[] = parsed.map(row => {
          const newRow: Record<string, any> = {};
          Object.keys(row).forEach(key => {
            newRow[key.trim()] = row[key];
          });
          return newRow;
        });
        console.log('[CSV Utils] Normalized rows:', normalizedRows);
        // Check for required columns in each row
        const required = requiredKeys.map(k => k.toLowerCase().trim());
        const validRows = normalizedRows.filter(row => {
          const rowKeys = Object.keys(row).map(k => k.toLowerCase().trim());
          const missing = required.filter(key => !rowKeys.includes(key));
          if (missing.length > 0) {
            console.warn('[CSV Utils] Skipping row due to missing required columns:', missing, row);
            return false;
          }
          return true;
        });
        console.log('[CSV Utils] Required keys:', required);
        console.log('[CSV Utils] Valid rows:', validRows);
        if (validRows.length === 0) {
          onError('No valid rows found (missing required columns)');
          return;
        }
        onSuccess(validRows as CsvRow[]);
      } catch (err) {
        console.error('[CSV Utils] Error parsing CSV:', err);
        onError('Invalid CSV format');
      }
    },
    error: (err) => {
      console.error('[CSV Utils] PapaParse error:', err);
      onError('Failed to parse CSV');
    },
  });
}
