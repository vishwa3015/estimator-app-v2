import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { EstimateDocument, QuoteLineItem } from "@/types/estimate-items";

interface AuthorizationEditorProps {
  estimate: EstimateDocument;
  setEstimate: React.Dispatch<React.SetStateAction<EstimateDocument>>;
}

type AuthPage = NonNullable<EstimateDocument['authorizationPage']>;
type AuthSigner = AuthPage['signers'][number];
type AuthProductSelection = AuthPage['productSelections'][number];

const AuthorizationEditor: React.FC<AuthorizationEditorProps> = ({ estimate, setEstimate }) => {
  const auth = estimate.authorizationPage || {
    disclaimerText: '',
    section: { title: 'Authorization Items', items: [], profitMargin: 10 },
    productSelections: [{}, {}, {}],
    signers: [{ firstName: '', lastName: '', email: '' }],
    footerNotes: ''
  };

  const setAuth = (updater: (a: AuthPage) => AuthPage) => {
    setEstimate(prev => ({ ...prev, authorizationPage: updater(prev.authorizationPage || auth) }));
  };

  const addItem = () => setAuth(a => ({
    ...a,
    section: { ...a.section, items: [...a.section.items, { id: crypto.randomUUID(), item: '', quantity: 1, price: 0, total: 0 }] }
  }));

  const updateItem = (iid: string, field: 'item' | 'quantity' | 'price', value: string) => setAuth(a => ({
    ...a,
    section: {
      ...a.section,
      items: a.section.items.map((it: QuoteLineItem) => {
        if (it.id !== iid) return it;
        const next = { ...it, [field]: field === 'item' ? value : Number(value) };
        next.total = Number(next.quantity) * Number(next.price || 0);
        return next;
      })
    }
  }));

  const removeItem = (iid: string) => setAuth(a => ({
    ...a,
    section: { ...a.section, items: a.section.items.filter((it: QuoteLineItem) => it.id !== iid) }
  }));

  const addSigner = () => setAuth(a => ({ ...a, signers: [...a.signers, { firstName: '', lastName: '', email: '' }] }));
  const removeSigner = (idx: number) => setAuth(a => ({ ...a, signers: a.signers.filter((_: AuthSigner, i: number) => i !== idx) }));

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0">
        <CardTitle>Authorization Page</CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        <div>
          <Label>Disclaimer</Label>
          <p className="text-xs text-muted-foreground mb-1">For example, the terms of an estimate, or a direction to the insurer.</p>
          <Textarea value={auth.disclaimerText} onChange={(e) => setAuth(a => ({ ...a, disclaimerText: e.target.value }))} />
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Section</h4>
          <Input placeholder="Section title" value={auth.section.title} onChange={(e) => setAuth(a => ({ ...a, section: { ...a.section, title: e.target.value } }))} />
          <div className="space-y-2">
            {(auth.section.items || []).map((it: QuoteLineItem) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4"><Input placeholder="Item" value={it.item} onChange={(e) => updateItem(it.id, 'item', e.target.value)} /></div>
                <div className="col-span-2"><Input type="number" value={it.quantity} onChange={(e) => updateItem(it.id, 'quantity', e.target.value)} /></div>
                <div className="col-span-2"><Input type="number" value={it.price} onChange={(e) => updateItem(it.id, 'price', e.target.value)} /></div>
                <div className="col-span-2 text-right text-sm font-medium">{(Number(it.quantity) * Number(it.price || 0)).toFixed(2)}</div>
                <div className="col-span-2 text-right"><Button type="button" size="sm" variant="ghost" onClick={() => removeItem(it.id)}>Remove</Button></div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>Add Item</Button>
          </div>

          <div>
            <Label>Profit margin for this quote</Label>
            <div className="flex items-center gap-3">
              <Slider value={[auth.section.profitMargin || 1]} min={1} max={99} step={1} onValueChange={(v) => setAuth(a => ({ ...a, section: { ...a.section, profitMargin: v[0] } }))} className="flex-1" />
              <Input type="number" min={1} max={99} value={auth.section.profitMargin || 1} onChange={(e) => setAuth(a => ({ ...a, section: { ...a.section, profitMargin: Math.max(1, Math.min(99, Number(e.target.value))) } }))} className="w-20" />
              <span className="text-sm">%</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">My Product Selections</h4>
          <p className="text-xs text-muted-foreground">Use this section to request project or product details on your authorization page.</p>
          {[0,1,2].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Input placeholder="Item" value={auth.productSelections[i]?.item || ''} onChange={(e) => setAuth(a => ({
                ...a,
                productSelections: a.productSelections.map((p: AuthProductSelection, idx: number) => idx === i ? { ...p, item: e.target.value } : p)
              }))} />
              <Input placeholder="Selection" value={auth.productSelections[i]?.selection || ''} onChange={(e) => setAuth(a => ({
                ...a,
                productSelections: a.productSelections.map((p: AuthProductSelection, idx: number) => idx === i ? { ...p, selection: e.target.value } : p)
              }))} />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Primary signer(s)</h4>
          {(auth.signers || []).map((s: AuthSigner, idx: number) => (
            <div key={idx} className="grid sm:grid-cols-4 gap-2 items-center">
              <Input placeholder="First name" value={s.firstName || ''} onChange={(e) => setAuth(a => ({ ...a, signers: a.signers.map((x: AuthSigner, i: number) => i === idx ? { ...x, firstName: e.target.value } : x) }))} />
              <Input placeholder="Last name" value={s.lastName || ''} onChange={(e) => setAuth(a => ({ ...a, signers: a.signers.map((x: AuthSigner, i: number) => i === idx ? { ...x, lastName: e.target.value } : x) }))} />
              <Input placeholder="Email" type="email" value={s.email || ''} onChange={(e) => setAuth(a => ({ ...a, signers: a.signers.map((x: AuthSigner, i: number) => i === idx ? { ...x, email: e.target.value } : x) }))} />
              <div className="text-right">
                <Button type="button" size="sm" variant="ghost" onClick={() => removeSigner(idx)} disabled={(auth.signers || []).length <= 1}>Remove</Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addSigner}>Add signer</Button>
        </div>

        <div>
          <Label>Footer notes</Label>
          <Textarea value={auth.footerNotes || ''} onChange={(e) => setAuth(a => ({ ...a, footerNotes: e.target.value }))} />
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthorizationEditor;
