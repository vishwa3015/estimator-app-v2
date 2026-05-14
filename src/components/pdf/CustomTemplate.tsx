import React, { useEffect, useState } from "react";
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
import { AuthSectionValues, CustomSectionValues, GallerySectionValues, IntroSectionValues, QuoteSectionValues, SectionItem, TermsSectionValues, TitleSectionValues, WarrantySectionValues } from "@/types/template";
interface CustomTemplateProps {
  formValues: FormValues;
  sectionUpdates: SectionConfig[];
  locDetails: LocationDetails;
  contact: GHLContact | null;
  locationId: string;
}
type AnySectionValues =
  | TitleSectionValues
  | IntroSectionValues
  | GallerySectionValues
  | QuoteSectionValues
  | AuthSectionValues
  | WarrantySectionValues
  | TermsSectionValues
  | CustomSectionValues;

const QUOTE_SECTION_ID = 6;
const AUTH_SECTION_ID = 7;

export function CustomTemplate({
  formValues,
  sectionUpdates,
  locDetails,
  contact,
}: CustomTemplateProps) {
  const { opportunity } = useEstimateData(contact);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  useEffect(() => {
    const fetchLogo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const logoUrl = await fetchCompanyLogo(user.id);
        setCompanyLogoUrl(logoUrl || null);
      }
    };
    fetchLogo();
  }, []);

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
        console.error("CustomTemplate: failed to load catalog data", error);
      }
    };
    fetchCatalogData();
  }, []);

  const getCategoryName = (item: SectionItem): string | null => {
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
  };

  const tabTotals = calculateTabTotals(sectionUpdates, formValues);
  const titleSection = (formValues?.[1] ?? {}) as TitleSectionValues;

  const companyName =
    titleSection?.company_name ||
    locDetails?.business?.name ||
    locDetails?.name ||
    "";

  const companyAddress = [
    titleSection?.address || locDetails?.business?.address || locDetails?.address || "",
    titleSection?.city || locDetails?.business?.city || locDetails?.city || "",
    titleSection?.state || locDetails?.business?.state || locDetails?.state || "",
    titleSection?.zip_code || locDetails?.business?.postalCode || locDetails?.postalCode || "",
  ]
    .filter(Boolean)
    .join(", ");

  const renderProgressBar = () => (
    <div className="w-full mb-4">
      <div className="w-full h-[1px] bg-gray-200" />
      <div className="w-[35%] h-[7px] bg-[#1063a0]" />
    </div>
  );

  const renderFooter = () => (
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
        <img src={companyLogoUrl} alt="logo" className="h-20 object-contain" />
      )}
    </div>
  );


  const pageWrap = (
    id: string,
    title: string,
    children: React.ReactNode,
    isFirst = false
  ) => (
    <div
      id={id}
      className="bg-white text-gray-800 p-6"
      style={isFirst ? {} : {}}
    >
      {renderProgressBar()}
      <h2 className="text-lg font-bold text-gray-800 mb-4 uppercase">{title}</h2>
      <div className="border-t border-gray-200 mb-6" />
      {children}
      {renderFooter()}
    </div>
  );


  const sectionWisePages: Record<
    string | number,
    (values: AnySectionValues, section: SectionConfig) => React.ReactNode
  > = {

    1: (values: TitleSectionValues, section: SectionConfig) => (
      <div
        id={`pdfPreview-${section.id}`}
        className="bg-white text-gray-800"
      >
        <div className="flex justify-between items-center mt-auto pt-6 p-6">
          <div className="text-xs text-gray-900 leading-5">
            {companyName && <p className="font-bold">{companyName}</p>}
            {(locDetails?.business?.email || locDetails?.email) && (
              <p className="font-bold">
                {locDetails?.business?.email || locDetails?.email}
              </p>
            )}
          </div>
          {companyLogoUrl && (
            <img src={companyLogoUrl} alt="logo" className="h-20 w-[210px]" />
          )}

        </div>
        <div className="mt-24 flex justify-between items-end px-6">
          <div>
            <div>
              {new Date(values?.date || Date.now()).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <div>{values?.report_type}</div>
          </div>
          <div className="address">
            <p className="text-sm font-medium text-right">
              <div>{values?.first_name} {values?.last_name}</div>
              {values?.address}
            </p>
            <p className="text-sm font-medium text-right">
              {values?.city}, {values?.state}
            </p>
            <p className="text-sm font-medium text-right">
              {values?.zip_code}
            </p>
          </div>
        </div>
        <div className="border-t-[8px] border-t-[#1063a0] border-b-0 mt-5 mx-6"></div>
        <div className="product-image-part min-h-[500px] mt-[1px] px-6 ">
          {(values?.primary_image?.file_storage_path || values?.primary_image?._preview_url) && (
          <img
            className="w-full h-full object-cover object-center"
            src={
              values.primary_image.file_storage_path
                ? fileUploadService.getFileUrl(values.primary_image.file_storage_path)
                : values.primary_image._preview_url
            }
            alt="product-img"
          />
          )}
        </div>
      </div>
    ),

    2: (values: IntroSectionValues, section: SectionConfig) => {
      const htmlContent = values?.introduction || "";

      if (!htmlContent) return null;

      return pageWrap(
        `pdfPreview-${section.id}`,
        section.title,
        <div
          className="text-sm text-gray-700 leading-6"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
        />
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
    5: (values: GallerySectionValues, section: SectionConfig) =>

      pageWrap(
        `pdfPreview-${section.id}`,
        section.title,
        <div>
          {Object.keys(values?.arrays?.sections || {}).map((secId) => {
            const sec = values.arrays.sections[secId];

            const standardItems = Object.keys(sec.inputs || {}).map((inp) => {
              const input = sec.inputs[inp];
              return (
                <div key={inp} className="flex gap-4 mb-6">
                  <div className="w-1/2">
                    {input?.image?.file_storage_path && (
                      <img
                        src={fileUploadService.getFileUrl(input.image.file_storage_path)}
                        className="w-full rounded"
                        alt=""
                      />
                    )}
                  </div>
                  <div className="w-1/2">
                    <div
                      className="text-sm text-gray-700 leading-6"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(input.text) }}
                    />
                  </div>
                </div>
              );
            });

            if (sec.style === "side-by-side") {
              return (
                <div key={secId} className="flex flex-wrap gap-4">
                  {Object.keys(sec.inputs || {}).map((inp) => {
                    const input = sec.inputs[inp];
                    return (
                      <div key={inp} className="w-[48%] flex flex-col items-center">
                        <div className="w-full min-h-[300px] flex justify-center items-center">
                          {input?.image?.file_storage_path && (
                            <img
                              src={fileUploadService.getFileUrl(input.image.file_storage_path)}
                              className="w-full h-auto rounded"
                              alt=""
                            />
                          )}
                        </div>
                        <div
                          className="text-sm text-gray-700 mt-4 leading-6"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(input.text) }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            }

            return <div key={secId}>{standardItems}</div>;
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
                className="bg-white text-gray-800 p-6"
                style={tabIndex === 0 ? {} : {}}
              >
                {/* Progress bar */}
                {renderProgressBar()}

                {/* Header */}
                <h2 className="text-lg font-bold text-gray-800 mb-4">{tab.title}</h2>

                {tabData?.description && (
                  <div
                    className="text-xs text-gray-600 font-bold leading-5 mb-6"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(tabData.description) }}
                  />
                )}

                <div className="border-t-2 border-gray-300 mb-4"></div>

                {/* Static Scope of Work */}
                <div className="mb-2 ">
                    <span className="text-xs font-bold text-[#6B7280]">Items:</span>
                </div>

                {/* Dynamic product sections */}
                {sortedSections.map(([sectionId, sec]) => {
                  const items = Object.entries(sec.items || {}).filter(
                    ([, item]) => item.quantity && Number(item.quantity) > 0
                  );
                  if (items.length === 0) return null;
                  return (
                    <div key={sectionId} className="mb-6">
                      {sec.section_title && (
                        <h3 className="text-[13px] font-bold text-gray-900 mb-2 pt-3">
                          {sec.section_title}
                        </h3>
                      )}
                      <div className="space-y-3">
                        {items.map(([itemId, item]) => {
                          const categoryName = getCategoryName(item);
                          const itemDescription = (item.description || "");
                          return (
                            <div key={itemId}>
                              <p className="text-sm font-medium text-gray-800">- {item.text}</p>
                              {categoryName ? (
                                <p className="text-[11px] font-bold text-gray-900 mt-1 pl-[10px]">{categoryName}</p>
                              ) : itemDescription ? <div dangerouslySetInnerHTML={{ __html: itemDescription }} /> : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Subtotal */}
                <div className="flex items-center justify-between border-t border-gray-300 mt-4 py-[35px]">
                  <span className="text-[17px] font-bold text-[#374151]">Estimate subtotal:</span>
                  <span className="text-sm font-bold  text-gray-900">{tabTotal}</span>
                </div>

                {/* Footer pinned to bottom */}
                {renderFooter()}
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
        style={{  }}
      >
        {renderProgressBar()}

        <h2 className="text-xl font-bold text-gray-800 mb-1">Summary</h2>
        <p className="text-xs text-gray-500 mb-6">
          Please select one or more options from this proposal and sign it with any notes
        </p>

        {/* Tab totals */}
        <div className="space-y-6 mb-8">
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
                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                      {formatPrice(twt.total)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        {values?.disclaimer && (
          <div className="px-3 py-3 text-sm font-semibold bg-gray-100 text-center mb-6">
            {values.disclaimer}
          </div>
        )}

        {/* Customer notes */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-600 mb-2">Customer notes</p>
          <div className="w-full h-20 border border-gray-300 rounded bg-white" />
        </div>

        {/* Signature row — PDF uses pdf-lib authorization page; /DS_SIG/ and /DS_DATE/ are vector text for DocuSign */}
        <div className="flex justify-between items-end mt-10 mb-4 gap-60">
          <div className="w-1/2">
            <p className="font-semibold text-sm mb-1">{opportunity?.contactName}</p>
            <div className="border-b border-gray-400 mb-1 h-8" />
            <p className="text-xs text-gray-500">Signature</p>
          </div>
          <div className="w-1/2">
            <div className="border-b border-gray-400 mb-1 h-8" />
            <p className="text-xs text-gray-500">Date</p>
          </div>
        </div>

        {values?.footer_notes && (
          <p className="text-xs text-gray-700 mt-4">{values.footer_notes}</p>
        )}

        {renderFooter()}
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
    <div id="pdfPreview" className="bg-white max-w-3xl mx-auto">
      {sectionUpdates
        ?.filter((sec: SectionConfig) => sec.enabled)
        ?.sort((a: SectionConfig, b: SectionConfig) => a.sortOrder - b.sortOrder)
        ?.map((section: SectionConfig, index: number) => {
          const values = formValues?.[section.id] as AnySectionValues | undefined;

          if (section.type === "custom") {
            const v = values as CustomSectionValues | undefined;
            if (!v?.textHtml && v?.content_type !== "single_use_pdf") return null;
            const isFirstSection = index === 0;

            if (v?.content_type === "single_use_pdf" && v?.file_storage_path) {
              const pdfUrl = fileUploadService.getFileUrl(v.file_storage_path);
              return (
                <React.Fragment key={section.id}>
                  <div
                    id={`pdfPreview-${section.id}`}
                    className="bg-white text-gray-800"
                    style={isFirstSection ? {} : { pageBreakBefore: "always", marginTop: "32px" }}
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
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(v?.textHtml ?? "") }}
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
              {renderer(values as AnySectionValues, section)}
            </React.Fragment>
          );
        })}
    </div>
  );
}