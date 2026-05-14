
import { GHLCredentials } from "@/types/ghl";

export const API_BASE_URL = 'https://services.leadconnectorhq.com'; 
// export const API_BASE_URL = 'https://rest.gohighlevel.com/v1';

export const createHeaders = (apikey: string) => ({
  "Authorization": `Bearer ${apikey}`,
  "Content-Type": "application/json"
});

export const createServicesHeaders = (pit: string) => ({
  "Authorization": `Bearer ${pit}`,
  "Content-Type": "application/json",
  'Accept': 'application/json',
  "Version": "2021-07-28"
});

export const isServicesAPI = () => {
  return API_BASE_URL.includes('services.leadconnectorhq.com');
};

export const getHeaders = (credentials: GHLCredentials): Record<string, string> => {
  if (isServicesAPI()) {
    if (!credentials.pit) {
      throw new Error('Services API requires "pit" credential');
    }
    return createServicesHeaders(credentials.pit);
  } else {
    if (!credentials.apikey) {
      throw new Error('V1 API requires "apiKey" credential');
    }
    return createHeaders(credentials.apikey);
  }
};