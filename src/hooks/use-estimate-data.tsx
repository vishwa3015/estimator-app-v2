/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EstimateDocument } from "@/types/estimate-items";
import { GHLOpportunity, GHLContact, GHLCredentials } from "@/types/ghl";
import { estimateService } from "@/services/estimates";
import { ghlService } from "@/services/ghl";
import { toast } from "@/hooks/use-toast";
// import { locationService } from "@/services/estimates/location-service";
// import { supabase } from "@/integrations/supabase/client";
// import defaultConfig from "../configs/estimatesEditorConfig";

export const useEstimateData = (injectedContact?: GHLContact) => {
  const { opportunityId, estimateId, contactId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [opportunity, setOpportunity] = useState<GHLOpportunity | null>(null);
  const [estimate, setEstimate] = useState<EstimateDocument | null>(null);
  const [credentials, setCredentials] = useState<GHLCredentials | null>(null)
  const [contact, setContact] = useState<GHLContact | null>(null);

  // const [form_values, setFormValues] = useState({})

  useEffect(() => {
    // async function fetchOrCreateConfiguration() {
    //   // setIsLoading(true);
    //   try {
    //     const locationId = await locationService.getLocationContext();
    //     if (!locationId) {
    //       // setError("You are not authorized to access this page. Please login.");
    //       return;
    //     }
    //     // Step 1: Try to fetch existing config
    //     const { data, error } = await (supabase as any)
    //       .from("estimate_configurations_v2")
    //       .select("*")
    //       .eq("location_id", locationId)
    //       .limit(1);

    //     if (error) {
    //       console.error(error);
    //       // setError(error.message);
    //       return;
    //     }

    //     let config;

    //     // Step 2: If not found, create new one
    //     if (!data || data.length === 0) {
    //       const insertPayload = {
    //         user_id: null,
    //         location_id: locationId,
    //         config_name: "Default Configuration",
    //         config_data: defaultConfig, // your default config object
    //         version: 1,
    //         is_active: true,
    //       };

    //       const { data: inserted, error: insertError } = await supabase
    //         .from("estimate_configurations_v2")
    //         .insert(insertPayload)
    //         .select("*") // return the inserted row
    //         .single();

    //       if (insertError) {
    //         console.error(insertError);
    //         // setError(insertError.message);
    //         return;
    //       }

    //       config = inserted;
    //     } else {
    //       config = data[0];
    //     }

    //     // Step 3: Update state
    //     setFormValues(config?.form_values)
    //   } catch (err: any) {
    //     console.error(err);
    //     // setError(err.message || "Unexpected error");
    //   } finally {
    //     // setIsLoading(false);
    //   }
    // }
    const loadData = async () => {
      // setIsLoading(true);

      try {
        const storedCredentials = localStorage.getItem(
          "smartroofing_credentials"
        );
        if (!storedCredentials && !injectedContact?.id) {
          navigate("/auth");
          return;
        }

        const creds = JSON.parse(storedCredentials);
        setCredentials(creds);

        if (estimateId) {
          const loadedEstimate = await estimateService.getEstimateById(
            estimateId,
            !!injectedContact?.id
          );
          console.log(loadedEstimate, " <== loadeded estimate...");

          if (loadedEstimate) {
            setEstimate(loadedEstimate);

            // try {
            //   const loadedOpportunity = await ghlService.getOpportunityById(
            //     creds,
            //     `contact-${loadedEstimate.opportunity_id}`
            //   );
            //   setOpportunity(loadedOpportunity);

            //   // Update the estimate with contact email if needed
            //   if (
            //     loadedOpportunity?.contact?.email &&
            //     !loadedEstimate.contactEmail
            //   ) {
            //     loadedEstimate.contactEmail = loadedOpportunity.contact.email;
            //     setEstimate({ ...loadedEstimate });
            //   }
            // } catch (opportunityError) {
            //   console.error("Error loading opportunity:", opportunityError);
            //   toast({
            //     title: "Warning",
            //     description:
            //       "Could not load opportunity details for this estimate.",
            //     variant: "destructive",
            //   });
            // }
          } else {
            toast({
              title: "Error",
              description: "Estimate not found",
              variant: "destructive",
            });
            navigate("/");
          }
        } else if (opportunityId) {
          try {
            const loadedOpportunity = await ghlService.getOpportunityById(
              creds,
              opportunityId
            );
            setOpportunity(loadedOpportunity);
          } catch (opportunityError) {
            console.error("Error loading opportunity:", opportunityError);
            toast({
              title: "Error",
              description: "Opportunity not found",
              variant: "destructive",
            });
            navigate("/");
          }
        }
        if (contactId) {
          // Load contact for direct contact estimates
          try {
            const loadedContact = await ghlService.getContactById(
              creds,
              contactId
            );
            if (loadedContact) {
              setContact(loadedContact);
              // Create a pseudo-opportunity from contact data
              const pseudoOpportunity: GHLOpportunity = {
                id: `contact-${contactId}`,
                name: `Estimate for ${loadedContact.name ||
                  `${loadedContact.firstName || ""} ${loadedContact.lastName || ""
                    }`.trim() ||
                  "Contact"
                  }`,
                value: 0,
                status: "open",
                contactId: loadedContact.id,
                contactName:
                  loadedContact.name ||
                  `${loadedContact.firstName || ""} ${loadedContact.lastName || ""
                    }`.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                contact: loadedContact,
              };
              setOpportunity(pseudoOpportunity);
            } else {
              toast({
                title: "Error",
                description: "Contact not found",
                variant: "destructive",
              });
              navigate("/");
            }
          } catch (contactError) {
            console.error("Error loading contact:", contactError);
            toast({
              title: "Error",
              description: "Contact not found",
              variant: "destructive",
            });
            navigate("/");
          }
        } else if (!injectedContact?.id){
          navigate("/");
        }
      } catch (error) {
        console.error("Error in EstimateEditorPage:", error);
        toast({
          title: "Error",
          description: "An error occurred while loading the estimate",
          variant: "destructive",
        });
      } finally {
        // setIsLoading(false);
      }
    };

    setIsLoading(true)
    Promise.all([
      loadData(),
      // fetchOrCreateConfiguration()
    ])
      .finally(() => {
        setIsLoading(false);
      })
  }, [estimateId, opportunityId, contactId, navigate]);

  return { isLoading, opportunity, estimate, credentials, contact };
};
