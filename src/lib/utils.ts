import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null) {
  const numeric = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function parseSafeNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

export function getOrderStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'Pending':
    case 'Очікує':
    case 'Очікують':
      return 'Очікує';
    case 'Processing':
    case 'В обробці':
      return 'В обробці';
    case 'Shipped':
    case 'Відправлено':
      return 'Відправлено';
    case 'Delivered':
    case 'Виконано':
    case 'Доставлено':
      return 'Виконано';
    case 'Cancelled':
    case 'Скасовано':
      return 'Скасовано';
    case 'Request':
    case 'Запит':
      return 'Запит';
    default:
      return status || 'Очікує';
  }
}

export function getItemStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'Pending':
      return 'Очікує';
    case 'Ordered':
      return 'Замовлено';
    case 'In Transit':
      return 'В дорозі';
    case 'Available':
      return 'В наявності';
    case 'Picked':
      return 'Зібрано';
    case 'Packed':
      return 'Упаковано';
    case 'Confirmed':
      return 'Підтверджено';
    case 'Issued':
      return 'Видано';
    case 'Out of Stock':
      return 'Немає';
    default:
      return status || 'Очікує';
  }
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
  URL.revokeObjectURL(url);
}
