import { toast } from "sonner";
import { quickMeasureOAuthService } from "./quickmeasure-oauth-service";
import {
  PartnerDetailsResponse,
  QuickMeasureCoverageCheckRequest,
  QuickMeasureCoverageCheckResponse,
  QuickMeasureSiteStatusResponse,
  QuickMeasureAccountCheckResponse,
  QuickMeasureOrderRequest,
  QuickMeasureOrderResponse,
  QuickMeasureReportMetaData,
  QuickMeasureOrderSearchRequest,
  QuickMeasureOrderSearchResponse,
  QuickMeasureOrderDetail,
  SupabaseClientConfig,
  QuickMeasureOrderError,
  QuickMeasureOrderResponseNormalized,
} from "@/types/quickmeasure-types";
import { supabase } from "@/integrations/supabase/client";

// const QUICKMEASURE_API_BASE_URL = "https://gafapis.gaf.com/partner";
const SUBSCRIBER_NAME = "SMT";

const QUICKMEASURE_WEBHOOK_CALLBACK_URL =
  "https://recyzzdwtqephssgkepb.supabase.co/functions/v1/quickmeasure/webhook";

const getLocationId = (): string | null => {
  try {
    const stored = localStorage.getItem("smartroofing_credentials");
    return stored ? JSON.parse(stored).companyId : null;
  } catch { return null; }
};

const makeProxiedRequest = async (
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  payload?: unknown
): Promise<Response> => {
  const locationId = getLocationId();
  if (!locationId) throw new Error("Location ID not found");

  const supabaseConfig = supabase as unknown as SupabaseClientConfig;
  return fetch(`${supabaseConfig.supabaseUrl}/functions/v1/quickmeasure/gaf-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseConfig.supabaseKey}`,
    },
    body: JSON.stringify({ location_id: locationId, path, method, payload }),
  });
};


const parseReportMetaData = (raw: string | null): QuickMeasureReportMetaData | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QuickMeasureReportMetaData;
  } catch {
    console.warn("QuickMeasure: failed to parse reportMetaData JSON");
    return null;
  }
};

const parseAddress = (address: string) => {
  const parts = address.split(",").map((p) => p.trim());

  const address1 = parts[0] || "";
  const city = parts[1] || "";

  const stateZipRaw = parts[2] || "";
  const stateZipTokens = stateZipRaw.trim().split(/\s+/);
  const stateOrProvince = stateZipTokens[0] || "";
  const postalCode = stateZipTokens[1] || "";

  const country = parts[3] || "USA";

  return { address1, city, stateOrProvince, postalCode, country };
};

