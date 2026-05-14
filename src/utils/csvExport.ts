
/**
 * Utility functions for exporting data to CSV format
 */

/**
 * Convert data to CSV format
 * @param headers Array of column headers
 * @param data Array of data rows (array of objects)
 * @returns CSV formatted string
 */
export function convertToCSV(headers: { key: string; label: string }[], data: Record<string, unknown>[]): string {
  // Create header row
  const headerRow = headers.map(header => `"${header.label}"`).join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header.key];
      // Handle different data types and ensure proper CSV formatting
      if (value === null || value === undefined) {
        return '""';
      } else if (typeof value === 'number') {
        return value;
      } else {
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }
    }).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download data as a CSV file
 * @param csvContent CSV formatted string
 * @param filename Filename for the downloaded file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Create a blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link
  const link = document.createElement('a');
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Set link properties
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add link to the document
  document.body.appendChild(link);
  
  // Trigger the download
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
