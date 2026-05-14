import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { ghlService } from "@/services/ghl";
import { generatePDFCustom } from "@/utils/pdf/generators/estimateV2Generator";
import QuotationTemplate from "@/components/pdf/QuoteTemplate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateEstimateContact } from "@/services/ghl/ghlApproveEmailTriggerService";
import { fileUploadService } from "@/services/estimates/file-upload-service";
import { calculateTabTotals } from "@/utils/quoteCalculations";
import { Product, ProductCategory, productService } from "@/services/products/product-service";
import { extractQuoteFields, getCategoryName } from "@/utils/Quotefield";
import { getAuthorizationSigningTabOptionsForEnvelope } from "@/utils/pdf/generators/authorizationPagePdfLib";
import { formatPrice } from "@/utils/currency";
import { FormValues, SectionConfig } from "@/types/estimate-items";
import { GHLContact } from "@/types/ghl";

interface EstimateDocumentV2 {
  id: string;
  opportunity_id: string;
  contact_id: string | null;
  location_id: string | null;
  status: string;
  form_data: FormValues;
  config_data: { sections: SectionConfig[]; title?: string } | null;
  created_at: string;
  change_request_reason?: string | null;
}

interface GHLCredentials {
  pit: string;
  apikey: string;
  companyId: string;
}
interface LocationBusiness {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  city?: string;
  postalCode?: string;
}

interface LocationDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  business?: LocationBusiness;
}

