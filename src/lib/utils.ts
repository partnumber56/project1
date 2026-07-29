import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
  }).format(amount);
}

export function exportToCSV(filename: string, headers: string[], data: any[][]) {
  const csvContent = [
    headers.join(','),
    ...data.map(row => row.map(cell => {
      if (cell === null || cell === undefined) return '""';
      const cellStr = String(cell).replace(/"/g, '""');
      return `"${cellStr}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

