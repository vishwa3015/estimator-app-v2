export interface EagleViewTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
  id_token?: string;
}

export interface EagleViewDeliveryProduct {
  productID: number;
  name: string;
  description: string;
  isTemporarilyUnavailable: boolean;
  priceMin: number;
  priceMax: number;
  deliveryProductIds: number[] | null;
  DetailedDescription: string | null;
}

export interface EagleViewProduct {
  productID: number;
  name: string;
  description: string;
  productGroup: string | null;
  isTemporarilyUnavailable: boolean;
  priceMin: number;
  priceMax: number;
  deliveryProducts: EagleViewDeliveryProduct[];
  addOnProducts: EagleViewDeliveryProduct[];
  measurementInstructionTypes: number[];
  TypeOfStructure: number;
  IsRoofProduct: boolean;
  SortOrder: number;
  AllowsUserSubmittedPhotos: boolean;
  DetailedDescription: string | null;
}

export interface EagleViewAuthCache {
  access_token: string;
  expires_at: number;
  token_type: string;
}

export interface EagleViewOAuthToken {
  access_token: string;
  expires_at: number;
}

export interface EagleViewAddress {
  Address: string;
  City: string;
  State: string;
  Zip: string;
  Country?: string;  // Optional - 2-letter (US) or 3-letter (USA) country code
  AddressType: number;
  Latitude?: number;  // Optional - not always required
  Longitude?: number; // Optional - not always required
  VerifierUsedId?: number | null;
  MapperUsedId?: number | null;
  VerificationResultTypeId?: number | null;
}

export interface EagleViewOrderRequest {
  OrderReports: Array<{
    ReportAddresses: EagleViewAddress[];
    BuildingId?: number;
    PrimaryProductId: number;
    DeliveryProductId: number;
    AddOnProductIds?: number[];
    MeasurementInstructionType: number;  // Required, defaults to PrimaryStructureOnly (2)
    ChangesInLast4Years: boolean;
    ClaimNumber?: string;
    ClaimInfo?: string;
    Comments?: string | null;
    ReferenceID?: string | null;
    InsuredName?: string;
    ReportAttibutes?: Array<{  // Note: EagleView API has typo "Attibutes"
      Attribute: number;
      Value: string;
    }>;
  }>;
  PromoCode?: string | null;
  PlaceOrderUser?: string | null;
  CreditCardData?: Record<string, unknown> | null;
}

export interface EagleViewOrderResponse {
  OrderId: number;
  ReportIds: number[];
}

/**
 * Report Image
 */
export interface EagleViewReportImage {
  SequenceNumber: number;
  ImageId: number;
  Description: string;
  EffectiveDate: string;
}

/**
 * Pitch Table Entry
 */
export interface EagleViewPitchTableEntry {
  Pitch: string;
  RoofArea: string;
  PercentageRoofArea: string;
}

/**
 * Delivery File Type
 */
export interface EagleViewDeliveryFile {
  DeliveryFileTypeId: number;
  EffectiveDate: string;
}

/**
 * Measurement by Structure
 */

export interface EagleViewWallMeasurement {
  Area?: string;
  Perimeter?: string;
  [key: string]: unknown;
}
export interface EagleViewStructureMeasurement {
  BuildingName: string;
  Area: string;
  PrimaryPitch: string;
  LengthRidge: string;
  LengthValley: string;
  LengthEave: string;
  LengthRake: string;
  LengthHip: string;
  AreaValue: number;
  PitchValue: number;
  WallMeasurement: EagleViewWallMeasurement | null;
  TotalRoofFacets: string;
  PitchTable: EagleViewPitchTableEntry[];
}

/**
 * Total Measurements
 */
export interface EagleViewTotalMeasurements {
  BuildingName: string | null;
  Area: string;
  PrimaryPitch: string;
  LengthRidge: string;
  LengthValley: string;
  LengthEave: string;
  LengthRake: string;
  LengthHip: string;
  AreaValue: number;
  PitchValue: number;
  WallMeasurement: EagleViewWallMeasurement | null;
  TotalRoofFacets: string;
  PitchTable: EagleViewPitchTableEntry[];
}

/**
 * Get Report Response (v3)
 * Complete report details including measurements, status, and delivery files
 */