const EstimateAction = () => {
  const { estimateId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [estimate, setEstimate] = useState<EstimateDocumentV2 | null>(null);
  const [contact, setContact] = useState<GHLContact | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [credentials, setCredentials] = useState<GHLCredentials | null>(null);
  const [locDetails, setLocDetails] = useState<LocationDetails | null>(null);
  const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null);
  const [mailSubject, setMailSubject] = useState<string>(`Estimate Approval for new estimate`);
  const [mailBody, setMailBody] = useState<string>();
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isViewing, setIsViewing] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const formValues: FormValues | undefined = estimate?.form_data;
  const sectionUpdates: SectionConfig[] | undefined = estimate?.config_data?.sections;
  const tabWiseTotals: { tabId: string; total: number; title: string }[] =
    (estimate?.form_data as Record<string, unknown> & { tabWiseTotals?: { tabId: string; total: number; title: string }[] })?.tabWiseTotals ?? [];

  const fetchEstimates = async () => {
    const { data: estimateData, error: estimateError } = await supabase
      .from('estimate_documents_v2')
      .select('*')
      .eq('id', estimateId)
      .single();
    setEstimate(estimateData);
  }

  useEffect(() => {
    const fetchCatalogData = async () => {
      try {
        const [productsList, categoriesList] = await Promise.all([
          productService.getProducts(),
          productService.getCategories(),
        ]);
        setProducts(productsList);
        setCategories(categoriesList);
      } catch (error) {
        console.error("Failed to load catalog data", error);
      }
    };
    fetchCatalogData();
  }, []);

  useEffect(() => {

    const fileName = `estimates/${estimate?.opportunity_id}/${estimateId}/${estimateId}-estimate.pdf`;

    const { data: urlData } = supabase.storage
      .from('estimate-files')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;
    setPdfUrl(pdfUrl);
    setMailBody(
      `Hi ${contact?.firstName || "there"},\n\n` +
      `Your estimate is ready\n\n`
    );
  }, [estimate, contact, locDetails, estimateId])

  useEffect(() => {
    async function fetchLocationDetails(creds: GHLCredentials) {
      try {
        const locationDetails = await ghlService.getLocationDetails(creds);
        setLocDetails(locationDetails || null);
      } catch (error) {
        console.error("Error parsing stored credentials:", error);
        localStorage.removeItem("smartroofing_credentials");
      }
    }
    const checkAuthorization = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Error",
            description: "Please log in to access this estimate",
            variant: "destructive"
          });
          navigate("/auth");
          return;
        }

        // Get user profile to get location_id
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('location_id, private_integration_token, api_key' )
          .eq('id', user.id)
          .single();

        if (!profile?.location_id || !profile?. private_integration_token || !profile?. api_key) {
          toast({
            title: "Error",
            description: "User profile not properly configured",
            variant: "destructive"
          });
          navigate("/");
          return;
        }

        setCredentials({
          pit: profile.private_integration_token,
          apikey: profile.api_key,
          companyId: profile.location_id
        });

        // Get estimate
        const { data: estimateData, error: estimateError } = await supabase
          .from('estimate_documents_v2')
          .select('*')
          .eq('id', estimateId)
          .single();

        if (estimateError || !estimateData) {
          toast({
            title: "Error",
            description: "Estimate not found",
            variant: "destructive"
          });
          navigate("/");
          return;
        }

        setEstimate(estimateData);

        // Get contact details from GHL
        if (estimateData.contact_id) {
          try {
            const contactData = await ghlService.getContactById(
              { pit: profile.private_integration_token, apikey: profile.api_key, companyId: profile.location_id },
              estimateData.contact_id
            );

            setContact(contactData);

            // Check if current user matches assignedTo
            const UserData = await ghlService.getUserById({ pit: profile.private_integration_token, apikey: profile.api_key, companyId: profile.location_id }, contactData?.assignedTo)
            if (UserData.email === user.email) {
              setIsAuthorized(true);
            } else {
              toast({
                title: "Unauthorized",
                description: "You are not authorized to perform actions on this estimate",
                variant: "destructive"
              });
              navigate("/");
            }
          } catch (error) {
            console.error("Error fetching contact:", error);
            toast({
              title: "Error",
              description: "Failed to verify authorization",
              variant: "destructive"
            });
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Authorization check failed:", error);
        toast({
          title: "Error",
          description: "Failed to verify access",
          variant: "destructive"
        });
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    const tryingForNonAuth = async () => {
      try {

        const { data: estimateData, error: estimateError } = await supabase
          .from('estimate_documents_v2')
          .select('*')
          .eq('id', estimateId)
          .single();

        // Get user profile to get location_id
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('location_id, private_integration_token, api_key')
          .eq('location_id', estimateData?.location_id)
          .limit(1)
          .single();

        console.log({ profile, profileError }, ' <=== PRofile and profile error')

        if (!profile?.location_id || !profile?.api_key || !profile?.private_integration_token) {
          toast({
            title: "Error",
            description: "User profile not properly configured",
            variant: "destructive"
          });
          navigate("/");
          return;
        }
        const credentials = {
          pit: profile.private_integration_token,
          apikey: profile.api_key,
          companyId: profile.location_id
        }
        setCredentials(credentials);

        if (estimateError || !estimateData) {
          toast({
            title: "Error",
            description: "Estimate not found",
            variant: "destructive"
          });
          navigate("/");
          return;
        }

        setEstimate(estimateData);

        // Get contact details from GHL
        if (estimateData.contact_id) {
          try {
            const contactData = await ghlService.getContactById(
              { pit: profile.private_integration_token, apikey: profile.api_key, companyId: profile.location_id },
              estimateData.contact_id
            );

            setContact(contactData);
            setIsAuthorized(true);
            await fetchLocationDetails(credentials);
            // AUTH SKIPPED FOR NOW
            // // Check if current user matches assignedTo
            // const UserData = await ghlService.getUserById({ apiKey: profile.api_key, companyId: profile.location_id }, contactData?.assignedTo)
            // if (UserData.email === user.email) {
            //   setIsAuthorized(true);
            // } else {
            //   toast({
            //     title: "Unauthorized",
            //     description: "You are not authorized to perform actions on this estimate",
            //     variant: "destructive"
            //   });
            //   navigate("/");
            // }
          } catch (error) {
            console.error("Error fetching contact:", error);
            toast({
              title: "Error",
              description: "Failed to verify authorization",
              variant: "destructive"
            });
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Authorization check failed:", error);
        toast({
          title: "Error",
          description: "Failed to verify access",
          variant: "destructive"
        });
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    }

    tryingForNonAuth();

    // checkAuthorization();
    // fetchLocationDetails();
  }, [estimateId, navigate]);

  const handleGeneratePDF = async (filename = "quote.pdf") => {
    try {
      setIsDownloading(true);
      await generatePDFCustom(
        document.getElementById("pdfPreview"),
        filename,
        true,
        formValues,
        sectionUpdates
      );
      toast({ title: "Success", description: "PDF downloaded successfully" });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({ title: "Error", description: "Failed to download PDF", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewPDF = async () => {
    try {
      setIsViewing(true);

      const pdfBlob = await generatePDFCustom(
        document.getElementById("pdfPreview"),
        "preview.pdf",
        false,
        formValues,
        sectionUpdates,
        true 
      );

      if (pdfBlob) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, "_blank");
      }
    } catch (error) {
      console.error("Error generating preview PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF preview",
        variant: "destructive"
      });
    } finally {
      setIsViewing(false);
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      // Update estimate status to approved
      const { error: updateError } = await supabase
        .from('estimate_documents_v2')
        .update({ status: 'accepted' })
        .eq('id', estimateId);

      if (updateError) throw updateError;

      // 2. Generate PDF blob (returnBlob = true)
      const pdfBlob = await generatePDFCustom(
        document.getElementById("pdfPreview"),
        "quote.pdf",
        false,        // don't download
        formValues,
        sectionUpdates,
        true          // return as blob
      );

      if (!pdfBlob) throw new Error("Failed to generate PDF blob");

      // 3. Upload PDF to Supabase storage
      const fileName = `estimates/${estimate?.opportunity_id}/${estimateId}/${estimateId}-estimate.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('estimate-files')
        .upload(fileName, pdfBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf',
        });

      if (uploadError) throw new Error(`Failed to upload PDF: ${uploadError.message}`);

      // 4. Get public URL
      const { data: urlData } = supabase.storage
        .from('estimate-files')
        .getPublicUrl(fileName);

      const pdfUrl = urlData.publicUrl;

      // 5. Calculate totals and build fields (same as customer flow)
        const calculatedTotals = calculateTabTotals(sectionUpdates, formValues);

        const goodPrice = formatPrice(calculatedTotals[0]?.total);
        const betterPrice = formatPrice(calculatedTotals[1]?.total);
        const bestPrice = formatPrice(calculatedTotals[2]?.total);

        const fullAddress = [
          formValues?.[1]?.address,
          formValues?.[1]?.city,
          formValues?.[1]?.state,
          formValues?.[1]?.zip_code
        ].filter(Boolean).join(", ");

        const reportId = estimateId || estimate?.opportunity_id || "";

          const termsAndConditions = String(formValues?.[9]?.terms ?? "");

        const primaryImage = formValues?.[1]?.primary_image as { file_storage_path?: string } | undefined;
              const frontImgUrl = primaryImage?.file_storage_path
                ? fileUploadService.getFileUrl(primaryImage.file_storage_path)
                : "";
      const introduction = String(formValues?.[2]?.introduction ?? "");
      const reportType = String(formValues?.[1]?.report_type ?? "");

        const {
          goodTitle, betterTitle, bestTitle,
          goodDescription, betterDescription, bestDescription,
          goodItems, betterItems, bestItems,
          goodProductDetails, betterProductDetails, bestProductDetails,
        } = extractQuoteFields(formValues, sectionUpdates, (item) => getCategoryName(item, products, categories));

        await updateEstimateContact(
          credentials,
          contact.id,
          fullAddress,
          reportId,
          goodPrice,
          betterPrice,
          bestPrice,
          termsAndConditions,
          frontImgUrl,
          false,          // ← customer flow
          goodTitle,
          goodDescription,
          goodItems,
          betterTitle,
          betterDescription,
          betterItems,
          bestTitle,
          bestDescription,
          bestItems,
          goodProductDetails,
          betterProductDetails,
          bestProductDetails,
          introduction,
          reportType,
        );

      // 7. Send DocuSign envelope to customer (same as customer flow)
      const recipientEmail = String(contact?.email || "").trim();
      const recipientName = [contact?.firstName, contact?.lastName]
        .filter(Boolean).join(" ") || contact?.name || contact?.fullNameLowerCase || "Customer";

      const { data: docusignResult, error: docusignError } = await supabase.functions.invoke(
        'docusign-create-envelope',
        {
          body: {
            estimateId,
            pdfUrl,
            recipientEmail,
            recipientName,
            emailSubject: `Estimate for ${recipientName}`,
            authorizationSigning: (() => {
              try {
                const tabs = getAuthorizationSigningTabOptionsForEnvelope(formValues, sectionUpdates) ?? [];
                if (!Array.isArray(tabs) || tabs.length === 0) {
                  console.warn("No authorization signing tabs generated");
                  return { tabs: [] };
                }
                return { tabs };
              } catch (err) {
                console.error("Failed to build authorization signing tabs:", err);
                return { tabs: [] };
              }
            })(),
          },
        }
      );
      if (docusignError || (docusignResult && typeof docusignResult === 'object' && 'error' in docusignResult)) {
        // Cleanup uploaded PDF from storage on DocuSign failure
        await supabase.storage
          .from('estimate-files')
          .remove([fileName]);

        throw docusignError ?? new Error(
          String((docusignResult as { error?: string }).error || 'DocuSign request failed'),
        );
      }

      setDialogAction(null);

      toast({
        title: "Success",
        description: "Estimate approved — signing request sent to customer via DocuSign.",
      });

      fetchEstimates();
      // navigate("/");
    } catch (error) {
      console.error("Error approving estimate:", error);
      toast({
        title: "Error",
        description: "Failed to approve estimate",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!changeRequestReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the change request",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('estimate_documents_v2')
        .update({
          status: 'declined',
          change_request_reason: changeRequestReason
        })
        .eq('id', estimateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Change request submitted successfully"
      });

      navigate("/");
    } catch (error) {
      console.error("Error submitting change request:", error);
      toast({
        title: "Error",
        description: "Failed to submit change request",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Estimate Review</CardTitle>
          <CardDescription>
            Review and take action on this estimate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {estimate && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Estimate Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Estimate ID:</p>
                    <p className="font-medium">{estimate.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status:</p>
                    <p className="font-medium capitalize">{estimate.status}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Title:</p>
                    <p className="font-medium">{estimate.config_data?.title || 'Untitled'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created:</p>
                    <p className="font-medium">
                      {new Date(estimate.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {contact && (
                <div>
                  <h3 className="font-semibold mb-2">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name:</p>
                      <p className="font-medium">{contact.name || `${contact.firstName ? `${contact.firstName} ${contact.lastName}` : '-'}`}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email:</p>
                      <p className="font-medium">{contact.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <Button
                  variant="secondary"
                  onClick={() => handleGeneratePDF()}
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <></>
                  )}
                  Download PDF
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleViewPDF}
                >
                  {isViewing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <></>
                  )}
                  View PDF
                </Button>
              </div>

              <div className=" space-y-4">
                <h3 className="font-semibold">Actions</h3>

                <div className="space-y-4 flex gap-4">
                  <Button
                    onClick={() => setDialogAction("approve")}
                    disabled={isProcessing || estimate.status === 'accepted' || estimate.status === 'declined' || estimate.status === 'sent'}
                    className="w-full bg-green-700"
                    size="lg"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve and Download PDF
                  </Button>
                  <Button
                    onClick={() => setDialogAction("reject")}
                    disabled={isProcessing || estimate.status === 'change_request' || estimate.status === 'accepted' || estimate.status === 'declined' || estimate.status === 'sent'}
                    className="w-full !mt-0"
                    size="lg"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Request Changes
                  </Button>
                </div>

              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!dialogAction} onOpenChange={() => setDialogAction(null)}>
        <DialogContent className="max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "approve" && "Send Approval Email"}
              {dialogAction === "reject" && "Request Changes"}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "reject" && "Please describe the changes you need for this estimate."}
            </DialogDescription>
          </DialogHeader>

          {dialogAction === "approve" && (

            <div className="py-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-600 flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <p className="text-center text-[22px] text-gray-700">
                  Are you sure you want to send this estimate to{" "}
                  <span className="font-semibold">
                    {contact?.fullNameLowerCase || contact?.firstName || "the customer"}
                  </span>
                  ?
                </p>
              </div>
            </div>
          )}

          {dialogAction === "reject" && (
            <div className="space-y-4 py-4">
              <label className="block text-sm font-medium mb-1">Reason for Change Request</label>
              <Textarea
                placeholder="Describe the changes needed..."
                value={changeRequestReason}
                onChange={(e) => setChangeRequestReason(e.target.value)}
                rows={4}
                disabled={isProcessing || estimate.status === 'change_request'}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogAction(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>

            {dialogAction === "approve" && (
              <Button
                onClick={handleApprove}
                disabled={isProcessing || !mailSubject.trim() || !mailBody.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Approve & Send Mail
              </Button>
            )}

            {dialogAction === "reject" && (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing || !changeRequestReason.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <></>
                )}
                Submit Change Request
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div style={{ display: 'none' }}>
        <QuotationTemplate
          formValues={formValues}
          sectionUpdates={sectionUpdates}
          locDetails={locDetails}
          contact={contact}
          locationId={estimate?.location_id || credentials?.companyId || ""}
        />
      </div>
    </div>
  );
};

export default EstimateAction;
