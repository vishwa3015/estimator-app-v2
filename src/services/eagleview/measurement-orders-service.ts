import { toast } from "sonner";
import { eagleViewOAuthService } from "./oauth-service";
import { EagleViewOrderRequest, EagleViewOrderResponse, EagleViewReportResponse, EagleViewProduct, PrimaryProductId, DeliveryProductId, MeasurementInstructionType, AddressType, ReportAttributeId } from "@/types/eagleview";
import { parseAddress } from "@/utils/formatters";

// Configuration constants
const EAGLEVIEW_API_BASE_URL = "https://apicenter.eagleview.com";

/**
 * Helper function to make authenticated API requests with automatic token refresh
 */
const makeAuthenticatedRequest = async (
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: EagleViewOrderRequest
): Promise<Response> => {
  // Get a valid access token (getAccessToken handles refresh automatically)
  let accessToken = await eagleViewOAuthService.getAccessToken();

  // Prepare request options
  const requestOptions: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  // Make the API request
  let response = await fetch(url, requestOptions);

  // Handle 401 - token expired, clear cache and retry with fresh token
  if (response.status === 401) {
    console.log("Access token expired, requesting new token...");
    eagleViewOAuthService.clearTokenCache();
    accessToken = await eagleViewOAuthService.getAccessToken();

    // Update headers with new token
    requestOptions.headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // Retry the request with new token
    response = await fetch(url, requestOptions);
  }

  return response;
};

export const measurementOrdersService = {
  /**
   * Place a roof measurement order with EagleView
   */
  placeOrder: async (orderRequest: EagleViewOrderRequest): Promise<EagleViewOrderResponse> => {
    try {
      const response = await makeAuthenticatedRequest(
        `${EAGLEVIEW_API_BASE_URL}/v2/Order/PlaceOrder`,
        "POST",
        orderRequest
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("EagleView order request failed:", response.status, errorText);
        throw new Error(`Failed to place EagleView order: ${response.status}`);
      }

      const orderResponse: EagleViewOrderResponse = await response.json();
      console.log("EagleView order placed successfully:", orderResponse);

      return orderResponse;
    } catch (error) {
      console.error("Error placing EagleView order:", error);
      toast.error("Failed to place measurement order with EagleView");
      throw error;
    }
  },

  /**
   * Create a basic order request from an address string
   * This is a helper method that parses an address and creates the order structure
   */
  createBasicOrderFromAddress: (
    address: string,
    referenceId?: string | null,
    primaryProductId: number = PrimaryProductId.PremiumResidential,
    deliveryProductId: number = DeliveryProductId.RegularDelivery,
    measurementInstructionType: number = MeasurementInstructionType.PrimaryStructureOnly,
    promoCode?: string | null
  ): EagleViewOrderRequest => {
    // Parse address into components using utility function
    const { streetAddress, city, state, zip, country } = parseAddress(address);

    const orderRequest: EagleViewOrderRequest = {
      OrderReports: [
        {
          ReportAddresses: [
            {
              Address: streetAddress,
              City: city,
              State: state,
              Zip: zip,
              Country: country, // Parsed from address or defaults to "US"
              AddressType: AddressType.User,
              VerifierUsedId: null,
              MapperUsedId: null,
              VerificationResultTypeId: null,
              // Latitude and Longitude omitted - optional fields
            }
          ],
          PrimaryProductId: primaryProductId,
          DeliveryProductId: deliveryProductId,
          MeasurementInstructionType: measurementInstructionType,
          ChangesInLast4Years: false,
          Comments: null,
          ReferenceID: referenceId || null,
          ReportAttibutes: [
            {
              Attribute: ReportAttributeId.PremiumReportOk,
              Value: "Yes",
            },
            {
              Attribute: ReportAttributeId.Residential2CommercialOk,
              Value: "Yes",
            }
          ],
        }
      ],
      PromoCode: promoCode || null,
      PlaceOrderUser: null,
      CreditCardData: null,
    };

    return orderRequest;
  },


  /**
   * Get the report details by Report ID
   */
  getMeasurementReport: async (reportId: number): Promise<EagleViewReportResponse> => {
    try {
      const response = await makeAuthenticatedRequest(
        `${EAGLEVIEW_API_BASE_URL}/v3/Report/GetReport?reportId=${reportId}`,
        "GET"
      );

      if (!response.ok) {
        throw new Error(`Failed to get order report: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting order report:", error);
      toast.error("Failed to retrieve order report");
      throw error;
    }
  },

  /**
   * Get all available products from EagleView
   * Returns a list of products with pricing, delivery options, and availability
   * Filters results to only include products matching PrimaryProductId enum values
   */
  getAvailableProducts: async (): Promise<EagleViewProduct[]> => {
    try {
      const response = await makeAuthenticatedRequest(
        `${EAGLEVIEW_API_BASE_URL}/v2/Product/GetAvailableProducts`,
        "GET"
      );

      if (!response.ok) {
        throw new Error(`Failed to get available products: ${response.status}`);
      }

      const allProducts: EagleViewProduct[] = await response.json();

      // Get all valid product IDs from PrimaryProductId enum
      const validProductIds = Object.values(PrimaryProductId).filter(
        value => typeof value === 'number'
      ) as number[];

      // Filter products to only include those matching our enum
      const filteredProducts = allProducts.filter(product =>
        validProductIds.includes(product.productID)
      );

      return filteredProducts;
    } catch (error) {
      console.error("Error getting available products:", error);
      toast.error("Failed to retrieve available products");
      throw error;
    }
  },
};