export interface EagleViewReportResponse {
  ReportId: number;
  Street: string;
  BuildingId: string;
  City: string;
  State: string;
  Zip: string;
  Latitude: number;
  Longitude: number;
  ClaimNumber: string | null;
  ClaimInfo: string | null;
  BatchId: string | null;
  CatId: string | null;
  DatePlaced: string;
  DateCompleted: string;
  PONumber: string | null;
  Comments: string | null;
  ReportImage: EagleViewReportImage[];
  ReferenceId: string | null;
  InsuredName: string | null;
  MeasurementRequestType: number;
  ReportDownloadLink: string;
  EligibleForUpgrade: boolean;
  Status: string;
  Area: string;
  Pitch: string;
  LengthRidge: string;
  LengthValley: string;
  LengthEave: string;
  LengthRake: string;
  ProductPrimaryId: number;
  ProductPrimary: string;
  ProductDeliveryId: number;
  ProductDelivery: string;
  AddOnProductIds: string | null;
  AllowsUserSubmittedPhotos: boolean;
  LengthHip: string;
  ProfileId: number;
  UserName: string | null;
  SubstituteFromProduct: string | null;
  SubstituteToProduct: string | null;
  CanCancelReport: boolean;
  StatusId: number;
  SubStatusId: number;
  TotalRoofFacets: string;
  DisplayStatus: string;
  PitchTable: EagleViewPitchTableEntry[];
  DateOfLoss: string;
  DeliveryFilesAvailable: EagleViewDeliveryFile[];
  AdditionalRecipients: string;
  TotalCost: number | null;
  PaymentType: string;
  MeasurementByStructure: EagleViewStructureMeasurement[];
  PrimaryProductDisplayName: string;
  AddOnProducts: EagleViewDeliveryProduct[];
  TypeOfStructure: number;
  ProductSubstitution: Record<string, unknown> | null;
  TotalMeasurements: EagleViewTotalMeasurements;
  JobName: string | null;
  CanEditReportInformation: boolean;
  SuggestedWasteFactorAvailable: boolean;
}

/**
 * MeasurementInstructionType
 * Identifies structure(s) to be measured for report creation.
 * These same values are used for MeasurementRequestType field.
 */
export enum MeasurementInstructionType {
  /** Request that the primary structure and one additional structure (e.g. detached garage) be measured */
  PrimaryPlusDetachedGarage = 1,
  /** Request that only the primary structure be measured. EagleView defines the primary structure as the largest structure on the parcel */
  PrimaryStructureOnly = 2,
  /** Request that all structures on the parcel be measured */
  AllStructuresOnParcel = 3,
  /** Request that applies to commercial/multi-family properties that contain multiple structures. User must identify buildings to be measured via a secondary process */
  CommercialComplex = 4,
  /** Request that does not fit any of the above request types */
  Other = 5,
}

/**
 * AddressType
 * Specifies which format of location is provided
 */
export enum AddressType {
  /** Address format (street address, city, state, zip) */
  User = 1,
  /** Latitude and Longitude format */
  UserCorrected = 4,
}

export enum TypeOfStructure {
  Residential = 1,
  Commercial = 2,
}

/**
 * Common Primary Product IDs
 * Note: Actual product IDs may vary by account and region
 */
export enum PrimaryProductId {
  /** Premium residential report with detailed measurements */
  PremiumResidential = 31,
  /** Premium commercial report with detailed measurements */
  PremiumCommercial = 32,
  BidPerfectResidential = 84,
  BidPerfectCommercial = 102,
  /** Roof product (residential) for Alta */
  RoofResidential = 106,
}

/**
 * DeliveryProductId
 * This parameter determines the delivery window of the order being placed.
 */
export enum DeliveryProductId {
  /** SLA for express delivery is 1 business day. Additional fees may apply */
  ExpressDelivery = 4,
  /** Guaranteed delivery within three business hours. If the order is placed before 3pm PST, the order should be delivered within 3 hours. If the order is placed after 3pm, it will be delivered within 3 hours of 6am on following business day. Additional fees may apply */
  ThreeHourDelivery = 7,
  /** If ordered during business hours (6AM - 6PM PST most days of the year) the guaranteed date is 2 business days, by close of day. If the report is ordered after close of business, it will not be processed until the next business day. Note: Premium reports are delivered within 6hrs */
  RegularDelivery = 8,
  /** SLA under 2hours. Only applies for the Bid Perfect™ product */
  QuickDelivery = 45,
}

