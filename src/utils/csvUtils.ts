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

export function parseTableCsv(data: File, onSuccess: (rows: CsvRow[]) => void, onError: (msg: string) => void) {
  Papa.parse(data, {
    header: true,
    complete: (results) => {
      try {
        const parsed = (results.data as CsvRow[]).filter(row => row.question && row.answer);
        onSuccess(parsed);
      } catch {
        onError('Invalid CSV format');
      }
    },
    error: () => onError('Failed to parse CSV'),
  });
}
