
export const locationService = {
  getLocationContext: async (): Promise<string | null> => {
    try {
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      return locationId;
    } catch (error) {
      console.error("Error getting location context:", error);
      return null;
    }
  }
};
