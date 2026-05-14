import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EstimateDocument } from "@/types/estimate-items";
import { estimateService } from "@/services/estimates";
import { productService, Product } from "@/services/products/product-service";

interface QuoteDetailsLandmarkProps {
  estimate: EstimateDocument;
  setEstimate: React.Dispatch<React.SetStateAction<EstimateDocument>>;
}

type Landmark = NonNullable<NonNullable<EstimateDocument['quoteDetails']>['landmark']>;
type LandmarkSection = Landmark['sections'][number];
type LandmarkItem = LandmarkSection['items'][number];

const ensureInit = (estimate: EstimateDocument) => {
  if (!estimate.quoteDetails?.landmark) {
    return {
      ...estimate,
      quoteDetails: {
        landmark: {
          sections: [
            { id: crypto.randomUUID(), title: "Section", items: [
              { id: crypto.randomUUID(), item: "", quantity: 1, price: 0, total: 0 }
            ], sectionTotal: 0 }
          ],
          profitMargin: 20,
          subtotal: 0,
          total: 0,
          description: '',
          notes: ''
        }
      }
    } as EstimateDocument;
  }
  return estimate;
};

const calcTotals = (est: EstimateDocument) => {
  const ld = est.quoteDetails!.landmark;
  const subtotal = (ld.sections || []).reduce((sum, s) => sum + (s.sectionTotal || 0), 0);
  const margin = Math.min(99, Math.max(1, ld.profitMargin || 1));
  const total = subtotal + (subtotal * margin) / 100;
  return { subtotal, total };
};