export enum ReportAttributeId {
  /** If ordered product cannot be completed, offer premium substitution options. Value: Yes, No, or Ask */
  PremiumReportOk = 10,
  /** Email address to send report notifications to */
  NotificationEmail = 24,
  /** If residential product ordered is determined to be commercial, substitute with commercial product. Value: Yes, No, or Ask */
  Residential2CommercialOk = 120,
}

/**
 * ReportStatus
 * Shows the high level status of the report that has been ordered.
 */
export enum ReportStatus {
  /** The order has been created within the EagleView system */
  Created = 1,
  /** The report has been created and is progressing through the steps of our workflow */
  InProcess = 2,
  /** Awaiting customer response */
  Pending = 3,
  /** The report is closed */
  Closed = 4,
  /** The report has been delivered */
  Completed = 5,
}

// Helper function to convert ReportStatus enum to readable text
export const getReportStatusText = (status: ReportStatus | number | undefined): string => {
  if (status === undefined || status === null) return "Unknown";

  switch (Number(status)) {
    case ReportStatus.Created:
      return "Created";
    case ReportStatus.InProcess:
      return "In Process";
    case ReportStatus.Pending:
      return "Pending";
    case ReportStatus.Closed:
      return "Closed";
    case ReportStatus.Completed:
      return "Completed";
    default:
      return "Unknown";
  }
};

/**
 * ReportSubStatus
 * Provides more details on the order's progress through the fulfilment process.
 * ReportSubStatus under 'Pending' ReportStatus may require action from the user to complete the order.
 */
export enum ReportSubStatus {
  /** Images for the report are being reviewed (InProcess) */
  UnderReview = 5,
  /** The measuring process has been started (InProcess) */
  ProcessStarted = 6,
  /** The order is on hold and is pending structure and/or address identification by the customer. Request is sent by email and requires the customer to either 1) identify which structures should be measured or, 2) verify the address (Pending) */
  NeedToID = 8,
  /** The order has been closed because two identical orders were placed by the customer. An email is also sent to the customer informing about the change in order status (Closed) */
  Duplicate = 9,
  /** The order has been closed because the customer cancelled the order (Closed, Completed) */
  CanceledByClient = 10,
  /** The order has been closed because the images available could not be used to extract measurements for the respective order to meet EagleView standards. An email is also sent to the customer informing about the change in order status (Closed) */
  PoorImages = 11,
  /** This order has been closed due to the property not being identified by the customer within a 3-day period. A follow-up email is sent to the customer within 3 days, before the report is closed (Closed) */
  NoID = 12,
  /** The order has been closed due to the customer's settings either being set to 'No' for a Report Type Change, or their settings were set to 'Ask' and they declined the Report Type Change by closing the order (Pending, Closed) */
  ReportTypeChange = 14,
  /** The order has been closed because there are no images available for the property. An email is also sent to the customer informing about the change in order status: Closed (Closed) */
  NoImages = 15,
  /** The order is closed because the appropriate reason for order closure wasn't available at the time. e.g. when the customer does not want any follow-up emails (Closed) */
  Other = 16,
  /** Credit card has been rejected at order placement and customer cannot continue to place order; this can happen due to card expiration, insufficient funds, etc (Closed) */
  CardRejected = 18,
  /** Files related to placed order are ready to be delivered via email or to the webhook that has been setup (Completed) */
  Sent = 19,
  /** Files related to placed order are ready to be delivered via email or to the webhook that has been setup (Completed) - alternate value */
  SentAlt = 20,
  /** Awaiting customer response (Pending) */
  CustomerResponse = 21,
  /** The order has been closed after customer informs EagleView the wrong property has been measured (Closed) */
  WrongHouse = 24,
  /** An error has occurred while processing the transaction. An email is sent to the customer if any customer action is required (Pending) */
  CreditCardFailure = 27,
  /** Report is being processed after it has been ordered (Created) */
  Processing = 31,
  /** Report is being measured (Pending) */
  MeasurementData = 32,
  /** If Report Substitution settings are set to 'No', the report will be closed without offering an alternative product. e.g. Residential report cannot measure a commercial structure (Closed) */
  UnsupportedStructure = 38,
  /** Payment is being captured for the report (InProcess) */
  ReadyToCapturePayment = 43,
}
