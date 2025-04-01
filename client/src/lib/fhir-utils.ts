// Helper functions for working with FHIR resources

import { FHIRResource } from './types';

/**
 * Format a FHIR resource as JSON with indentation
 */
export function formatJson(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * Download JSON data as a file
 */
export function downloadJson(data: any, filename: string): void {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Get a readable display name from a FHIR resource type
 */
export function getResourceTypeDisplay(resourceType: string): string {
  // Convert camelCase to Title Case with spaces
  const withSpaces = resourceType
    // Add space before uppercase letters that follow lowercase
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Capitalize first letter
    .replace(/^./, (str) => str.toUpperCase());
  
  return withSpaces;
}

/**
 * Convert a date string to a readable format
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Extract a resource ID from a FHIR resource URL
 */
export function extractResourceIdFromUrl(url: string): string | null {
  const parts = url.split('/');
  return parts[parts.length - 1] || null;
}

/**
 * Get a resource's canonical URL
 */
export function getCanonicalUrl(resource: FHIRResource): string | null {
  if (resource.url) {
    return resource.url;
  }
  
  // Fallback for resources without a direct URL
  if (resource.id && resource.resourceType) {
    return `urn:uuid:${resource.id}`;
  }
  
  return null;
}
