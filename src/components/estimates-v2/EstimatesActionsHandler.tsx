/* eslint-disable @typescript-eslint/no-unused-expressions */
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { estimateServiceV2, SavedEstimate } from "@/services/estimates/estimate-service-v2";
import { generatePDFCustom } from "@/utils/pdf/generators/estimateV2Generator";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEstimateData } from "@/hooks/use-estimate-data";
import { useLocalGHLCredentials } from "@/services/ghl/getghlCredentials";
import { setEstimateAndTriggerWorkflow } from "@/services/ghl/ghlEmailTriggerService";
import { updateEstimateContact } from "@/services/ghl/ghlApproveEmailTriggerService";
import { fileUploadService } from "@/services/estimates/file-upload-service";
import { calculateTabTotals, QuoteSectionUpdate } from "@/utils/quoteCalculations";
import { getAuthorizationSigningTabOptionsForEnvelope } from "@/utils/pdf/generators/authorizationPagePdfLib";
import { Product, ProductCategory, productService } from "@/services/products/product-service";
import { extractQuoteFields, getCategoryName } from "@/utils/Quotefield";
import { templateService } from "@/services/estimates";
import { formatPrice } from "@/utils/currency";
import { FormValues, SectionConfig, UserInfo } from "@/types/estimate-items";


interface EstimatesActionsHandlerProps {
  formValues: FormValues;
  sectionUpdates: SectionConfig[];
  opportunityId: string;
  contactId?: string;
  configId?: string;
  handleBackToJob?: () => void;
  estimateId?: string;
  flowType?: 'approval' | 'customer',
  selectedOpportunityId?: string;
  templateId?: string | null;
  locationId?: string;
  children: (actions: {
    handleSave: (title?: string) => Promise<SavedEstimate>;
    handleDelete: () => Promise<{ success: boolean }>;
    handleViewFullEstimate: () => Promise<void>;
    handleDownloadPDF: () => Promise<void>;
    handleSendEstimate: (email: string, subject: string, userInfo: UserInfo, message?: string, flowType?: 'approval' | 'customer') => Promise<void>;
  }) => React.ReactNode;
}

interface EstimateWithConfig {
  id?: string;
  config_data?: { title?: string };
}

