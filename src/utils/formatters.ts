
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Parsed address components
 */
export interface ParsedAddress {
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// US State abbreviations and full names
const US_STATES: { [key: string]: string } = {
  'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
  'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
  'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
  'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
  'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
  'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
  'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
  'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
  'DISTRICT OF COLUMBIA': 'DC', 'DC': 'DC'
};

/**
 * Parse an address string into structured components using a robust backwards-parsing approach.
 * Works by identifying the most reliable components (zip, state) first, then extracting remaining parts.
 * 
 * Handles various US address formats including:
 * - "Street, City, State Zip"
 * - "Street, City, State, Zip"
 * - "Street, City State, Zip"
 * - "Street, City State Zip"
 * - With optional country code at end
 * 
 * @param address - The full address string to parse
 * @param defaultCountry - Default country code if not specified in address (default: "US")
 * @returns ParsedAddress object with streetAddress, city, state, zip, and country
 */
export const parseAddress = (address: string, defaultCountry: string = "US"): ParsedAddress => {
  let streetAddress = "";
  let city = "";
  let state = "";
  let zip = "";
  let country = defaultCountry;

  // Clean up the address
  const cleanAddress = address.trim();

  // Split by comma for easier parsing
  const parts = cleanAddress.split(',').map(part => part.trim()).filter(part => part.length > 0);

  if (parts.length === 0) {
    return { streetAddress: cleanAddress, city: "", state: "", zip: "", country };
  }

  // Step 1: Check for country code at the end (2-3 letter code without numbers)
  const workingParts = [...parts];
  if (workingParts.length > 0) {
    const lastPart = workingParts[workingParts.length - 1];
    if (lastPart.match(/^[A-Z]{2,3}$/i) && !lastPart.match(/\d/)) {
      country = lastPart.toUpperCase();
      workingParts.pop();
    }
  }

  // Step 2: Extract zip code (can be standalone or combined with state)
  // Look for 5-digit or 5+4 zip code pattern in the last part
  if (workingParts.length > 0) {
    const lastPart = workingParts[workingParts.length - 1];
    const zipMatch = lastPart.match(/\b(\d{5}(?:-\d{4})?)\b/);

    if (zipMatch) {
      zip = zipMatch[1];

      // Check if this part contains ONLY the zip code
      if (lastPart.trim() === zip) {
        // Standalone zip: "Street, City State, 84065"
        workingParts.pop();
      } else {
        // Zip combined with other info: "Street, City, State 84065" or "Street, City State 84065"
        // Remove the zip from this part, leaving the rest
        workingParts[workingParts.length - 1] = lastPart.replace(zipMatch[0], '').trim();
      }
    }
  }

  // Step 3: Extract state (2-letter code, should be at end of last remaining part)
  if (workingParts.length > 0) {
    const lastPart = workingParts[workingParts.length - 1];

    // Try 2-letter state code first
    const stateMatch = lastPart.match(/\b([A-Z]{2})\b$/i);

    if (stateMatch) {
      state = stateMatch[1].toUpperCase();

      // Check if this part contains ONLY the state code
      if (lastPart.trim().toUpperCase() === state) {
        // Standalone state: "Street, City, UT"
        workingParts.pop();
      } else {
        // State combined with city: "Street, Bluffdale UT"
        // Remove the state, leaving the city
        workingParts[workingParts.length - 1] = lastPart.replace(stateMatch[0], '').trim();
      }
    } else {
      // Try full state name
      const upperLastPart = lastPart.trim().toUpperCase();
      if (US_STATES[upperLastPart]) {
        // Full state name found: "Street, City, California"
        state = US_STATES[upperLastPart];
        workingParts.pop();
      }
    }
  }

  // Step 4: Extract city (should be the last remaining part)
  if (workingParts.length > 0) {
    city = workingParts[workingParts.length - 1];
    workingParts.pop();
  }

  // Step 5: Everything remaining is the street address
  streetAddress = workingParts.join(', ');

  // Validate required fields
  if (!streetAddress) {
    console.warn("Unable to parse street address from:", address);
    streetAddress = address;
  }

  return {
    streetAddress,
    city,
    state,
    zip,
    country,
  };
};
