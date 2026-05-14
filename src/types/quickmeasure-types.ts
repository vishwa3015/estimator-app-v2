export interface QuickMeasureOAuthToken {
  access_token: string;
  expires_at: number;
  token_type: string;
}

export interface QuickMeasureUserProfile {
  location_id: string;
  quickmeasure_client_id?: string;
  quickmeasure_client_secret?: string;
  quickmeasure_audience?: string;
  quickmeasure_scope?: string;
}

export interface QuickMeasureSiteStatusResponse {
  siteStatus: string; 
  siteAverageResponseTime: number; 
}

export interface QuickMeasureCoverageCheckRequest {
  productCode: "SF" | "MF" | "CM";
  latitude: number;
  longitude: number;
}

export interface QuickMeasureCoverageCheckResponse {
  success: boolean;
  message?: string;
}

export interface SubscriberConfiguration {
  subscriberConfigurationId: number;
  subscriberId: number;
  key: string;
  value: string;
  status: number;
  createdOn: string;
  createdBy: string;
  modifiedOn: string | null;
  modifiedBy: string | null;
}

export interface SubscriberProduct {
  subscriberProductId: number;
  subscriberId: number;
  productId: number;
  productCode: string;
  status: number;
  createdOn: string;
  createdBy: string;
  modifiedOn: string | null;
  modifiedBy: string | null;
  price: number;
}

export interface Subscriber {
  subscriberId: number;
  name: string;
  status: number;
  createdOn: string;
  createdBy: string;
  modifiedOn: string | null;
  modifiedBy: string | null;
  subscriberConfiguration: SubscriberConfiguration[];
  subscriberProduct: SubscriberProduct[];
}

export interface PartnerDetailsResponse {
  subscribers: Subscriber[];
}

export interface ProductPricing {
  code: string; 
  description: string;
  price: number;
}

export interface QuickMeasureAccountCheckResponse {
  emailAddress: string;
  firstName: string;
  lastName: string;
  parentEmailAddress: string;
  availableCredits: number;
  gafCustomerID: number;
  gafCustomerName: string;
  gafCustomerAddress: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  currentProfile: string; 
  qualifiedProfile: string; 
  success: boolean;
  products: ProductPricing[];
  errors:  QuickMeasureOrderError[]
}

export interface QuickMeasureProductRequest {
  productCode: string;
  additionalInformation?: Array<{
    questioncode: string;
    question: string;
    answer: string;
  }> | null;
}

export interface QuickMeasureOrderRequest {
  subscriberName: string; 
  subscriberOrderNumber?: string; 
  subscriberCustomField1?: string; 
  emailAddress: string; 
  callbackUrl?: string;
  recipientEmailAddresses?: string; 
  products: QuickMeasureProductRequest[]; 
  instructions?: string; 
  address1: string; 
  address2?: string; 
  city: string; 
  stateOrProvince: string; 
  postalCode: string; 
  county?: string; 
  fipscode?: string;
  country: string;
  latitude: number; 
  longitude: number; 
  fullAddress: string; 
  checkForDuplicate?: boolean;
}

export interface QuickMeasureOrderError {
  errorCode: string;
  errorMessage: string;
}

export interface QuickMeasureOrderResponse {
  GAFOrderNumber: number;
  subscriberOrderNumber?: string;
  orderDateTime?: string;
  success: boolean;
  errors: QuickMeasureOrderError[];
}

export interface QuickMeasureOrderSearchRequest {
  orderId?: string;
  subscriberOrderNumber?: string;
  subscriberAccountEmailAddress?: string;
}

