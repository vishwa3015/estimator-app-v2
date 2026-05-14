
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Loader2, X } from "lucide-react";
import QuotationTemplate from "@/components/pdf/QuoteTemplate";
import { isRendererKeyRegistered } from "@/Templateregistry";
import { FormValues } from "@/types/estimate-items";

const DUMMY_FORM_VALUES: FormValues = {
  1: {
    company_name: "Apex Roofing Solutions",
    address: "1234 Shingle Way",
    city: "Austin",
    state: "TX",
    zip_code: "78701",
    date: new Date().toISOString(),
    primary_image: {
      file_storage_path: null,
      _preview_url: "https://blog.pitchgauge.com/wp-content/uploads/2025/07/Purple-Black-Cyberpunk-Realistic-Product-Facebook-Post-2-1.png",
    },
  },
  2: {
    introduction:
      "<p>Thank you for the opportunity to provide this estimate. We are committed to delivering the highest quality workmanship and materials on every project.</p><p>Our team has over 20 years of experience serving residential and commercial clients across the region.</p>",
  },
  5: {
    arrays: {
      sections: {
        sec1: {
          style: "default",
          inputs: {
            inp1: {
              image: null,
              text: "<p><strong>Premium Architectural Shingles</strong></p><p>Lifetime warranty, Class 4 impact rated, available in 30+ colors.</p>",
            },
            inp2: {
              image: null,
              text: "<p><strong>Synthetic Underlayment</strong></p><p>Superior moisture barrier, 10× stronger than traditional felt paper.</p>",
            },
          },
        },
      },
    },
  },
  6: {
    tabs: {
      "tab-1": {
        description: "Standard Package — Best Value",
        arrays: {
          sections: {
            sec1: {
              sortOrder: 0,
              section_title: "Roofing Materials",
              items: {
                item1: { quantity: 1, text: "Architectural Shingles (30-yr)", description: "" },
                item2: { quantity: 1, text: "Ice & Water Shield", description: "" },
                item3: { quantity: 1, text: "Ridge Cap", description: "" },
              },
            },
          },
        },
      },
      "tab-2": {
        description: "Premium Package — Full Protection",
        arrays: {
          sections: {
            sec1: {
              sortOrder: 0,
              section_title: "Premium Materials",
              items: {
                item1: { quantity: 1, text: "Class 4 Impact Shingles (50-yr)", description: "" },
                item2: { quantity: 1, text: "Full Ice & Water Shield", description: "" },
                item3: { quantity: 1, text: "Drip Edge All Sides", description: "" },
                item4: { quantity: 1, text: "Lifetime Warranty", description: "" },
              },
            },
          },
        },
      },
    },
  },
  7: {
    disclaimer: "Prices valid for 30 days from estimate date.",
    section_title: "Authorization to Proceed",
    footer_notes: "Thank you for choosing Apex Roofing Solutions.",
  },
  8: {
    name: "Main Residence",
    date: new Date().toISOString(),
    description: "Full roof replacement — architectural shingles.",
  },
  9: {
    terms:
      "<p><strong>Terms & Conditions</strong></p><p>Payment is due upon completion of work. A deposit of 50% may be required prior to project start. All work is guaranteed against defects in workmanship for a period of 5 years.</p>",
  },
};

const DUMMY_SECTION_UPDATES = [
  { id: 1, enabled: true, sortOrder: 0, title: "Cover Page", type: "standard" },
  { id: 2, enabled: true, sortOrder: 1, title: "Introduction", type: "standard" },
  {
    id: 6,
    enabled: true,
    sortOrder: 2,
    title: "Quote Options",
    type: "standard",
    tabs: [
      { id: "tab-1", title: "Standard Package" },
      { id: "tab-2", title: "Premium Package" },
    ],
  },
  { id: 7, enabled: true, sortOrder: 3, title: "Authorization", type: "standard" },
  { id: 9, enabled: true, sortOrder: 4, title: "Terms & Conditions", type: "standard" },
];

const DUMMY_CONTACT = {
  firstName: "John",
  lastName: "Homeowner",
  id: "preview-contact",
};

const DUMMY_LOC_DETAILS = {
  business: {
    name: "Apex Roofing Solutions",
    address: "1234 Shingle Way",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    phone: "(512) 555-0100",
    email: "info@apexroofing.com",
  },
};

const TemplatePreviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rendererKey = searchParams.get("key") ?? "standard";
  const templateName = searchParams.get("name") ?? "Template Preview";

  const isRegistered = isRendererKeyRegistered(rendererKey);

  // Update tab title
  useEffect(() => {
    document.title = `Preview — ${templateName}`;
  }, [templateName]);

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-8">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-800">Preview not available</h2>
          <p className="text-sm text-gray-500 mt-2">
            The renderer for{" "}
            <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-sm">
              {rendererKey}
            </code>{" "}
            hasn't been registered yet.
          </p>
          <button
            onClick={() => window.close()}
            className="mt-6 text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Close tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">{templateName}</span>
          <span className="text-[11px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
            {rendererKey}
          </span>
          <span className="text-[11px] text-gray-400 bg-amber-50 border border-amber-200 text-amber-600 px-2 py-0.5 rounded">
            Sample data — not a real estimate
          </span>
        </div>
        <button
          onClick={() => window.close()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Close tab
        </button>
      </div>

      {/* Template render */}
      <div className="py-8 px-4">
        <QuotationTemplate
          formValues={DUMMY_FORM_VALUES}
          sectionUpdates={DUMMY_SECTION_UPDATES}
          locDetails={DUMMY_LOC_DETAILS}
          contact={DUMMY_CONTACT}
          locationId="preview"
          rendererKey={rendererKey}
        />
      </div>
    </div>
  );
};

export default TemplatePreviewPage;