const QuoteDetailsLandmark: React.FC<QuoteDetailsLandmarkProps> = ({ estimate, setEstimate }) => {
  const est = React.useMemo(() => ensureInit(estimate), [estimate]);
  const ld = est.quoteDetails!.landmark;
  const [allEstimates, setAllEstimates] = React.useState<EstimateDocument[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);

  React.useEffect(() => {
    (async () => {
      const list = await estimateService.getEstimates();
      setAllEstimates(list.filter((e) => e.id !== est.id));
      const productsList = await productService.getProducts();
      setProducts(productsList);
    })();
  }, [est.id]);

  const setLd = (updater: (current: Landmark) => Landmark) => {
    setEstimate(prev => {
      const base = ensureInit(prev);
      const nextLd = updater(base.quoteDetails!.landmark);
      const next = { ...base, quoteDetails: { landmark: nextLd } } as EstimateDocument;
      const { subtotal, total } = calcTotals(next);
      next.quoteDetails!.landmark.subtotal = subtotal;
      next.quoteDetails!.landmark.total = total;
      return next;
    });
  };

  const addSection = () => setLd((l) => ({ ...l, sections: [...(l.sections || []), { id: crypto.randomUUID(), title: "Section", items: [], sectionTotal: 0 }] }));
  const removeSection = (id: string) => setLd((l) => ({ ...l, sections: l.sections.filter((s: LandmarkSection) => s.id !== id) }));

  const addItem = (sid: string) => setLd((l) => ({
    ...l,
    sections: l.sections.map((s: LandmarkSection) => s.id === sid ? { ...s, items: [...s.items, { id: crypto.randomUUID(), item: "", quantity: 1, price: 0, total: 0 }] } : s)
  }));

  const updateItem = (sid: string, iid: string, field: "item" | "quantity" | "price", value: string) => setLd((l) => ({
    ...l,
    sections: l.sections.map((s: LandmarkSection) => {
      if (s.id !== sid) return s;
      const items = s.items.map((it: LandmarkItem) => {
        if (it.id !== iid) return it;
        const next = { ...it, [field]: field === 'item' ? value : Number(value) };
        next.total = Number(next.quantity) * Number(next.price || 0);
        return next;
      });
      const sectionTotal = items.reduce((sum: number, it: LandmarkItem) => sum + (it.total || 0), 0);
      return { ...s, items, sectionTotal };
    })
  }));

  const removeItem = (sid: string, iid: string) => setLd((l) => ({
    ...l,
    sections: l.sections.map((s: LandmarkSection) => {
      if (s.id !== sid) return s;
      const items = s.items.filter((it: LandmarkItem) => it.id !== iid);
      return { ...s, items, sectionTotal: items.reduce((sum: number, it: LandmarkItem) => sum + (it.total || 0), 0) };
    })
  }));

  const includeFromEstimate = async (estimateId: string) => {
    const src = allEstimates.find(e => e.id === estimateId);
    if (!src) return;
    // Map existing estimate.lineItems into a single section
    const items = (src.lineItems || []).map(li => ({ id: crypto.randomUUID(), item: li.item, quantity: li.quantity, price: li.rate, total: li.total }));
    setLd((l) => ({
      ...l,
      includeFromEstimateId: estimateId,
      sections: [
        ...(l.sections || []),
        { id: crypto.randomUUID(), title: `Imported from ${src.number || src.title}`, items, sectionTotal: items.reduce((s, it) => s + (it.total || 0), 0) }
      ]
    }));
  };

  const addProductToSection = (productId: string, sectionId?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newItem = {
      id: crypto.randomUUID(),
      item: product.name,
      quantity: 1,
      price: Number(product.price),
      total: Number(product.price),
      productId: product.id
    };

    if (sectionId) {
      // Add to existing section
      setLd((l) => ({
        ...l,
        sections: l.sections.map((s: LandmarkSection) => {
          if (s.id !== sectionId) return s;
          const items = [...s.items, newItem];
          const sectionTotal = items.reduce((sum: number, it: LandmarkItem) => sum + (it.total || 0), 0);
          return { ...s, items, sectionTotal };
        })
      }));
    } else {
      // Create new section with product
      setLd((l) => ({
        ...l,
        sections: [
          ...(l.sections || []),
          {
            id: crypto.randomUUID(),
            title: "Products",
            items: [newItem],
            sectionTotal: Number(product.price)
          }
        ]
      }));
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0">
        <CardTitle>Quote Details - CertainTeed Landmark</CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Include all items from</Label>
            <Select onValueChange={includeFromEstimate}>
              <SelectTrigger>
                <SelectValue placeholder="Select existing estimate" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {allEstimates.length === 0 ? (
                  <SelectItem value="__none__" disabled>No estimates</SelectItem>
                ) : allEstimates.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.number || e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Add product from catalog</Label>
            <Select onValueChange={(value) => addProductToSection(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {products.length === 0 ? (
                  <SelectItem value="__none__" disabled>No products available</SelectItem>
                ) : products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} - ${Number(p.price).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={ld.description || ''}
              onChange={(e) => setLd((l) => ({ ...l, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <h4 className="font-medium">Sections</h4>
          <Button type="button" onClick={addSection}>Add Section</Button>
        </div>

        {(ld.sections || []).map((sec: LandmarkSection) => (
          <Card key={sec.id} className="">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <Input
                value={sec.title}
                onChange={(e) => setLd((l) => ({
                  ...l,
                  sections: l.sections.map((s: LandmarkSection) => s.id === sec.id ? { ...s, title: e.target.value } : s)
                }))}
              />
              <Button type="button" className="mt-0" style={{ marginTop: 0 }} variant="destructive" size="sm" onClick={() => removeSection(sec.id)}>
                Delete Section
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(sec.items || []).map((it: LandmarkItem) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Input placeholder="Item" value={it.item} onChange={(e) => updateItem(sec.id, it.id, 'item', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" min={0} value={it.quantity} onChange={(e) => updateItem(sec.id, it.id, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" min={0} value={it.price} onChange={(e) => updateItem(sec.id, it.id, 'price', e.target.value)} />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium">{(it.total || 0).toFixed(2)}</div>
                  <div className="col-span-2 text-right">
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(sec.id, it.id)}>Remove</Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addItem(sec.id)}>Add Custom Item</Button>
                <Select onValueChange={(value) => addProductToSection(value, sec.id)}>
                  <SelectTrigger className="w-[200px] h-8">
                    <SelectValue placeholder="Add from catalog" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    {products.length === 0 ? (
                      <SelectItem value="__none__" disabled>No products</SelectItem>
                    ) : products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - ${Number(p.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-right text-sm">Section total: <span className="font-semibold">{(sec.sectionTotal || 0).toFixed(2)}</span></div>
            </CardContent>
          </Card>
        ))}

        <div className="grid sm:grid-cols-2 gap-4 items-center">
          <div>
            <Label>Profit margin for this quote</Label>
            <div className="flex items-center gap-3">
              <Slider value={[ld.profitMargin || 1]} min={1} max={99} step={1} onValueChange={(v) => setLd((l) => ({ ...l, profitMargin: v[0] }))} className="flex-1" />
              <Input type="number" min={1} max={99} value={ld.profitMargin || 1} onChange={(e) => setLd((l) => ({ ...l, profitMargin: Math.max(1, Math.min(99, Number(e.target.value))) }))} className="w-20" />
              <span className="text-sm">%</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm">Quote subtotal: <span className="font-semibold">{(ld.subtotal || 0).toFixed(2)}</span></div>
            <div className="text-sm">Total: <span className="font-semibold">{(ld.total || 0).toFixed(2)}</span></div>
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea value={ld.notes || ''} onChange={(e) => setLd((l) => ({ ...l, notes: e.target.value }))} />
        </div>
      </CardContent>
    </Card>
  );
};

export default QuoteDetailsLandmark;
