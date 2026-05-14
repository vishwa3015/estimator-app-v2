import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { calculateTabTotals } from "@/utils/quoteCalculations";
import { useEstimateData } from "@/hooks/use-estimate-data";
import { fetchCompanyLogo } from "./QuoteTemplate";
import { fileUploadService } from "@/services/estimates/file-upload-service";
import { productService, Product, ProductCategory } from "@/services/products/product-service";
import { formatDate } from "../Jobs";
import { formatPrice } from "@/utils/currency";
import { FormValues, LocationDetails, SectionConfig } from "@/types/estimate-items";
import { GHLContact } from "@/types/ghl";
import {
    TitleSectionValues,
    IntroSectionValues,
    GallerySectionValues,
    QuoteSectionValues,
    AuthSectionValues,
    WarrantySectionValues,
    TermsSectionValues,
    CustomSectionValues,
    TabSectionEntry,
    TabData,
    SectionItem,
} from "@/types/template";

const LOGO_SIZE_PX = 160;
const PROGRESS_BAR_WIDTH = "35%";
const PROGRESS_BAR_HEIGHT_PX = 7;

const QUOTE_SECTION_ID = 6;
const AUTH_SECTION_ID = 7;
const FINANCING_LOGO_URL = "https://recyzzdwtqephssgkepb.supabase.co/storage/v1/object/public/assets/auth_image.png";

type AnySectionValues =
    | TitleSectionValues
    | IntroSectionValues
    | GallerySectionValues
    | QuoteSectionValues
    | AuthSectionValues
    | WarrantySectionValues
    | TermsSectionValues
    | CustomSectionValues;