export interface QuickMeasureReportMetaData {
  Area: number;
  Eaves: number;
  Hips: number;
  Rakes: number;
  Ridges: number;
  Valleys: number;
  Facets: number;
  Pitch: string;
  Assets: {
    Report: string;
    Cover: string;
    Diagram: string;
    Acculynx: string;
    HomeownerReport: string;
    Report3D: string;
    VerticalImage?: string;
    NorthImage?: string;
    EastImage?: string;
    SouthImage?: string;
    WestImage?: string;
    DxfUrl?: string;
    SummaryUrl?: string;
  };
  Bends: number;
  Flash: number;
  Step: number;
  DripEdge: number;
  LeakBarrier: number;
  RidgeCap: number;
  Starter: number;
  Parapets: number;
  SuggestedWaste: number;
  PitchToArea: string;
  Buildings: string;
  CobraExhaustVentFeet: number | null;
  CobraIntakeVentFeet: number | null;
  DeckArmorRolls: number | null;
  HoleArea: number | null;
  HoleCount: number | null;
  HolePerimeter: number | null;
  LibertyBaseRolls: number | null;
  LibertyCapRolls: number | null;
  MasterFlowDomeVents: number | null;
  MasterFlowLouverVents: number | null;
  ProStartBundles: number | null;
  QuickStartRolls: number | null;
  SealARidgeBundles: number | null;
  ShingleMateRolls: number | null;
  StormGuardRolls: number | null;
  TimberCrestBoxes: number | null;
  TimberlineBundles: number | null;
  TimberTexBundles: number | null;
  VersaShieldRolls: number | null;
  WeatherBlockerBundles: number | null;
  WeatherWatchRolls: number | null;
  ZRidgeBundles: number | null;
}

export interface QuickMeasureOrderSearchResult {
  reportReferenceNumber: string;
  reportMetaData: string;
  reportErrorDetails: string | null;
  acculynxUrl: string;
  coverUrl: string;
  diagramUrl: string;
  modelUrl: string;
  reportUrl: string;
  baseReportUrl: string;
  xmlUrl: string;
  dxfUrl: string;
  quickSiteUrl: string | null;
  additionalInformation: string | null;
  groupOrderId: number;
  groupOrderStatus: string;
  orderId: number;
  userId: number;
  gafcustomerId: number;
  profileId: number;
  productId: number;
  propertyType: string;
  subscriberId: number;
  productDescription: string;
  address1: string;
  address2: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  fipscode: string | null;
  county: string | null;
  latitude: number;
  longitude: number;
  isValidAddress: number;
  fullAddress: string;
  orderStatus: string;
  responseTime: number;
  orderRequestedOn: string;
  orderRespondedOn: string;
  recipientEmailAddresses: string;
  instructions: string | null;
  isLate: number;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
  refOrderNo: string | null;
  emailAddress: string;
  rejectRequestedOn: string | null;
  rejectReason: string | null;
  rejectedBy: string | null;
  transactionId: string | null;
  subscriberOrderNumber: string | null;
  subscriberCustomField1: string | null;
  invoiceSubscriberForOrder: string;
  subscriberOrderAmount: number;
  orderAmount: number;
  groupOrderTotalAmount: number | null;
  source: string | null;
  buildingTag: string | null;
  pinName: string | null;
  relatedOrders: QuickMeasureOrderSearchResult[] | null;
  customerName: string | null;
  customerEmailAddress: string | null;
  customerPhoneNumber: string | null;
  customerOtherInfo: string | null;
  bulkOrderId: number | null;
  disableEmailDelivery: number;
  isSharedByOtherUser: boolean;
  isThisOrderSharedToOtherUser: boolean;
}

export interface QuickMeasureOrderSearchPaging {
  pageNo: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  token: string | null;
}

export interface QuickMeasureOrderSearchResponse {
  message: string | null;
  success: boolean;
  errorCode: string | null;
  paging: QuickMeasureOrderSearchPaging;
  sortBy: string | null;
  sortOrder: string | null;
  result: QuickMeasureOrderSearchResult[];
}

export interface QuickMeasureOrderDetail {
  orderId: number;
  subscriberOrderNumber: string | null;
  orderStatus: string;
  groupOrderStatus: string;
  reportReferenceNumber: string;
  fullAddress: string;
  orderRequestedOn: string;
  orderRespondedOn: string;
  reportMetaData: QuickMeasureReportMetaData | null;
  reportUrl: string;
  coverUrl: string;
  diagramUrl: string;
  modelUrl: string;
  dxfUrl: string;
  isCompleted: boolean;
}

export interface QuickMeasureTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}
export interface SupabaseClientConfig {
  supabaseUrl: string;
  supabaseKey: string;
}
export interface QuickMeasureOrderResponseNormalized extends QuickMeasureOrderResponse {
  gafOrderNumber?: number | null;
}