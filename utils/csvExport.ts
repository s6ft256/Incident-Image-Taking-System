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
        let cell = (row as any)[k];
        cell = cell === null || cell === undefined ? '' : cell;
        
        if (cell instanceof Date) {
          cell = cell.toLocaleString();
        } else if (typeof cell === 'object') {
          cell = JSON.stringify(cell).replace(/"/g, '""');
        } else {
          cell = String(cell).replace(/"/g, '""');
        }
        
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
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