interface HiredGunCustomTemplateProps {
    formValues: FormValues;
    sectionUpdates: SectionConfig[];
    locDetails: LocationDetails;
    contact: GHLContact | null;
    locationId: string;
}
export function HiredGunCustomTemplate({
    formValues,
    sectionUpdates,
    locDetails,
    contact,
    locationId,
}: HiredGunCustomTemplateProps) {
    const { opportunity } = useEstimateData(contact);
    const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);

    useEffect(() => {
        let cancelled = false;
        const fetchLogo = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.id && !cancelled) {
                const logoUrl = await fetchCompanyLogo(user.id);
                if (!cancelled) 
                setCompanyLogoUrl(logoUrl || null);
             }
            } catch (err) {
                console.error("HiredGunCustomTemplate: logo fetch failed", err);
            }
        };
        fetchLogo();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const fetchCatalogData = async () => {
            try {
                const [productsList, categoriesList] = await Promise.all([
                    productService.getProducts(),
                    productService.getCategories(),
                ]);
            if (!cancelled) {
                setProducts(productsList);
                setCategories(categoriesList);
            }
            } catch (error) {
                console.error("CustomTemplate: failed to load catalog data", error);
            }
        };
        fetchCatalogData();
        return () => { cancelled = true; };
    }, []);


    const getCategoryName = useCallback(
    (item: SectionItem): string | null => {
        if (!item) return null;
        const catalogProductId = item.catalog_product_id;
        if (catalogProductId) {
            const product = products.find((p) => p.id === catalogProductId);
            if (product?.category_id) {
                const category = categories.find((c) => c.id === product.category_id);
                return category?.name ?? null;
            }
            return null;
        }
        const itemName = (item.text || "").trim().toLowerCase();
        if (!itemName) return null;
        const matchedProduct = products.find(
            (p) => (p.name || "").trim().toLowerCase() === itemName
        );
        if (matchedProduct?.category_id) {
            const category = categories.find((c) => c.id === matchedProduct.category_id);
            return category?.name ?? null;
        }
        return null;
        },
        [products, categories],
    );

      const tabTotals = useMemo(
        () => calculateTabTotals(sectionUpdates, formValues),
        [sectionUpdates, formValues],
    );

    const titleSection = formValues?.[1] || {};

    const companyName = useMemo(
        () =>
        titleSection?.company_name ||
        locDetails?.business?.name ||
        locDetails?.name ||
        "",
        [titleSection, locDetails],
    );

    const companyAddress = useMemo(
        () =>
       [
        titleSection?.address || locDetails?.business?.address || locDetails?.address || "",
        titleSection?.city || locDetails?.business?.city || locDetails?.city || "",
        titleSection?.state || locDetails?.business?.state || locDetails?.state || "",
        titleSection?.zip_code || locDetails?.business?.postalCode || locDetails?.postalCode || "",
        ]
        .filter(Boolean)
        .join(", "),
        [titleSection, locDetails],
    );

    const renderProgressBar = () => (
        <div className="w-full mb-4">
            <div className="w-full h-[1px] bg-gray-200" />
            <div
                className="bg-[#1063a0]"
                style={{ width: PROGRESS_BAR_WIDTH, height: `${PROGRESS_BAR_HEIGHT_PX}px` }}
            />
        </div>
    );

    const renderFooter = useCallback(() => (
        <div className="flex justify-between items-end mt-auto pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-900 leading-5">
                {opportunity?.contactName && (
                    <p className="font-bold text-gray-900">{opportunity.contactName}</p>
                )}
                {companyName && (
                    <p className="font-bold text-gray-900">{companyName}</p>
                )}
                {companyAddress && <p className="font-bold text-gray-900">{companyAddress}</p>}
                {(locDetails?.business?.phone || locDetails?.phone) && (
                    <p className="font-bold text-gray-900">{locDetails?.business?.phone || locDetails?.phone}</p>
                )}
                {(locDetails?.business?.email || locDetails?.email) && (
                    <p className="font-bold text-gray-900">{locDetails?.business?.email || locDetails?.email}</p>
                )}
            </div>
            {companyLogoUrl && (
                <img src={companyLogoUrl} alt="logo" className="h-20 object-contain"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                    />
            )}
        </div>
        ),
        [opportunity, companyName, companyAddress, locDetails, companyLogoUrl],
    );


    const pageWrap = (
        id: string,
        title: string,
        children: React.ReactNode,
        isFirst = false
    ) => (
        <div
            id={id}
            className="bg-white text-gray-800 py-6"
            style={isFirst ? {} : {}}
        >
            <h2 className="text-3xl font-bold text-red-800 mb-8 uppercase">{title}</h2>
            {children}
            {/* {renderFooter()} */}
        </div>
    );


    const sectionWisePages: Record<
        string | number,
        (values: AnySectionValues, section: SectionConfig) => React.ReactNode
    > = {

        1: (values: TitleSectionValues, section: SectionConfig) => (

            <div
                id={`pdfPreview-${section.id}`}
                className="bg-white text-gray-800 title-page flex-1"
            >
                <div className="flex justify-between items-center mt-auto pt-6 p-6">
                    <div>
                        {companyLogoUrl && (
                            <img src={companyLogoUrl} alt="logo"
                                style={{ height: LOGO_SIZE_PX, width: LOGO_SIZE_PX }}
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                            />
                        )}
                    </div>
                    <div>
                        {values?.certification?.file_storage_path && (
                            <img
                                style={{ height: LOGO_SIZE_PX, width: LOGO_SIZE_PX }}
                                src={fileUploadService.getFileUrl(
                                    values?.certification?.file_storage_path
                                )}
                                alt="product-img"
                            />
                        )}
                    </div>
                </div>
            <div className="mt-4">
                        {values?.primary_image?.file_storage_path && (
                            <img
                                src={fileUploadService.getFileUrl(
                                    values?.primary_image?.file_storage_path
                                )}
                                alt="product-img"
                            />
                        )}
                    </div>
                <div className="flex gap-2 mt-8 ">
                    <div className="border-r-4 border-black w-full">
                        <div className="text-2xl font-medium">{values?.report_type}</div>
                        <div className="mt-2 text-sm"> {new Date(values?.date || Date.now()).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })}</div>
                    </div>
                    <div className=" w-full pl-4">
                        <p className="text-xl font-medium ">
                            <div>{values?.first_name} {values?.last_name}</div>
                        </p>
                        <p className="text-sm font-medium mt-2">
                            {values?.address}
                        </p>
                        <p className="text-sm font-medium ">
                            {values?.city}, {values?.state}
                        </p>
                        <p className="text-sm font-medium ">
                            {values?.zip_code}
                        </p>
                    </div>
                </div>

                <div className="mt-[60px]">
                    <div className="h-[6px] w-[40px] bg-black"></div>
                    <div className="mt-4">
                        {companyName && <p className="font-bold">{companyName}</p>}
                        {(locDetails?.business?.email || locDetails?.email) && (
                            <p className="font-bold">
                                {locDetails?.business?.email || locDetails?.email}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        ),

        2: (values: IntroSectionValues, section: SectionConfig) => {
            const htmlContent = values?.introduction || "";
            if (!htmlContent) return null;

            return (
                <div
                    id={`pdfPreview-${section.id}`}
                    className="introduction-page bg-white text-gray-800 "
                >
                    <h2 className="text-3xl font-bold mb-6 text-red-800 uppercase">
                        {section.title}
                    </h2>

                    <p className="mb-2">
                        Hi, {opportunity?.contactName}
                    </p>

                    <div
                        className="text-sm text-gray-700 leading-6"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
                    />

                    <div className="mt-6 text-sm">
                        <div>{locDetails?.business?.email || locDetails?.email}</div>
                        <div>{locDetails?.business?.phone || locDetails?.phone}</div>
                    </div>
                </div>
            );
        },

        custom: (values: CustomSectionValues, section: SectionConfig) => {
            if (values?.content_type === "single_use_pdf" && values?.file_storage_path) {
                const pdfUrl = fileUploadService.getFileUrl(values.file_storage_path);
                return (
                    <div
                        id={`pdfPreview-${section.id}`}
                        className="bg-white text-gray-800"
                        style={{ pageBreakBefore: "always", marginTop: "32px" }}
                    >
                        <iframe
                            src={pdfUrl}
                            className="w-full"
                            style={{ minHeight: "1100px", border: "none" }}
                            title={section.title}
                        />
                    </div>
                );
            }

            if (!values?.textHtml) {
                return null;
            }

            return pageWrap(
                `pdfPreview-${section.id}`,
                section.title,
                <div
                    className="text-sm text-gray-700 leading-6 mb-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(values.textHtml) }}
                />
            );
        },
        5: (values: GallerySectionValues, section: SectionConfig) => (
            <div
                id={`pdfPreview-${section.id}`}
                className="bg-white text-gray-800  space-y-10 introduction-page inspection-page"
            >
                 <h2 className="text-3xl font-bold mb-6 text-red-800 uppercase">
                        {section.title}
                </h2>

                {Object.keys(values?.arrays?.sections || {}).map((secId) => {
                    const sec = values.arrays.sections[secId];

                    return (
                        <div key={secId}>
                            {sec.section_title && (
                                <h3 className="text-xl font-bold text-red-800 mb-6 uppercase tracking-wide">
                                    {sec.section_title}
                                </h3>
                            )}

                            <div className="flex flex-wrap gap-6">
                                {Object.keys(sec.inputs || {}).map((inp) => {
                                    const input = sec.inputs[inp];

                                    return (
                                        <div key={inp} className="w-[48%] flex flex-col">

                                            {/* Image */}
                                            <div className="w-full min-h-[320px] flex items-center justify-center rounded-lg overflow-hidden">
                                                {input?.image?.file_storage_path ? (
                                                    <img
                                                        src={fileUploadService.getFileUrl(
                                                            input.image.file_storage_path
                                                        )}
                                                        className="w-full h-auto max-h-[320px] object-contain"
                                                        alt=""
                                                    />
                                                ) : (
                                                    <div className="text-gray-300 text-sm">
                                                        No Image
                                                    </div>
                                                )}
                                            </div>

                                            {/* Text */}
                                            <div
                                                className="mt-5 text-sm text-gray-700 leading-relaxed"
                                                dangerouslySetInnerHTML={{
                                                    __html: sanitizeHtml(input?.text || ""),
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        ),

        [QUOTE_SECTION_ID]: (values: QuoteSectionValues, section: SectionConfig) => {
            const tabs = section?.tabs || [];

            return (
                <>
                    {tabs.map((tab, tabIndex) => {
                        const tabId = tab.id;
                        const tabData = values?.tabs?.[tabId];
                        if (!tabData) return null;

                        const sections = tabData?.arrays?.sections || {};
                        const sortedSections = Object.entries(sections).sort(
                            ([, a], [, b]) => (a.sortOrder || 0) - (b.sortOrder || 0)
                        );

                        const tabTotal = formatPrice(
                            tabTotals.find((t) => t.tabId === tabId)?.total || 0
                        );

                        return (
                            <div
                                key={tabId}
                                id={`pdfPreview-tab-${tabId}`}
                                className="bg-white text-gray-800"
                                data-location-id={locationId}
                            >
                                {/* Header */}
                                <h2 className="text-3xl font-bold text-red-800 mb-4 uppercase">
                                    {tab.title}
                                </h2>

                                {/* Description */}
                                {tabData?.description && (
                                    <div
                                        className="text-[12px] text-gray-700 font-semibold mb-3"
                                        dangerouslySetInnerHTML={{
                                            __html: sanitizeHtml(tabData.description),
                                        }}
                                    />
                                )}

                                <div className="border-t-2 border-gray-300 mb-4"></div>

                                {/* Flatten ALL items */}
                                {(() => {
                                    const allItems = sortedSections.flatMap(([_, sec]) =>
                                        Object.entries(sec.items || {}).filter(
                                            ([, item]) =>
                                                item.quantity && Number(item.quantity) > 0
                                        )
                                    );

                                    return (
                                        <div className="">
                                            {allItems.map(([itemId, item], index) => {
                                                const itemDescription = item.description || "";

                                                return (
                                                    <div
                                                        key={itemId}
                                                        className={`px-3 py-2 ${index % 2 === 0 ? "bg-[#BFC9D166]" : "bg-gray-50"
                                                            }`}
                                                    >
                                                        {/* Title */}
                                                        <p className="text-sm font-bold text-gray-800">
                                                            {item.text}
                                                        </p>

                                                        {/* Subtitle / Description */}
                                                        {itemDescription && (
                                                            <p className="text-[11px] text-gray-600 leading-4">
                                                                {itemDescription.replace(/<[^>]+>/g, "")}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

                                {/* Subtotal */}
                                <div className="pt-2">
                                    <div className="flex items-center justify-end mt-6 pt-6 pr-2 gap-3">
                                        <span className="text-[16px] font-bold text-gray-800">
                                            Estimate subtotal:
                                        </span>
                                        <span className="text-sm text-gray-900">
                                            {formatPrice(tabTotal)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-end mt-2 pr-2 gap-3">
                                        <span className="text-[16px] font-bold text-gray-800">
                                            Total:
                                        </span>
                                        <span className="text-sm text-gray-900">
                                            {formatPrice(tabTotal)}
                                        </span>
                                    </div>
                                    <div className="flex ml-auto justify-end border border-gray-300 w-fit mt-8 pr-6">
                                        <div className="border-r border-gray-300">
                                            <img
                                                src={FINANCING_LOGO_URL}
                                                alt="financing logo"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                                }}
                                            />             
                                        </div>
                                        <div className="flex justify-center items-center px-6 flex-col">
                                            <p className="text-sm text-gray-900 font-bold">est.</p>
                                            <p className="text-2xl text-gray-900 font-bold">${(Number(tabTotal) / 12).toFixed(2)}<span className="text-sm">/month</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        );
                    })}
                </>
            );
        },

        [AUTH_SECTION_ID]: (values: AuthSectionValues, _section: SectionConfig) => (
            <div
                id="pdfPreview-auth"
                className="bg-white text-gray-800 p-8"
                style={{}}
            >
                {/* {renderProgressBar()} */}

                <h2 className="text-3xl font-bold text-red-800 mb-8 uppercase">AUTHORIZATION PAGE</h2>


                {/* Tab totals */}
                <div className=" mt-8 flex gap-6">
                    <div className="w-full">
                        {tabTotals.map((twt, index) => {
                            const tabData = formValues?.[QUOTE_SECTION_ID]?.tabs?.[twt.tabId];
                            const description = tabData?.description || "";
                            return (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 pr-4">
                                                <p className="text-sm font-bold text-gray-800 mb-1">{twt.title}</p>
                                                {description && (
                                                    <p className="text-[11px] text-gray-500 font-semibold leading-5">
                                                        {description}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-sm text-gray-900 whitespace-nowrap">
                                                ${twt.total?.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="w-full">
                        <p className="font-semibold text-sm mb-1"><span className="font-bold">Name: </span>{opportunity?.contactName}</p>
                    </div>
                </div>
                {/* Disclaimer */}
                {values?.disclaimer && (
                    <div className="px-3 py-3 text-sm font-semibold bg-gray-100 mt-8">
                        {values.disclaimer}
                    </div>
                )}

                {/* Customer notes */}
                <div className="my-8">
                    <p className="text-base font-semibold text-gray-900 mb-2 w-[50%]">Customer notes</p>
                    <div className="w-full h-20 border border-gray-300 rounded bg-white" />
                </div>



                {/* Signature row — PDF uses pdf-lib authorization page; /DS_SIG/ and /DS_DATE/ are vector text for DocuSign */}
                <div className="flex justify-between items-end mt-10 mb-4 gap-60">
                    <div className="w-1/2">
                        <div className="border-b border-gray-400 mb-1 h-8" />
                        <p className="text-xs text-gray-500">Signature</p>
                    </div>
                    <div className="w-1/2">
                        <div className="border-b border-gray-400 mb-1 h-8" />
                        <p className="text-xs text-gray-500">Date</p>
                    </div>
                </div>

                {/* {values?.footer_notes && (
                    <p className="text-xs text-gray-700 mt-4">{values.footer_notes}</p>
                )} */}

            </div>
        ),

        8: (values: WarrantySectionValues, section: SectionConfig) =>
            pageWrap(
                `pdfPreview-${section.id}`,
                section.title,
                <div className="space-y-4 text-sm">
                    {opportunity?.contactName && (
                        <div>
                            <p className="font-semibold text-gray-700">Customer</p>
                            <p className="text-gray-600">{opportunity.contactName}</p>
                        </div>
                    )}
                    {values?.name && (
                        <div>
                            <p className="font-semibold text-gray-700">Name</p>
                            <p className="text-gray-600">{values.name}</p>
                        </div>
                    )}
                    {values?.date && (
                        <div>
                            <p className="font-semibold text-gray-700">Date Project Completed</p>
                            <p className="text-gray-600">{formatDate(values.date)}</p>
                        </div>
                    )}
                    {values?.description && (
                        <div>
                            <p className="font-semibold text-gray-700">Description</p>
                            <p className="text-gray-600">{values.description}</p>
                        </div>
                    )}
                </div>
            ),

        9: (values: TermsSectionValues, section: SectionConfig) =>
            pageWrap(
                `pdfPreview-${section.id}`,
                section.title,
                <div
                    className="text-sm text-gray-700 leading-6"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(values?.terms) }}
                />
            ),
    };

    return (
        <div id="pdfPreview" className="bg-white mx-auto">
            {sectionUpdates
                ?.filter((sec: SectionConfig) => sec.enabled)
                ?.sort((a: SectionConfig, b: SectionConfig) => a.sortOrder - b.sortOrder)
                ?.map((section: SectionConfig, index: number) => {
                    const values = formValues?.[section.id];

                    if (section.type === "custom") {
                        if (!values?.textHtml && values?.content_type !== "single_use_pdf") {
                            return null;
                        }

                        const isFirstSection = index === 0; // ← check if first

                        if (values?.content_type === "single_use_pdf" && values?.file_storage_path) {
                            const pdfUrl = fileUploadService.getFileUrl(values.file_storage_path);
                            return (
                                <React.Fragment key={section.id}>
                                    <div
                                        id={`pdfPreview-${section.id}`}
                                        className="bg-white text-gray-800"
                                        style={isFirstSection ? {} : { pageBreakBefore: "always", marginTop: "32px" }}  // ← added marginTop
                                    >
                                        <iframe
                                            src={pdfUrl}
                                            className="w-full"
                                            style={{ minHeight: "1100px", border: "none" }}
                                            title={section.title}
                                        />
                                    </div>
                                </React.Fragment>
                            );
                        }

                        return (
                            <React.Fragment key={section.id}>
                                {pageWrap(
                                    `pdfPreview-${section.id}`,
                                    section.title,
                                    <div
                                        className="text-sm text-gray-700 leading-6 mb-5"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(values.textHtml) }}
                                    />,
                                    isFirstSection
                                )}
                            </React.Fragment>
                        );
                    }

                    // Standard sections
                    const renderer = sectionWisePages[section.id];
                    if (!renderer) return null;

                    return (
                        <React.Fragment key={section.id}>
                            {renderer(values, section)}
                        </React.Fragment>
                    );
                })}
        </div>
    );
}