export const quickMeasureMeasurementOrdersService = {

  getSiteStatus: async (): Promise<QuickMeasureSiteStatusResponse> => {
    const response = await makeProxiedRequest("SiteStatus", "GET");

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get site status: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<QuickMeasureSiteStatusResponse>;
  },

  checkCoverage: async (
    request: QuickMeasureCoverageCheckRequest
  ): Promise<QuickMeasureCoverageCheckResponse> => {
    const response = await makeProxiedRequest("CoverageCheck", "POST", request);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to check coverage: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<QuickMeasureCoverageCheckResponse>;
  },

  createCoverageCheckRequest: (
    productCode: "SF" | "MF" | "CM",
    address: string,
    latitude: number,
    longitude: number,
  ): QuickMeasureCoverageCheckRequest => ({
    productCode,
    latitude,
    longitude,
    ...(address ? { address } : {}),
  }),

  getPartnerDetails: async (): Promise<PartnerDetailsResponse> => {
    const response = await makeProxiedRequest("", "GET");

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get partner details: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<PartnerDetailsResponse>;
  },

  checkAccount: async (emailAddress: string): Promise<QuickMeasureAccountCheckResponse> => {
    if (!emailAddress || !emailAddress.includes("@")) {
      throw new Error("Invalid email address format");
    }

    const encodedEmail = btoa(emailAddress);

    const response = await makeProxiedRequest(`account/${btoa(emailAddress)}`, "GET");


    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 404) {
        return {
          emailAddress,
          success: false,
          errors: [{ errorCode: "ACCOUNT_NOT_FOUND", errorMessage: "No GAF QuickMeasure account found for this email address" }],
        } as QuickMeasureAccountCheckResponse;
      }

      throw new Error(`Failed to check account: ${response.status} - ${errorText}`);
    }

    const accountResponse = (await response.json()) as QuickMeasureAccountCheckResponse;


    const hasMatchingEmail = accountResponse.emailAddress &&
      accountResponse.emailAddress.toLowerCase() === emailAddress.toLowerCase();

     const hasAccountData = !!(
       accountResponse.gafCustomerName?.trim() ||
       (accountResponse.gafCustomerID && accountResponse.gafCustomerID > 0)
     );
   
     const actualSuccess = !!(accountResponse.success && hasMatchingEmail && hasAccountData);
   
     if (!actualSuccess) {
      accountResponse.success = false;
      accountResponse.errors = [
        ...(accountResponse.errors || []),
        { errorCode: "ACCOUNT_NOT_FOUND", errorMessage: "No valid GAF QuickMeasure account found for this email address" },
      ];
  } else {
      accountResponse.success = true;
      accountResponse.errors = [];
    }

    return accountResponse;
  },

  placeOrder: async (orderRequest: QuickMeasureOrderRequest): Promise<QuickMeasureOrderResponse> => {
    const response = await makeProxiedRequest("order", "POST", orderRequest);


    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(
          errorJson.errors?.[0]?.errorMessage ||
          `Failed to place order: ${response.status} - ${errorText}`
        );
      } catch {
        throw new Error(`Failed to place order: ${response.status} - ${errorText}`);
      }
    }

    const orderResponse = (await response.json()) as QuickMeasureOrderResponse;

    if (!orderResponse.success) {
      const messages = (orderResponse.errors || [])
        .map((e: QuickMeasureOrderError) => `[${e.errorCode}] ${e.errorMessage}`)
        .join("; ");
      throw new Error(`Order validation failed: ${messages}`);
    }

    const normalizedResponse: QuickMeasureOrderResponseNormalized = {
      ...orderResponse,
      GAFOrderNumber: orderResponse.GAFOrderNumber ?? (orderResponse as QuickMeasureOrderResponseNormalized).gafOrderNumber ?? null,
      gafOrderNumber: (orderResponse as QuickMeasureOrderResponseNormalized).gafOrderNumber ?? orderResponse.GAFOrderNumber ?? null,
    };

    const displayOrderNumber = normalizedResponse.GAFOrderNumber || normalizedResponse.gafOrderNumber;

    toast.success(`Order placed successfully! GAF Order #${displayOrderNumber}`, {
      duration: 5000,
    });

    return normalizedResponse;
  },

  searchOrders: async (
    request: QuickMeasureOrderSearchRequest
  ): Promise<QuickMeasureOrderSearchResponse> => {
    if (!request.orderId && !request.subscriberOrderNumber && !request.subscriberAccountEmailAddress) {
      throw new Error("At least one search parameter (orderId, subscriberOrderNumber, or subscriberAccountEmailAddress) is required");
    }

    const payload: Record<string, unknown> = {};

    if (request.orderId !== undefined && request.orderId !== null) {
      const numericId = Number(request.orderId);
      if (!isNaN(numericId)) {
        payload.orderId = numericId;
      }
    }

    if (request.subscriberOrderNumber) {
      payload.subscriberOrderNumber = request.subscriberOrderNumber;
    }

    if (
      request.subscriberAccountEmailAddress &&
      request.subscriberAccountEmailAddress.includes("@")
    ) {
      payload.subscriberAccountEmailAddress = request.subscriberAccountEmailAddress;
    }

    const response = await makeProxiedRequest("ordersearch", "POST", payload);


    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Order search failed: ${response.status} - ${errorText}`);
    }

    const searchResponse = (await response.json()) as QuickMeasureOrderSearchResponse;

    if (!searchResponse.success) {
      throw new Error(searchResponse.message || "Order search returned success=false");
    }

    return searchResponse;
  },

  getOrderDetail: async (gafOrderNumber: string, subscriberAccountEmailAddress?: string): Promise<QuickMeasureOrderDetail | null> => {
    const searchPayload: QuickMeasureOrderSearchRequest = {
      orderId: gafOrderNumber,
    };

    if (subscriberAccountEmailAddress?.includes("@")) {
      searchPayload.subscriberAccountEmailAddress = subscriberAccountEmailAddress;
    }

    const searchResponse =
      await quickMeasureMeasurementOrdersService.searchOrders(searchPayload);

    const result = searchResponse.result?.[0];
    if (!result) return null;

    const reportMetaData = parseReportMetaData(result.reportMetaData);

    const isCompleted =
      result.orderStatus?.toLowerCase() === "success" ||
      result.groupOrderStatus?.toLowerCase() === "success";

    return {
      orderId: result.orderId,
      subscriberOrderNumber: result.subscriberOrderNumber,
      orderStatus: result.orderStatus,
      groupOrderStatus: result.groupOrderStatus,
      reportReferenceNumber: result.reportReferenceNumber,
      fullAddress: result.fullAddress,
      orderRequestedOn: result.orderRequestedOn,
      orderRespondedOn: result.orderRespondedOn,
      reportMetaData,
      reportUrl: result.reportUrl,
      coverUrl: result.coverUrl,
      diagramUrl: result.diagramUrl,
      modelUrl: result.modelUrl,
      dxfUrl: result.dxfUrl,
      isCompleted,
    };
  },

  createBasicOrderRequest: (
    address: string,
    emailAddress: string,
    productCode: string,
    latitude: number,
    longitude: number,
    options?: {
      subscriberOrderNumber?: string;
      subscriberCustomField1?: string;
      recipientEmailAddresses?: string;
      instructions?: string;
      checkForDuplicate?: boolean;
    }
  ): QuickMeasureOrderRequest => {
    const { address1, city, stateOrProvince, postalCode, country } =
      parseAddress(address);

    return {
      subscriberName: SUBSCRIBER_NAME,
      subscriberOrderNumber: options?.subscriberOrderNumber,
      subscriberCustomField1: options?.subscriberCustomField1,
      callbackUrl: QUICKMEASURE_WEBHOOK_CALLBACK_URL,
      emailAddress,
      recipientEmailAddresses: options?.recipientEmailAddresses,
      products: [
        {
          productCode,
          ...(productCode === "SF-CC-USA" ? { additionalInformation: [] } : {}),
        },
      ],
      instructions: options?.instructions || "",
      address1,
      address2: "",
      city,
      stateOrProvince,
      postalCode,
      county: "",
      fipscode: "",
      country,
      latitude,
      longitude,
      fullAddress: address,
      checkForDuplicate: options?.checkForDuplicate ?? false,
    };
  },

  downloadReport: async (reportUrl: string): Promise<Blob> => {
    const fileName = reportUrl.split("/").pop();
    if (!fileName) throw new Error("Invalid report URL: cannot extract filename");

  const locationId = getLocationId();
  if (!locationId) throw new Error("Location ID not found");

  const supabaseConfig = supabase as unknown as SupabaseClientConfig;
  const response = await fetch(
    `${supabaseConfig.supabaseUrl}/functions/v1/quickmeasure/gaf-proxy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseConfig.supabaseKey}`,
      },
      body: JSON.stringify({
        location_id: locationId,
        path: `download/${fileName}`,
        method: "GET",
      }),
    }
  );

    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  },
};