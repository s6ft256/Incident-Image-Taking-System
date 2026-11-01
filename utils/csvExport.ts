export const exportToCsv = (filename: string, rows: object[]) => {
  if (!rows || rows.length === 0) {
    console.warn("CSV export cancelled: No data provided.");
    return;
  }
  
  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        const value: unknown = (row as Record<string, unknown>)[k];
        let cell: string;
        
        if (value === null || value === undefined) {
          cell = '';
        } else if (value instanceof Date) {
          cell = value.toLocaleString();
        } else if (typeof value === 'object') {
          cell = JSON.stringify(value) ?? '';
        } else {
          cell = String(value);
        }
        
        const escapedCell = cell.replace(/"/g, '""');
        if (/[",\n]/.test(escapedCell)) {
          return `"${escapedCell}"`;
        }
        return escapedCell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
