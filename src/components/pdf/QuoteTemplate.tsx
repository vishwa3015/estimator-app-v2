import { useEstimateData } from "@/hooks/use-estimate-data";
import { formatDate } from "../Jobs";
import { fileUploadService } from "@/services/estimates/file-upload-service";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import React, { Fragment, useEffect, useState, useMemo, useRef } from "react";
import { PRODUCT_DATA } from "@/configs/productData";
import { calculateTabTotals } from "@/utils/quoteCalculations";
import { supabase } from "@/integrations/supabase/client";
import { productService, Product } from "@/services/products/product-service";
import { getTemplateComponent, isRendererKeyRegistered } from "@/Templateregistry";
import { formatPrice } from "@/utils/currency";
import { FormValues, LocationDetails, SectionConfig } from "@/types/estimate-items";
import { GHLContact } from "@/types/ghl";
import { SectionItem, TabFormValues } from "@/types/template";
import { TabSection } from "@/types/product";


export const HIRED_GUNS_LOCATIONID = 'BtXqbQPZbhEgvUraOQcJ'


export const fetchCompanyLogo = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('company_logo_url')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching company logo:', error);
    return null;
  }

  return data?.company_logo_url || null;
};

function getTabProducts(
  tabId: string,
  allProducts: Product[],
  tabFormValues: TabFormValues | null | undefined
): Product[] {
  const activeProductNames = new Set<string>();
  const sections = tabFormValues?.arrays?.sections || {};
  Object.values(sections).forEach((sec: { items?: Record<string, { quantity?: number; text?: string }> }) => {
    Object.values(sec?.items || {}).forEach((item: { quantity?: number; text?: string }) => {
      const qty = Number(item?.quantity ?? 0);
      if (qty > 0 && item?.text) {
        activeProductNames.add(item.text.trim().toLowerCase());
      }
    });
  });

  const tabProducts = allProducts.filter(
    (p) => Array.isArray(p.tab) && p.tab.includes(tabId)
  );

  if (activeProductNames.size === 0) {
    return tabProducts;
  }

  const matched = tabProducts.filter((p) =>
    activeProductNames.has(p.name.trim().toLowerCase())
  );

  return matched.length > 0 ? matched : tabProducts;
}

function getProductTabDetail(product: Product, tabId: string): { title: string; description: string } | null {
  if (!product.tab_product_details || typeof product.tab_product_details !== 'object') return null;
  const detail = product.tab_product_details[tabId];
  if (!detail || typeof detail !== 'object') return null;
  if (!detail.title && !detail.description) return null;
  return detail;
}

let cachedProducts: Product[] | null = null;

export const clearProductCache = () => { cachedProducts = null; };

interface QuotationTemplateProps {
  formValues: FormValues;
  sectionUpdates: SectionConfig[];
  locDetails: LocationDetails;
  contact: GHLContact | null;
  locationId: string;
  rendererKey?: string | null;
}

