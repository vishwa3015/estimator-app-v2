import { API_BASE_URL, getHeaders } from "./config";
import { GHLCredentials } from "@/types/ghl";

export const updateEstimateContact = async (
    credentials: GHLCredentials,
    contactId: string,
    fullAddress: string,
    reportId: string,
    goodPrice: string,
    betterPrice: string,
    bestPrice: string,
    termsAndConditions: string,
    frontImgUrl: string,
    triggerApproval: boolean = false,
    goodTitle: string = "",
    goodDescription: string = "",
    goodItems: string = "",
    betterTitle: string = "",
    betterDescription: string = "",
    betterItems: string = "",
    bestTitle: string = "",
    bestDescription: string = "",
    bestItems: string = "",
    goodProductDetails: string = "",
    betterProductDetails: string = "",
    bestProductDetails: string = "",
    introduction: string = "",
    reportType: string = "",
): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
            method: "PUT",
            headers: getHeaders(credentials),
            body: JSON.stringify({
                customFields: [
                    {
                        key: "full_address",
                        field_value: fullAddress,
                    },
                    {
                        key: "estimate_report_id",
                        field_value: reportId,
                    },
                    {
                        key: "good_offer_pricing",
                        field_value: goodPrice,
                    },
                    {
                        key: "better_offer_pricing",
                        field_value: betterPrice,
                    },
                    {
                        key: "best_offer_pricing",
                        field_value: bestPrice,
                    },
                    {
                        key: "estimate__terms_and_conditions",
                        field_value: termsAndConditions,
                    },
                    {
                        key: "front_of_the_house_picture_url",
                        field_value: frontImgUrl,
                    },
                    {
                        key: "good_title",
                        field_value: goodTitle
                    },
                    {
                        key: "good_description",
                        field_value: goodDescription
                    },
                    {
                        key: "good_items",
                        field_value: goodItems
                    },
                    {
                        key: "better_title",
                        field_value: betterTitle
                    },
                    {
                        key: "better_description",
                        field_value: betterDescription
                    },
                    {
                        key: "better_items",
                        field_value: betterItems
                    },
                    {
                        key: "best_title",
                        field_value: bestTitle
                    },
                    {
                        key: "best_description",
                        field_value: bestDescription
                    },
                    {
                        key: "best_items",
                        field_value: bestItems
                    },
                    {
                        key: "good_tab_product_details",
                        field_value: goodProductDetails
                    },
                    {
                        key: "better_tab_product_details",
                        field_value: betterProductDetails
                    },
                    {
                        key: "best_tab_product_details",
                        field_value: bestProductDetails
                    },
                    {
                        key: "introduction",
                        field_value: introduction,
                    },
                    {
                        key: "report_type",
                        field_value: reportType,
                    },
                    ...(triggerApproval
                        ? [{ key: "estimate_approve_trigger", field_value: "Yes" }]
                        : []),
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `Failed to update contact: ${errorData.message || response.statusText}`
            );
        }
    } catch (error) {
        console.error("Error updating contact with estimate & trigger:", error);
        throw error;
    }
};