import { pdf } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

/** Render a @react-pdf document to a Blob and trigger a browser download. */
export async function downloadPdf(filename: string, element: ReactElement): Promise<void> {
  const blob = await pdf(element).toBlob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