export default function QuotationTemplate({
  formValues,
  sectionUpdates,
  locDetails,
  contact,
  locationId,
  rendererKey: rendererKeyProp,
}: QuotationTemplateProps) {
  const { opportunity } = useEstimateData(contact);
  const pageBreak = <div style={{ pageBreakBefore: "always" }}></div>;

  const tabWiseTotals = calculateTabTotals(sectionUpdates, formValues);
  const THEME_PRIMARY_COLOR = "#e63946"

  const [companyLogoUrl, setCompanyLogoUrl] = React.useState<string | null>(null);
  const [resolvedRendererKey, setResolvedRendererKey] = React.useState<string | null>(
    rendererKeyProp === undefined ? null : (rendererKeyProp ?? "standard")
  );
  const [templateLoading, setTemplateLoading] = React.useState<boolean>(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productsError, setProductsError] = React.useState<string | null>(null);
  const warnedKeys = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user?.id) {
        setTemplateLoading(false);

        return;
      }

      const logoUrl = await fetchCompanyLogo(user.id);
        if (cancelled) return;

      setCompanyLogoUrl(
        logoUrl || 'https://msgsndr-private.storage.googleapis.com/companyPhotos/60946cdd-aaf9-4805-b736-d24093a8a38f.PNG'
      );

      setResolvedRendererKey(rendererKeyProp ?? "standard");

      if (!productsLoaded) {
        try {
            const products = cachedProducts ?? await productService.getProducts();
            if (cancelled) return;
            cachedProducts = products;
            setAllProducts(products);
            setProductsLoaded(true);
            setProductsError(null);
          } catch (err) {
            if (cancelled) return;
            console.error("[QuotationTemplate] Failed to fetch products:", err);
            setProductsError("Failed to load product details");
            setAllProducts([]);
            setProductsLoaded(true);
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[QuotationTemplate] Initialization error:", err);
        setProductsError("Initialization failed");
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }

      setTemplateLoading(false);
    };

    init();
    return () => { cancelled = true; };
  }, [rendererKeyProp, locationId]);

  // Warn in dev if renderer_key is not registered
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      resolvedRendererKey &&
      !isRendererKeyRegistered(resolvedRendererKey) &&
      !warnedKeys.current.has(resolvedRendererKey)
    ) {
      warnedKeys.current.add(resolvedRendererKey);
      console.warn(
        `[QuotationTemplate] renderer_key "${resolvedRendererKey}" is not registered in TEMPLATE_REGISTRY. Falling back to 'standard'.`
      );
    }
  }, [resolvedRendererKey]);

  const sectionWisePages = useMemo(() => ({
    1: (values, section) => (
      <div id={`pdfPreview-${section.id}`} className="h-[90vh] flex p-2">
        <div className="first-page flex flex-col justify-between flex-[1]">
          <div className="flex justify-between items-center">
            <div className="left-logo-part">
              {companyLogoUrl && (
                <img
                  src={companyLogoUrl}
                  className="max-w-[200px]"
                  alt="Company Logo"
                />
              )}
            </div>
            <div className="right-text-part">
              <div className="right-part">
                <h6 className="font-semibold text-gray-500 text-right">
                  {values?.company_name}
                </h6>
                <div className="address">
                  <p className="text-sm font-medium text-right">
                    {values?.address}
                  </p>
                  <p className="text-sm font-medium text-right">
                    {values?.city}, {values?.state}
                  </p>
                  <p className="text-sm font-medium text-right">
                    {values?.zip_code}
                  </p>
                </div>
                {/* <div className="mail-phone ">
                  <p className="text-sm font-medium text-right">
                    {locDetails?.business?.email || locDetails?.email}
                  </p>
                  <p className="text-sm font-medium text-right">
                    {locDetails?.business?.phone || locDetails?.phone}
                  </p>
                </div> */}
              </div>
            </div>
          </div>
          <div className="product-image-part mt-5 min-h-[250px]">
            {values?.primary_image?.file_storage_path && (
              <img
                className="w-[400px] h-[400px] object-cover object-center m-auto border-4 border-red-500"
                src={
                  values.primary_image.file_storage_path
                    ? fileUploadService.getFileUrl(values.primary_image.file_storage_path)
                    : values.primary_image._preview_url
                }
                alt="product-img"
              />
            )}
            <h6 className="text-lg text-gray-500 text-center font-semibold mt-4">Estimate Prepared for:</h6>
            <p className="text-lg text-gray-700 text-center font-semibold">{contact?.firstName} {contact?.lastName}</p>
          </div>
          <div className="bottom-information mt-3 flex justify-center items-center">
            <div className="bottom-text-part">
              <p className="text-xs italic font-medium text-center">**THIS QUOTE IS VALID FOR 30 DAYS **</p>
              {values?.date && (
                <p className="text-sm font-medium text-gray-600 mt-1 text-center">Report Generated: {formatDate(values?.date)}</p>
              )}
              {opportunity?.id && (
                <p className="text-sm font-semibold text-gray-500 mt-1 uppercase text-center">REPORT ID: {opportunity.id}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    [`1-old`]: (values, section) => (
      <div id={`pdfPreview-${section.id}`} className="h-[85vh] flex p-2">
        <div className="first-page flex flex-col justify-between flex-[1]">
          <div className="flex justify-between items-center">
            <div className="left-text-part">
              {values?.report_type && (
                <p className="text-sm font-semibold">{values?.report_type}</p>
              )}
              {values?.date && (
                <p className="text-sm font-semibold">
                  {formatDate(values?.date)}
                </p>
              )}
            </div>
            <div className="right-logo-part">
              {values?.certification?.file_storage_path && (
                <img
                  className="w-[200px]"
                  src={fileUploadService.getFileUrl(
                    values?.certification?.file_storage_path
                  )}
                  alt="left-logo"
                />
              )}
            </div>
          </div>
          <div className="product-image-part mt-5 min-h-[250px]">
            {values?.primary_image?.file_storage_path && (
              <img
                className="rounded-full max-w-[350px] max-h-[350px] m-auto border-8 border-indigo-600"
                src={fileUploadService.getFileUrl(
                  values?.primary_image?.file_storage_path
                )}
                alt="product-img"
              />
            )}
          </div>
          <div className="bottom-information mt-3 flex justify-between items-center">
            <div className="left-part">
              <h6 className="font-semibold">
                {locDetails?.business?.name || locDetails?.name}
              </h6>
              <div className="h-[4px] w-[40px] bg-indigo-600 my-4"></div>
              <div className="address">
                <p className="text-sm font-medium text-gray-600">
                  {locDetails?.business?.address || locDetails?.address}
                </p>
                <p className="text-sm font-medium text-gray-600">
                  {locDetails?.business?.state || locDetails?.state}{" "}
                  {locDetails?.business?.city || locDetails?.city}{" "}
                  {locDetails?.business?.postalCode || locDetails?.postalCode}
                </p>
              </div>
              <div className="mail-phone mt-4">
                <p className="text-sm font-medium text-gray-600">
                  {locDetails?.business?.email || locDetails?.email}
                </p>
                <p className="text-sm font-medium text-gray-600">
                  {locDetails?.business?.phone || locDetails?.phone}
                </p>
              </div>
            </div>
            <div className="right-part text-right mr-8">
              <div className="company">
                {values?.certification?.file_storage_path && (
                  <img
                    className="w-[100px] justify-self-end"
                    src={fileUploadService.getFileUrl(
                      values?.certification?.file_storage_path
                    )}
                    alt="left-logo"
                  />
                )}
                <h4 className="my-3 text-lg font-bold uppercase">
                  {values?.company_name}
                </h4>
                <p className="text-sm font-semibold mb-1">{values?.address}</p>
                <p className="text-sm font-semibold mb-1">
                  {values?.city}, {values?.state}
                </p>
                <p className="text-sm font-semibold">{values?.zip_code}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    2: (values, section) => (
      <>
        <div id={`pdfPreview-${section.id}`} className="intoduction-page mt-5 p-2">
          <div className="title-bg w-full mt-10 px-2 py-1" style={{ backgroundColor: THEME_PRIMARY_COLOR }}>
            <h2 className="text-2xl font-bold uppercase text-white text-center">
              {section.title}
            </h2>
          </div>
          <div className="mt-[60px]">
            <div
              className="terms&condition-page mt-10"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(values?.introduction) }}
            ></div>
          </div>
        </div>
      </>
    ),
    5: (values, section) => (
      <>
        <div id={`pdfPreview-${section.id}`} className="intoduction-page mt-5 p-2">
          <div className="title-bg w-full mt-10 px-2 py-1" style={{ backgroundColor: THEME_PRIMARY_COLOR }}>
            <h2 className="text-2xl font-bold uppercase text-white text-center">
              {section.title}
            </h2>
          </div>
          <div className="part-1 mt-10">
            {Object.keys(values?.arrays?.sections || {}).map((sectionId) => {
              const sec = values?.arrays?.sections?.[sectionId];

              const standard = Object.keys(sec.inputs || {}).map((inp) => {
                const input = sec.inputs[inp];
                return (
                  <div className="flex gap-[2%]">
                    <div className="image-part w-[49%]">
                      {input?.image?.file_storage_path && (
                        <img
                          src={fileUploadService.getFileUrl(
                            input?.image?.file_storage_path
                          )}
                        />
                      )}
                    </div>
                    <div className="text-part w-[49%]">
                      <div
                        className="font-serif text-700 mb-5"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(input.text) }}
                      ></div>
                    </div>
                  </div>
                );
              });

              switch (sec.style) {
                case "side-by-side":
                  return (
                    <div className="sec2-page" key={sectionId}>
                      <div className="part-1 mt-10">
                        <div className="flex gap-[2%] flex-wrap">
                          {Object.keys(sec.inputs || {}).map((inp) => {
                            const input = sec.inputs[inp];
                            return (
                              <div key={inp} className="part1 w-[48%] flex flex-col items-center text-start">
                                  <div className="image-part w-full min-h-[400px] flex justify-center items-center">
                                    {input?.image?.file_storage_path && (
                                      <img
                                        src={fileUploadService.getFileUrl(
                                          input?.image?.file_storage_path
                                        )}
                                      alt="demo"
                                        className="w-full h-auto rounded-lg"
                                      />
                                    )}
                                  </div>
                                  <div className="text-part mt-8">
                                    <div
                                      className="font-serif"
                                      dangerouslySetInnerHTML={{
                                        __html: sanitizeHtml(input.text),
                                      }}
                                    ></div>
                                  </div>
                                </div>
  
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                default:
                  return standard;
              }
            })}
          </div>
        </div>
      </>
    ),
    6: (values, section) => {
      return (
        <div id={`pdfPreview-${section.id}`}>
          {section.tabs.map((secTab, tabIndex) => {
            const tabId = secTab.id;
            const tab = values?.tabs?.[tabId];
            if (!tab) return null;

           const totalWithTax = formatPrice(tabWiseTotals.find(t => t.tabId === secTab.id)?.total || 0);

            if (tab.customPDF && tab.terms) {
              return (
                <div
                  key={`tab-${tabIndex}`}
                  className="p-2"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(tab.terms.replaceAll("{{total}}", totalWithTax)),
                  }}
                />
              );
            }


            const tier = PRODUCT_DATA[tabIndex] ?? PRODUCT_DATA[0];

            return (
              <Fragment key={`tab-${tabIndex}`}>
                {tabIndex !== 0 && pageBreak}

                <div className="px-2">
                  {/* Title */}
                  <div
                    className="title-bg w-full mt-10 px-2 py-1"
                    style={{ backgroundColor: THEME_PRIMARY_COLOR }}
                  >
                    <h2 className="text-2xl font-bold uppercase text-white text-center">
                      {secTab.title}
                    </h2>
                  </div>

                  {tab.description && (
                    <h2 className="mt-8 text-lg font-medium">{tab.description}</h2>
                  )}

                  {/* Two-column layout */}
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {/* Product Details */}
                    <div>
                      <h3 className="text-center text-lg font-semibold bg-slate-100 py-2 rounded-md mb-4">
                        Product Details
                      </h3>
                      <div className="bg-gray-50 p-6 rounded-lg space-y-2 h-[93%] text-[13px]">
                        {(() => {
                          // Collect all items with qty > 0 from all sections of this tab
                          const sections = tab?.arrays?.sections || {};
                          const activeItems: { text: string; description: string }[] = [];

                          Object.values(sections).forEach((sec: TabSection) => {
                            Object.values(sec?.items || {}).forEach((item: SectionItem) => {
                              const qty = Number(item?.quantity ?? 0);
                              if (qty > 0 && item?.text) {
                                activeItems.push({
                                  text: item.text.trim(),
                                  description: (item.description || "").trim(),
                                });
                              }
                            });
                          });

                          if (activeItems.length === 0) {
                            return <p className="text-gray-400 italic">No products with quantity added.</p>;
                          }

                          return activeItems.map((item, i) => (
                            <div key={i} className="mb-2">
                              <p className="font-semibold">{item.text}</p>
                              {item.description && (
                                <p className="text-gray-600 mt-0.5">{item.description}</p>
                              )}
                            </div>
                          ));
                        })()}
                      </div>

                      {/* {pageBreak} */}
                    </div>

                    {/* Workmanship */}
                    <div>
                      <h3 className="text-center text-lg font-semibold bg-slate-100 py-2 rounded-md mb-4">
                        Workmanship
                      </h3>

                      <div className="bg-gray-50 p-6 rounded-lg text-[13px] h-[93%]">
                        <ul className="list-disc list-inside ">
                          {(tier.workmanship ?? []).map((work, i) => (
                            <li key={i}>{work}</li>
                          ))}
                          {/* Add warranty at end */}
                          <li>Provide homeowner with {tier.warranty}.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="mt-10 grid grid-cols-2 gap-4 max-w-4xl mx-auto">
                    <div className="text-right text-xl font-semibold">Total Labor and Materials:</div>
                    <div className="text-xl font-semibold">{totalWithTax}</div>
                  </div>

                  <p className="mt-8 text-center text-sm uppercase font-medium text-gray-700">
                    ***MATERIAL PRICING SUBJECT TO CHANGE AND CAN AFFECT THE QUOTE PRICE LISTED ABOVE***
                  </p>
                </div>
              </Fragment>
            );
          })}
        </div>
      );
    },
    [`6_old`]: (values, section, section1Values) => (
      <div id={`pdfPreview-${section.id}`}>
        {
          section.tabs.map((secTab, tabIndex) => {
            const tabId = secTab.id;
            const tab = values?.tabs?.[tabId];
            const sectionIds = Object.keys(tab?.arrays?.sections || {});
            const items = sectionIds.flatMap((sectionId) =>
              Object.keys(tab.arrays.sections[sectionId].items || {}).map(
                (itemId) => ({
                  ...tab.arrays.sections[sectionId].items[itemId],
                  id: itemId,
                  sectionId,
                })
              )
            );
            const sections = sectionIds.map((sectionId) => ({
              section: tab.arrays.sections[sectionId],
              items: Object.keys(tab.arrays.sections[sectionId].items || {}).map(
                (itemId) => ({
                  ...tab.arrays.sections[sectionId].items[itemId],
                  id: itemId,
                  sectionId,
                })
              ),
            }));
            if (tab.customPDF && tab.terms) {
              return <>
                {/* Commented title of the page to adjust the space  */}
                {/* <div className="title-bg bg-indigo-800 p-4 w-[50%] rounded-[40px] m-auto mt-10">
                    <h2 className="text-xl font-bold uppercase text-white text-center">
                      {secTab.title}
                    </h2>
                  </div> */}
                {/* {tab.terms} */}
                <div className="p-2" dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(tab.terms.replaceAll('{{total}}', Number(
                    items.reduce(
                      (sum, item) =>
                        sum +
                        ((Number(item.quantity) || 0) *
                          (Number(item.price) || 0) || 0),
                      0
                    ) || 0
                  ).toFixed(2)))
                }}></div>
              </>
            }

            return (
              <>
                {tabIndex !== 0 && pageBreak}
                <div>
                  <div className="title-bg bg-indigo-800 w-[50%] rounded-[40px] m-auto mt-10 p-2">
                    <h2 className="text-xl font-bold uppercase text-white text-center">
                      {secTab.title}
                    </h2>
                  </div>
                  <div>
                    <h2 className="mt-8">{tab?.description}</h2>
                  </div>
                  {sections
                    .sort((a, b) => a.section.sortOrder - b.section.sortOrder)
                    .map((sect) => {
                      const items = sect.items;
                      return (
                        <>
                          <table className="w-full border-collapse border border-gray-300 mb-6 mt-10">
                            <thead>
                              <tr className="bg-blue-600 text-white">
                                <th
                                  className="border border-gray-300 p-3 text-left"
                                  colSpan={5}
                                >
                                  {sect.section.section_title}
                                </th>
                              </tr>
                              <tr className="bg-blue-600 text-white">
                                <th className="border border-gray-300 p-3 text-left">
                                  #
                                </th>
                                <th className="border border-gray-300 p-3 text-left">
                                  Description
                                </th>
                                <th className="border border-gray-300 p-3 text-center">
                                  Qty
                                </th>
                                <th className="border border-gray-300 p-3 text-right">
                                  price
                                </th>
                                <th className="border border-gray-300 p-3 text-right">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {items
                                .filter(
                                  (item) => item.quantity && item.quantity > 0
                                )
                                .map((item, index) => {
                                  item.price = Number(item?.price) || 0;
                                  const percentage =
                                    (item.price * tab.profit_margin) / 100;
                                  item.price += percentage;
                                  // console.log(item?.price, tab.profit_margin, percentage, " <== item...")
                                  return (
                                    <tr key={item.id}>
                                      <td className="border border-gray-300 p-3">
                                        {index + 1}
                                      </td>
                                      <td className="border border-gray-300 p-3">
                                        {item?.text}
                                      </td>
                                      <td className="border border-gray-300 p-3 text-center">
                                        {item?.quantity}
                                      </td>
                                      <td className="border border-gray-300 p-3 text-right">
                                        ${item?.price?.toLocaleString()}
                                      </td>
                                      <td className="border border-gray-300 p-3 text-right font-semibold">
                                        $
                                        {(
                                          Number(item?.quantity || 0) *
                                          Number(item?.price || 0) || 0
                                        ).toFixed(2)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              {items.filter(
                                (item) => item.quantity && item.quantity > 0
                              ).length <= 0 && (
                                  <tr>
                                    <td
                                      className="border border-gray-300 p-3"
                                      colSpan={5}
                                    >
                                      No items
                                    </td>
                                  </tr>
                                )}
                            </tbody>
                          </table>
                        </>
                      );
                    })}
                  <div className="flex justify-end mb-6">
                    <div className="w-1/3">
                      <table className="w-full">
                        <tr>
                          <td className="py-2 pr-4 font-semibold text-right">
                            Subtotal:
                          </td>
                          <td className="py-2 text-right">
                            $
                            {Number(
                              items.reduce(
                                (sum, item) =>
                                  sum +
                                  ((Number(item.quantity) || 0) *
                                    (Number(item.price) || 0) || 0),
                                0
                              ) || 0
                            ).toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-semibold text-right">
                            Total
                          </td>
                          <td className="py-2 text-right">
                            $
                            {Number(
                              items.reduce(
                                (sum, item) =>
                                  sum +
                                  ((Number(item.quantity) || 0) *
                                    (Number(item.price) || 0) || 0),
                                0
                              ) || 0
                            ).toFixed(2)}
                          </td>
                        </tr>
                      </table>
                    </div>
                  </div>
                  <div className="text-base font-bold text-black">
                    {tab?.notes}
                  </div>
                </div>
              </>
            );
          })}
      </div>
    ),
    7: (values, section) => (
      <div id={`pdfPreview-${section.id}`} className="p-2">
        <div className="authorazion-page mt-10">
          <div className="title-bg w-full mt-10 px-2 py-1" style={{ backgroundColor: THEME_PRIMARY_COLOR }}>
            <h2 className="text-2xl font-bold uppercase text-white text-center">
              {section.title}
            </h2>
          </div>

          <div className="border border-gray-200 bg-gray-100 mt-6 p-1 text-base font-semibold">
            SELECT ONE OPTION BELOW:
          </div>
          <div >
            <div className="space-y-2 border-l border-r border-b border-gray-200">
              <table className="w-full border border-gray-200 text-sm text-gray-700 rounded-md overflow-hidden">
                <tbody className="">
                  {tabWiseTotals.map((twt, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-2 px-3 border-b border-gray-100 border-r w-[30%] border-l">{twt.title}</td>
                      <td className="py-2 px-3 text-right border-b border-gray-100">
                        <div className="flex gap-2 items-center">
                          {formatPrice(twt?.total)}
                          <input type="checkbox" className="w-4 h-4 shadow-sm" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-3 py-3 text-sm font-semibold mt-6 bg-gray-100 text-center">
            {values?.disclaimer}
          </div>

          <div className="mt-4 text-gray-700 text-xl font-semibold">
            {values?.section_title}
          </div>

          <div className="mt-10">
            <div className="w-full pr-4">
              <div className="border border-gray-200 bg-gray-100 mt-6 p-1 text-base font-semibold text-center">Customer Comments / Notes</div>
              <textarea className="w-full h-28 border border-gray-200 border-t-0 px-4 py-2 !text-sm focus:border-gray-200 focus:outline-none focus:ring-0" placeholder="Enter Value"></textarea>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-end">
              <div className="w-1/3">
                <p className="font-semibold mt-1">
                  {opportunity?.contactName}
                </p>
                <div className="border border-gray-200 h-16 mt-2 text-gray-300 text-sm text-center flex items-center justify-center">
                  Signature
                </div>
                <div className="border-b-2 border-gray-500 mt-2"></div>
                <div className="text-center mt-2 font-semibold">Signature</div>
              </div>
              <div className="w-1/3 text-center"></div>
              <div className="w-1/3">
                <div className="border-b-2 border-gray-500 mt-6"></div>
                <div className="text-center mt-2 font-semibold">Date</div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-700 mt-6">{values?.footer_notes}</p>
        </div>
      </div>
    ),
    [`7_old`]: (values, section) => (
      <div id={`pdfPreview-${section.id}`} className="p-2">
        <div className="authorazion-page mt-10">
          <div className="title-bg bg-indigo-800 p-4 w-[50%] rounded-[40px] m-auto">
            <h2 className="text-xl font-bold uppercase text-white text-center">
              {section.title}
            </h2>
          </div>

          <div className="flex justify-between border-b-2 border-gray-700 py-4 mt-4">
            <div className="space-y-2">
              {tabWiseTotals.map((twt) => (
                <label className="flex items-center justify-between gap-4">
                  <input type="checkbox" className="mr-2" />
                  <span className="flex-1">{twt.title}</span>
                  <span>${twt?.total?.toFixed(2)}</span>
                </label>
              ))}
            </div>
            <div>
              {Object.keys(values?.arrays?.primary_signers || {}).map(
                (itemid, index) => {
                  const signer = values?.arrays.primary_signers[itemid];
                  return (
                    <>
                      <div className="text-sm space-y-2">
                        <p>
                          <span className="font-bold">Name:</span>{" "}
                          {signer.first_name} {signer.last_name}
                        </p>
                        <p>
                          <span className="font-bold">Email:</span>{" "}
                          {signer.email}
                        </p>
                      </div>
                      <br />
                    </>
                  );
                }
              )}
            </div>
          </div>

          <div className="border-t-2 border-b-4 border-gray-700 py-3 text-sm font-semibold">
            {values?.disclaimer}
          </div>

          <div className="mt-4 text-gray-700 text-xl font-semibold">
            {values?.section_title}
          </div>
          <table className="w-full border-collapse border border-gray-300 mb-6 mt-4">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border border-gray-300 p-3 text-left">
                  Description
                </th>
                <th className="border border-gray-300 p-3 text-right">
                  Line total
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(values?.arrays?.items || {}).map((itemid, index) => {
                const item = values?.arrays.items[itemid];
                return (
                  <tr
                    key={item.id}
                    className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="border border-gray-300 p-3">{item.text}</td>
                    <td className="border border-gray-300 p-3 text-right font-semibold">
                      ${Number(item.quantity) * Number(item.price)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between mt-10">
            <div className="w-1/2 pr-4">
              <h2 className="font-bold mb-2">Customer Comments / Notes</h2>
              <textarea className="w-full h-28 border border-black"></textarea>
            </div>

            <div className="w-1/2 pl-4">
              <h2 className="font-bold mb-2">My Product Selections</h2>
              <p className="text-sm font-semibold">{values?.item_1}</p>
              <p className="text-sm font-semibold">{values?.item_2}</p>
              <p className="text-sm font-semibold">{values?.item_3}</p>
              <div className="border-b-2 border-gray-500 mt-10 w-full"></div>
            </div>
          </div>

          <div className="mt-10">
            <div className="border-b-2 border-gray-500 mb-2"></div>
            <div className="flex justify-between items-end">
              <div className="w-1/3">
                <p className="font-semibold mt-1">
                  {opportunity?.contactName}:
                </p>
                <div className="border-b-2 border-gray-500 mt-6"></div>
              </div>
              <div className="w-1/3 text-center"></div>
              <div className="w-1/3">
                <p className="font-semibold mt-1">Date:</p>
                <div className="border-b-2 border-gray-500 mt-6"></div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-700 mt-6">{values?.footer_notes}</p>
        </div>
      </div>
    ),
    8: (values, section) => (
      <>
        <div id={`pdfPreview-${section.id}`} className="warrenty-page p-2">
          <div className="title-bg w-full mt-10 px-2 py-1" style={{ backgroundColor: THEME_PRIMARY_COLOR }}>
            <h2 className="text-2xl font-bold uppercase text-white text-center">
              {section.title}
            </h2>
          </div>
          <div className="flex justify-between items-center mt-10 warrenty-page">
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm">Customer</p>
                <p className="text-xs text-gray-700">
                  {opportunity?.contactName}
                </p>
              </div>

              {/* <div>
                <p className="font-semibold text-sm">Project address</p>
                <p className="text-xs text-gray-700">
                  {console.log(opportunity, " <== opppoooo...")}
                </p>
              </div> */}

              <div>
                <p className="font-semibold text-sm">Name</p>
                <p className="text-xs text-gray-700">
                  {values?.name}
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm">Date Project Completed</p>
                <p className="text-xs text-gray-700">
                  {formatDate(values?.date)}
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm">Description</p>
                <p className="text-xs text-gray-700">
                  {values?.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <img
                src="data:image/webp;base64,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"
                alt="Quality Badge"
                className="w-40 h-40 object-contain"
              />
            </div>
          </div>
        </div>
      </>
    ),
    9: (values, section) => (
      <div id={`pdfPreview-${section.id}`} className="p-2">
        <div className="title-bg w-full mt-10 px-2 py-1" style={{ backgroundColor: THEME_PRIMARY_COLOR }}>
          <h2 className="text-2xl font-bold uppercase text-white text-center">
            {section.title}
          </h2>
        </div>
        <div
          className="terms&condition-page mt-10"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(values?.terms) }}
        ></div>
      </div>
    ),
    custom: (values, section) => (
      <>
        {values?.textHtml && (
          <div id={`pdfPreview-${section.id}`} className="p-2">
            <div className="title-bg w-full mt-10 px-2 py-1" style={{ backgroundColor: THEME_PRIMARY_COLOR }}>
              <h2 className="text-2xl font-bold uppercase text-white text-center">
                {section.title}
              </h2>
            </div>
            <div
              className="mt-10"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(values.textHtml) }}
            ></div>
            {/* {pageBreak} */}
          </div>
        )}
        {/* {values?.content_type === "single_use_pdf" && values?.file_storage_path && <>
    <iframe className="w-[100vw] h-[100vh]" src={fileUploadService.getFileUrl(values?.file_storage_path)} />
    </>} */}
      </>
    ),

  }), [companyLogoUrl, tabWiseTotals, opportunity, contact, locDetails, pageBreak]);

  // Don't render until we know which template to use
  if (templateLoading) {
    return null;
  }


  // ── Dynamic template rendering via registry ─────────────────

  if (resolvedRendererKey && resolvedRendererKey !== "standard") {
    const TemplateComponent = getTemplateComponent(resolvedRendererKey);
    return (
      <div
        id="pdfPreview"
        className="bg-white p-8 max-w-3xl mx-auto"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <TemplateComponent
          formValues={formValues}
          sectionUpdates={sectionUpdates}
          locDetails={locDetails}
          contact={contact}
          locationId={locationId}
        />
      </div>
    );
  }

  return (
    <div
      id="pdfPreview"
      className="bg-white p-8 max-w-3xl mx-auto"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* First page will render here... */}
      {sectionUpdates
        ?.filter((sec) => sec.enabled)
        ?.sort((a, b) => a.sortOrder - b.sortOrder)
        ?.map((section) => {
          return (
            <Fragment key={section.id}>
              {section.type === "custom" &&
                sectionWisePages["custom"] &&
                sectionWisePages["custom"](formValues[section.id], section)}
              {sectionWisePages[section.id] &&
                sectionWisePages[section.id](
                  formValues[section.id],
                  section,
                  formValues[1]
                )}
              {section.type !== "custom" && pageBreak}
            </Fragment>
          );
        })}
    </div>
  );
}
