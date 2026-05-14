import { GHLCredentials, GHLContact } from "@/types/ghl";
import { API_BASE_URL, getHeaders } from "./config";

// Cache key prefix for localStorage
const CACHE_KEY_PREFIX = 'ghl_custom_fields_';

// Cache duration: 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

interface CachedFieldDefinitions {
  fieldMap: Record<string, string>;
  timestamp: number;
}

interface CustomFieldDefinition {
  id: string;
  fieldKey?: string;
  key?: string;
  name?: string;
}

interface ContactCustomField {
  id: string;
  value: string;
  key?: string;
}
/**
 * Fetches custom field definitions from GHL API with persistent caching
 * @param credentials - GHL credentials for API access
 * @returns Map of field ID to field key
 */
async function getCustomFieldDefinitions(
  credentials: GHLCredentials
): Promise<Map<string, string>> {
  const locationId = credentials.companyId;
  const now = Date.now();
  const cacheKey = `${CACHE_KEY_PREFIX}${locationId}`;

  // Check if we have a valid cached version in localStorage
  try {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const cached: CachedFieldDefinitions = JSON.parse(cachedData);
      if (cached && cached.fieldMap && now - cached.timestamp < CACHE_DURATION_MS) {
        console.log(`Using cached custom field definitions for location ${locationId}`);
        // Convert the plain object back to a Map
        return new Map(Object.entries(cached.fieldMap));
      }
    }
  } catch (e) {
    console.error('Error reading custom fields cache:', e);
  }

  // Fetch fresh data
  console.log('Fetching custom field definitions for location:', locationId);
  const fieldsResponse = await fetch(
    `${API_BASE_URL}/custom-fields/?locationId=${locationId}`,
    {
      method: "GET",
      headers: getHeaders(credentials)
    }
  );

  if (!fieldsResponse.ok) {
    const errorText = await fieldsResponse.text();
    console.error('Custom fields API failed:', fieldsResponse.status, errorText);
    throw new Error(`Custom fields API failed: ${fieldsResponse.status}`);
  }

  const fieldsData = await fieldsResponse.json();
  const fieldDefinitions = fieldsData.customFields || fieldsData.fields || [];

  // Create a map of field ID to field key
  const fieldMap = new Map<string, string>();
  (fieldDefinitions as CustomFieldDefinition[]).forEach((field) => {
    fieldMap.set(field.id, field.fieldKey || field.key || field.name);
  });

  // Cache the result in localStorage
  try {
    const cacheData: CachedFieldDefinitions = {
      fieldMap: Object.fromEntries(fieldMap),
      timestamp: now
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (e) {
    console.error('Error caching custom fields:', e);
  }

  return fieldMap;
}

/**
 * Clears the custom fields cache for a specific location or all locations
 * @param locationId - Optional location ID to clear cache for. If omitted, clears all cache
 */
export function clearCustomFieldsCache(locationId?: string): void {
  if (locationId) {
    const cacheKey = `${CACHE_KEY_PREFIX}${locationId}`;
    localStorage.removeItem(cacheKey);
    console.log(`Cleared custom fields cache for location ${locationId}`);
  } else {
    // Clear all custom fields cache entries
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('Cleared all custom fields cache');
  }
}

/**
 * Enriches contact custom fields by mapping field IDs to their keys
 * Fetches custom field definitions from GHL API (with persistent caching) and adds a 'key' property to each custom field
 *
 * @param contact - The contact object to enrich
 * @param credentials - GHL credentials for API access
 * @returns The contact with enriched custom fields (or original contact if mapping fails)
 */
export async function enrichContactCustomFields(
  contact: GHLContact | null,
  credentials: GHLCredentials
): Promise<GHLContact | null> {
  if (!contact) {
    return null;
  }

  // If contact has customField array, fetch field definitions to map IDs to keys
  if (contact && contact.customField && Array.isArray(contact.customField)) {
    try {
      const fieldMap = await getCustomFieldDefinitions(credentials);

      // Add key property to each customField based on the field definition
      contact.customField = (contact.customField as ContactCustomField[]).map((field) => ({
        ...field,
        key: fieldMap.get(field.id) || field.id
      }));
    } catch (fieldError) {
      console.error('Error fetching custom field definitions:', fieldError);
      // Continue without field keys - at least we have the values
    }
  }

  return contact;
}
