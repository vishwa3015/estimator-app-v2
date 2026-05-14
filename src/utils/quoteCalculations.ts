import { pricingRules } from "@/configs/estimatesEditorConfig";

export interface TabTotal {
  total: number;
  title: string;
  tabId: number;
  tabUuid: string;
}

interface QuoteItem {
  text?: string;
  price?: number | string;
  quantity?: number | string;
  wastage_percentage?: number | string;
  Tax?: boolean;
  Margin?: boolean;
}

interface QuoteSection {
  Tax?: boolean;
  Margin?: boolean;
  section_title?: string;
  sortOrder?: number;
  items?: Record<string, QuoteItem>;
}

interface QuoteTab {
  profit_margin?: number;
  tax_rate?: number;
  description?: string;
  arrays?: {
    sections?: Record<string, QuoteSection>;
    warranty?: Record<string, QuoteItem>;
  };
}

interface FormTabsMap {
  [tabUuid: string]: QuoteTab;
}

export interface QuoteSectionUpdate {
  id: number;
  title: string;
  tabs?: Array<{ id: number; title: string }>;
}

export function calculateTabTotals(
  sectionUpdates: QuoteSectionUpdate[],
  formValues: Record<string, { tabs?: FormTabsMap }> | null | undefined
): TabTotal[] {
  const quoteSection = sectionUpdates.find((sec) => sec.id === 6);
  
  if (!quoteSection?.tabs) {
    return [];
  }

  const formTabsObj = formValues?.[6]?.tabs ?? formValues?.["6"]?.tabs ?? {};
  const uuidKeys = Object.keys(formTabsObj);

  return quoteSection.tabs.map((secTab, index) => {
    const tabId = secTab.id;
    const tabUuid = uuidKeys[index] ?? String(tabId);  
    const tab = formTabsObj[tabUuid];                   
    
    if (!tab) {
      return { total: 0, title: secTab.title, tabId, tabUuid };
    }

    const sectionIds = Object.keys(tab?.arrays?.sections || {});

    // Step 1: Calculate base quantities for dynamic pricing
    const baseQuantities: Record<string, number> = {};

    sectionIds.forEach((sectionId) => {
      const section = tab?.arrays?.sections?.[sectionId];
      if (!section) return;

      const items = Object.values(section.items || {}) as Array<{
        text?: string;
        quantity?: number | string;
      }>;

      items.forEach((item) => {
        const qty = Number(item.quantity) || 0;
        const text = (item.text || "").toLowerCase();

        pricingRules.forEach((rule) => {
          const searchTerm = rule.basedOnItem.toLowerCase();
          const hasTerm = text.includes(searchTerm);
          const matchesAlt =
            "alternativeNames" in rule &&
            rule.alternativeNames?.some((alt: string) =>
              text.includes(alt.toLowerCase())
            );
          const excluded =
            "excludeVariants" in rule &&
            rule.excludeVariants?.some((v: string) =>
              text.includes(v.toLowerCase())
            );

          if ((hasTerm || matchesAlt) && !excluded) {
            const key = rule.basedOnItem;
            baseQuantities[key] = (baseQuantities[key] || 0) + qty;
          }
        });
      });
    });

    // Step 2: Calculate warranty costs based on base quantities
    const warrantyCosts: Record<string, number> = {};

    pricingRules.forEach((rule) => {
      const baseQty = baseQuantities[rule.basedOnItem] || 0;
      let totalCost = 0;

      if ("priceRanges" in rule) {
        const range = rule.priceRanges.find(
          (r) => baseQty >= r.min && baseQty <= (r.max ?? Infinity)
        );
        totalCost = range?.price || 0;
      } else if ("fixedPricePerBaseQty" in rule && baseQty > 0) {
        totalCost = baseQty * rule.fixedPricePerBaseQty!;
      }

      if (totalCost > 0) {
        warrantyCosts[rule.targetItem.toLowerCase()] = totalCost;
      }
    });

    // Step 3: Calculate section subtotals and track which need tax/margin
    const sectionData = sectionIds.map((sectionId) => {
      const section = tab?.arrays?.sections?.[sectionId];
      if (!section) return { subtotal: 0, shouldApplyTax: false, shouldApplyMargin: false };

      const items = Object.values(section.items || {}) as Array<{
        text?: string;
        price?: number | string;
        quantity?: number | string;
        wastage_percentage?: number | string;
      }>;

      let subtotal = 0;

      items.forEach((item) => {
        const textLower = (item.text || "").toLowerCase();
        const qty = Number(item.quantity) || 0;
        const wastage = Number(item.wastage_percentage) || 0;

        // Check if this item matches a warranty rule
        const matchedRule = pricingRules.find((rule) =>
          textLower.includes(rule.targetItem.toLowerCase())
        );

        if (matchedRule) {
          const warrantyKey = matchedRule.targetItem.toLowerCase();
          const dynamicCost = warrantyCosts[warrantyKey] || 0;

          if (dynamicCost > 0) {
            subtotal += dynamicCost;
            warrantyCosts[warrantyKey] = 0; // Use it only once
          }
        } else {
          const price = Math.round(Number(item.price) || 0);

          // Apply wastage if present
          const effectiveQty =
            wastage > 0 ? qty * (1 + wastage / 100) : qty;

          subtotal += price * effectiveQty;
        }
      });

      return {
        subtotal,
        shouldApplyTax: !!section.Tax,
        shouldApplyMargin: !!section.Margin,
      };
    });

    // Step 4: Calculate warranty subtotal 
    const warrantyItems = Object.values(tab?.arrays?.warranty || {}) as Array<{
      Tax?: boolean;
      Margin?: boolean;
      price?: number | string;
      quantity?: number | string;
    }>;

    let warrantySubtotal = 0;
    let warrantyHasTax = false;
    let warrantyHasMargin = false;

    warrantyItems.forEach((item) => {
      const price = Math.round(Number(item.price) || 0);
      const quantity = Number(item.quantity) || 0;
      warrantySubtotal += price * quantity;
    });

    if (warrantyItems.length > 0) {
      const firstWarranty = warrantyItems[0];
      warrantyHasTax = !!firstWarranty.Tax;
      warrantyHasMargin = !!firstWarranty.Margin;
    }

    // Step 5: Calculate subtotals for different categories
    let marginEnabledSubtotal = 0;
    let nonMarginSubtotal = 0;
    let taxEnabledSubtotal = 0;

    sectionData.forEach((data) => {
      if (data.shouldApplyMargin) {
        marginEnabledSubtotal += data.subtotal;
      } else {
        nonMarginSubtotal += data.subtotal;
      }
      
      if (data.shouldApplyTax) {
        taxEnabledSubtotal += data.subtotal;
      }
    });

    // Add warranty to appropriate categories
    if (warrantyHasMargin) {
      marginEnabledSubtotal += warrantySubtotal;
    } else {
      nonMarginSubtotal += warrantySubtotal;
    }
    
    if (warrantyHasTax) {
      taxEnabledSubtotal += warrantySubtotal;
    }

    const totalBaseSubtotal = marginEnabledSubtotal + nonMarginSubtotal;

    // Step 6: Calculate margin on wastage-adjusted subtotal (only for sections with margin enabled)
    const marginRate = tab.profit_margin || 0;
    const marginAmount = (marginEnabledSubtotal * marginRate) / 100;

    // Step 7: Calculate tax on wastage-adjusted subtotal (only for sections with tax enabled)
    const taxRate = tab.tax_rate || 0;
    const taxAmount = (taxEnabledSubtotal * taxRate) / 100;

    const finalTotal = totalBaseSubtotal + marginAmount + taxAmount;

    return {
      total: Math.round(finalTotal * 100) / 100,
      title: secTab.title,
      tabId,
      tabUuid,
    };
  });
}