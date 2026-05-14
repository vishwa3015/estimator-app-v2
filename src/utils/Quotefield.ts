import { Product, ProductCategory } from "@/services/products/product-service";
import { FormValues, QuoteItem, QuoteSectionData, SectionConfig } from "@/types/estimate-items";

const QUOTE_SECTION_ID = 6;

export function getCategoryName(
  item: QuoteItem | null | undefined,
  products: Product[],
  categories: ProductCategory[]
): string | null {
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
  const itemDescription = (item.description || "").trim().toLowerCase();
  if (!itemName) return null;

  const matchedProduct = products.find(
    (p) => (p.name || "").trim().toLowerCase() === itemName
  );
  if (matchedProduct?.category_id) {
    const category = categories.find((c) => c.id === matchedProduct.category_id);
    return category?.name ?? null;
  }

  if (itemDescription) {
    return itemDescription ?? null;
  }

  return null;
}

function findProduct(item: QuoteItem | null | undefined, products: Product[]): Product | null {
  if (!item) return null;
  if (item.catalog_product_id) {
    return products.find((p) => p.id === item.catalog_product_id) ?? null;
  }
  const itemName = (item.text || "").trim().toLowerCase();
  if (!itemName) return null;
  return products.find((p) => (p.name || "").trim().toLowerCase() === itemName) ?? null;
}

export function extractQuoteFields(
  formValues: FormValues,
  sectionUpdates: SectionConfig[],
  getCategoryNameFn: (item: QuoteItem) => string | null,
  products: Product[] = []
) {
  const quoteSection = sectionUpdates?.find(
    (s) => s.id === QUOTE_SECTION_ID
  );

  const getTabData = (tabIndex: number) => {
    const tab = quoteSection?.tabs?.[tabIndex];
    if (!tab) return null;
    const tabData = formValues?.[QUOTE_SECTION_ID]?.tabs?.[tab.id];
    return { tab, tabData };
  };

  const formatTabItems = (tabIndex: number): string => {
    const result = getTabData(tabIndex);
    if (!result?.tabData) return "";

    const sections = result.tabData?.arrays?.sections || {};
    const sortedSections = Object.entries(sections).sort(
      ([, a], [, b]) => {
        const sa = (a as QuoteSectionData).sortOrder ?? 0;
        const sb = (b as QuoteSectionData).sortOrder ?? 0;
        return sa - sb;
      }
    );

    return sortedSections
      .map(([, sec]) => {
        const section = sec as QuoteSectionData;
        const items = Object.values(section.items || {})
          .filter((item) => item.quantity && Number(item.quantity) > 0)
          .map((item) => {
            const quoteItem = item as QuoteItem;
            const category = getCategoryNameFn(quoteItem);
            const categoryLine = category ? `\n  ${category}` : "";
            return `- ${quoteItem.text}${categoryLine}`;
          })
          .join("\n");
        if (!items) return null;
        return `${sec.section_title || "Items"}\n${items}`;
      })
      .filter(Boolean)
      .join("\n\n");
  };

  const formatTabProductDetails = (tabIndex: number): string => {
    const result = getTabData(tabIndex);
    if (!result) return "";

    const { tabData } = result;
    const lines: string[] = [];

    if (!tabData) return "";

    const sections = tabData?.arrays?.sections || {};
    const sortedSections = Object.entries(sections).sort(
      ([, a], [, b]) => {
        const sa = (a as QuoteSectionData).sortOrder ?? 0;
        const sb = (b as QuoteSectionData).sortOrder ?? 0;
        return sa - sb;
      }
    );

    const seenProductIds = new Set<string>();

    for (const [, sec] of sortedSections) {
      const section = sec as QuoteSectionData;
      const activeItems = Object.values(section.items || {}).filter(
        (item) => item.quantity && Number(item.quantity) > 0
      );
      if (activeItems.length === 0) continue;

      for (const item of activeItems) {
        const quoteItem = item as QuoteItem;
        const product = findProduct(quoteItem, products);
      if (product) {
        if (seenProductIds.has(product.id)) continue;
        seenProductIds.add(product.id);

        const title = product.name?.trim();
        const description = product.description?.trim();

        if (!title && !description) continue;

        if (title) lines.push(`- ${title}`);
        if (description) {
          lines.push(`  ${description}`);
        }
      } else {
        const itemText = (item.text || "").trim();
        if (!itemText) continue;
        lines.push(`- ${itemText}`);
      }
      }
    }

    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

    return lines.join("\n");
  };

  const goodTab = getTabData(0);
  const betterTab = getTabData(1);
  const bestTab = getTabData(2);

  return {
    goodTitle: goodTab?.tab?.title || "",
    betterTitle: betterTab?.tab?.title || "",
    bestTitle: bestTab?.tab?.title || "",
    goodDescription: goodTab?.tabData?.description || "",
    betterDescription: betterTab?.tabData?.description || "",
    bestDescription: bestTab?.tabData?.description || "",
    goodItems: formatTabItems(0),
    betterItems: formatTabItems(1),
    bestItems: formatTabItems(2),
    goodProductDetails: formatTabProductDetails(0),
    betterProductDetails: formatTabProductDetails(1),
    bestProductDetails: formatTabProductDetails(2),
  };
}