export const EstimatesActionsHandler: React.FC<EstimatesActionsHandlerProps> = ({
  formValues,
  sectionUpdates,
  opportunityId,
  contactId,
  configId,
  children,
  handleBackToJob,
  estimateId,
  templateId,
  flowType,
  selectedOpportunityId,
   locationId
}) => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { estimate, contact, opportunity } = useEstimateData();
    const { credentials: ghlCredentials, loading: ghlLoading } = useLocalGHLCredentials();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

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
        console.error("EstimatesActionsHandler: failed to load catalog data", error);
      }
    };
    fetchCatalogData();
  }, []);

  const handleSave = async (title?: string, skipNavigation = false) => {
    try {
      // Use report_type from formValues if available, otherwise use provided title
      const estimateTitle = String(title ?? formValues?.['1']?.report_type ?? estimate?.config_data?.title ?? 'New Estimate');
      let finalTemplateId = templateId ?? undefined;
      if (!estimateId && !finalTemplateId) {
        const locId = ghlCredentials?.companyId;
        if (locId) {
          const defaultTemplate = await templateService.getDefaultTemplateForLocation(locId);
          finalTemplateId = defaultTemplate?.id ?? undefined;
        }
      }

      const resolvedOpportunityId = selectedOpportunityId
        || formValues?.opportunityId
        || undefined;

        const resolvedLocationId = locationId ?? ghlCredentials?.companyId ?? null;
        const savedEstimate = await estimateServiceV2.saveEstimate({
          formValues,
          sectionUpdates,
          opportunityId,
          contactId,
          configId,
          title: estimateTitle,
          estimateId,
          selectedOpportunityId: resolvedOpportunityId,
          templateId: estimateId ? undefined : finalTemplateId,
          locationId: resolvedLocationId,
    });

      toast({
          title: "Success",
          description: "Estimate saved successfully",
        });

      // ← Only navigate back when manually saving, not when called from send
      if (!skipNavigation) {
        handleBackToJob && handleBackToJob();
      }

        return savedEstimate;
      } catch (error) {
        console.error("Error saving estimate:", error);
        toast({
          title: "Error",
          description: "Failed to save estimate",
          variant: "destructive",
        });
        throw error;
      }
    };

    const handleDelete = async () => {
      if (!estimateId) {
        toast({
          title: "Error",
          description: "No estimate ID found",
          variant: "destructive",
        });
        return { success: false };
      }

      try {
        const result = await estimateServiceV2.deleteEstimate(estimateId);

        if (result.success) {
          toast({
            title: "Success",
            description: "Estimate deleted successfully",
          });
          handleBackToJob && handleBackToJob();
          return { success: true };
        } else {
          throw new Error(result.error || 'Failed to delete estimate');
        }
      } catch (error) {
        console.error("Error deleting estimate:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete estimate",
          variant: "destructive",
        });
        return { success: false };
      }
    };

    const handleViewFullEstimate = async () => {
      try {
        await generatePDFCustom(document.getElementById('pdfPreview'), 'quote.pdf', false, formValues, sectionUpdates)
      } catch (error) {
        console.error("Error generating preview:", error);
        toast({
          title: "Error",
          description: "Failed to generate PDF preview",
          variant: "destructive",
        });
      }
    };

    const handleDownloadPDF = async () => {
      try {
        await generatePDFCustom(document.getElementById('pdfPreview'), 'quote.pdf', true, formValues, sectionUpdates)

        toast({
          title: "Success",
          description: "PDF downloaded successfully",
        });
      } catch (error) {
        console.error("Error downloading PDF:", error);
        toast({
          title: "Error",
          description: "Failed to download PDF",
          variant: "destructive",
        });
      }
    };

  const handleSendEstimate = async (email: string, subject: string, userInfo: UserInfo, message?: string, flowType?: 'approval' | 'customer') => {
    try {

      const tabTotalErrors = (formValues as FormValues & { _tabTotalErrors?: Record<string, string> })?._tabTotalErrors ?? {};
      const errorTabIds = Object.keys(tabTotalErrors).filter(id => !!tabTotalErrors[id]);
    
    if (errorTabIds.length > 0) {
      const quoteSection = sectionUpdates.find((sec) => sec.id === 6);
      const firstErrorTabId = errorTabIds[0];
      const tab = quoteSection?.tabs?.find((t) => t.id === firstErrorTabId);
      toast({
        title: "Tab Total Out of Range",
        description: `"${tab?.title || 'A tab'}" has an invalid total: ${tabTotalErrors[firstErrorTabId]}. Please fix it before sending.`,
        variant: "destructive",
      });
      return;
    }

      // First save the estimate
      const savedEstimate = await handleSave(
        estimateId ? (estimate as EstimateWithConfig)?.config_data?.title : 'Email Estimate',
        true
      );


      // Generate PDF (authorization page is vector pdf-lib when #pdfPreview-auth exists)
      const pdfBlob = await generatePDFCustom(
        document.getElementById('pdfPreview'),
        'quote.pdf',
        false,
        formValues,
        sectionUpdates,
        true,
      );

      // Upload PDF to Supabase storage
      const fileName = `estimates/${opportunityId}/${savedEstimate?.id || estimateId}/${savedEstimate?.id || estimateId}-estimate.pdf`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('estimate-files')
        .upload(fileName, pdfBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf', 
        });

        if (uploadError) {
          throw new Error(`Failed to upload PDF: ${uploadError.message}`);
        }

        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from('estimate-files')
          .getPublicUrl(fileName);

      const pdfUrl = urlData.publicUrl;
      try {
        if (flowType === 'approval') {
          const estimateReviewURL = `https://estimatetracker.tool.smartroofing.ai/estimate-action/${savedEstimate?.id || estimateId}`;
          const contactFullDetailURL = `https://app.smartroofing.ai/v2/location/${contact?.locationId}/contacts/detail/${contact?.id}`;

           const tabWiseTotals = calculateTabTotals(sectionUpdates as unknown as QuoteSectionUpdate[], formValues);
          const goodPrice = formatPrice(tabWiseTotals[0]?.total);
          const betterPrice = formatPrice(tabWiseTotals[1]?.total);
          const bestPrice = formatPrice(tabWiseTotals[2]?.total);

          const fullAddress = [
            formValues?.[1]?.address,
            formValues?.[1]?.city,
            formValues?.[1]?.state,
            formValues?.[1]?.zip_code
          ].filter(Boolean).join(", ");

          const reportId = savedEstimate?.id || estimateId || "";
          const termsAndConditions = String(formValues?.[9]?.terms ?? "");
          const introduction = String(formValues?.[2]?.introduction ?? "");
          const reportType = String(formValues?.[1]?.report_type ?? "");
          const primaryImage = formValues?.[1]?.primary_image as { file_storage_path?: string } | undefined;
          const frontImgUrl = primaryImage?.file_storage_path
            ? fileUploadService.getFileUrl(primaryImage.file_storage_path)
            : "";


          const {
            goodTitle, betterTitle, bestTitle,
            goodDescription, betterDescription, bestDescription,
            goodItems, betterItems, bestItems,
            goodProductDetails, betterProductDetails, bestProductDetails
          } = extractQuoteFields(formValues, sectionUpdates, (item) => getCategoryName(item, products, categories), products)

          await updateEstimateContact(
            ghlCredentials,
            contactId,
            fullAddress,
            reportId,
            goodPrice,
            betterPrice,
            bestPrice,
            termsAndConditions,
            frontImgUrl,
            false,
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
            reportType
          );

          await setEstimateAndTriggerWorkflow(
            ghlCredentials,
            contactId,
            pdfUrl,
            estimateReviewURL,
            contactFullDetailURL
          );

          toast({
            title: "Success",
            description: "Estimate sent successfully via email",
          });
        } else {

          const tabWiseTotals = calculateTabTotals(sectionUpdates as unknown as QuoteSectionUpdate[], formValues);

          const goodPrice = formatPrice(tabWiseTotals[0]?.total);
          const betterPrice = formatPrice(tabWiseTotals[1]?.total);
          const bestPrice = formatPrice(tabWiseTotals[2]?.total);

          const fullAddress = [
            formValues?.[1]?.address,
            formValues?.[1]?.city,
            formValues?.[1]?.state,
            formValues?.[1]?.zip_code
          ].filter(Boolean).join(", ");

          const reportId = savedEstimate?.id || estimateId || "";

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
            goodProductDetails,betterProductDetails,bestProductDetails
          } = extractQuoteFields(formValues, sectionUpdates, (item) => getCategoryName(item, products, categories), products)

          await updateEstimateContact(
            ghlCredentials,
            contactId,
            fullAddress,
            reportId,
            goodPrice,
            betterPrice,
            bestPrice,
            termsAndConditions,
            frontImgUrl,
            false,
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
            reportType
          );

          const resolvedEstimateId = savedEstimate?.id || estimateId;
          const recipientEmail = String(
            contact?.email || email || '',
          ).trim();
          const recipientName =
            [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') ||
            contact?.name ||
            contact?.contactName ||
            contact?.fullNameLowerCase ||
            userInfo?.name ||
            opportunity?.contactName ||
            'Customer';

          const { data: docusignResult, error: docusignError } = await supabase.functions.invoke(
            'docusign-create-envelope',
            {
              body: {
                estimateId: resolvedEstimateId,
                pdfUrl,
                recipientEmail,
                recipientName,
                emailSubject: subject,
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
            },
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

          toast({
            title: "Success",
            description: "Signing request sent — the customer will receive an email from DocuSign.",
          });
        }

        if (!estimateId) {
          navigate(savedEstimate?.id);
        }
      } catch (err) {
        console.error("Error sending estimate:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: flowType === 'approval' 
            ? "Could not send estimate for approval." 
            : "Could not send estimate to customer.",
        });
        throw err;
      }
    } catch (error) {
      console.error("Error in handleSendEstimate:", error);
      toast({
        title: "Error",
        description: "Failed to process estimate",
        variant: "destructive",
      });
      throw error;
    }
  };

    return (
      <>
        {children({
          handleSave,
          handleDelete,
          handleViewFullEstimate,
          handleDownloadPDF,
          handleSendEstimate,
        })}
      </>
    );
  };
