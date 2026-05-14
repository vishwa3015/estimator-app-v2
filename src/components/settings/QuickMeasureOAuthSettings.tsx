import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, Mail, ShieldCheck, RefreshCw } from "lucide-react";
import { quickMeasureMeasurementOrdersService } from "@/services/quickmeasure/quickmeasure-orders-service";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GHLCredentials } from "@/types/ghl";
import { SupabaseClientConfig } from "@/types/quickmeasure-types";

type Step = "email" | "otp" | "gaf_check" | "gaf_verified";


  const getLocationId = (): string | null => {
    try {
      const stored = localStorage.getItem("smartroofing_credentials");
      if (!stored) return null;
      const creds: GHLCredentials = JSON.parse(stored);
      return creds.companyId || null;
    } catch {
      return null;
    }
  };

interface EdgeResponse {
  success: boolean;
  error?: string;
  message?: string;
}
const callEdge = async (endpoint: string, body: object): Promise<EdgeResponse> => {
  const cfg = supabase as unknown as SupabaseClientConfig;
  const res = await fetch(`${cfg.supabaseUrl}/functions/v1/quickmeasure/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.supabaseKey}` },
    body: JSON.stringify(body),
  });
  return res.json();
};

const OtpInput = ({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace") return;
    const next = [...digits];
    if (digits[i].trim()) {
      next[i] = " ";
    } else if (i > 0) {
      next[i - 1] = " ";
      refs.current[i - 1]?.focus();
    }
    onChange(next.join("").trimEnd());
  };

  const handleChange = (i: number, v: string) => {
    const char = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = char || " ";
    onChange(next.join("").trimEnd());
    if (char && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digits[i]?.trim() || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          className="w-10 h-11 text-center text-base font-bold rounded-lg border-2 border-input bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ))}
    </div>
  );
};

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
    <XCircle className="h-4 w-4 shrink-0" />
    <span>{message}</span>
  </div>
);

const ResendControl = ({
  cooldown,
  loading,
  onResend,
}: {
  cooldown: number;
  loading: boolean;
  onResend: () => void;
}) => (
  <div className="text-center">
    {cooldown > 0 ? (
      <p className="text-xs text-muted-foreground">Resend in {cooldown}s</p>
    ) : (
      <button
        className="text-xs text-primary hover:underline underline-offset-2 inline-flex items-center gap-1"
        disabled={loading}
        onClick={onResend}
      >
        <RefreshCw className="h-3 w-3" /> Resend OTP
      </button>
    )}
  </div>
);

const QuickMeasureOAuthSettings = () => {
  const [step, setStep] = useState<Step>("email");
  const [initialising, setInit] = useState(true);
  const [email, setEmail] = useState("");
  const [savedEmail, setSaved] = useState("");
  const [gafEmail, setGafEmail] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [gafOtp, setGafOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
      const locationId = getLocationId();
      if (locationId) {
        const { data } = await supabase
          .from("user_profiles")
          .select("quickmeasure_account_email")
          .eq("location_id", locationId)
          .single();
          if (data?.quickmeasure_account_email) {
            setSaved(data.quickmeasure_account_email);
            setStep("gaf_verified");
          }
        }
      } catch { /* noop */ }
      finally { setInit(false); }
    })();
  }, []);

  const startCooldown = (secs = 60) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(secs);
    cooldownRef.current = setInterval(() => {
      setCooldown((p) => {
        if (p <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const resetState = () => {
    setEmail(""); setSaved(""); setGafEmail(""); setOtpEmail("");
    setOtp(""); setGafOtp(""); setError("");
    setLoading(false); setOtpSent(false); setCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  };

  const handleDisconnect = async () => {
    const locationId = getLocationId();
    if (locationId) {
      await supabase
        .from("user_profiles")
        .update({ 
          quickmeasure_access_token: null,
          quickmeasure_token_expires_at: null,
          quickmeasure_account_email: null,
        })
        .eq("location_id", locationId);
    }
    resetState();
    setStep("email");
    toast.success("Disconnected from QuickMeasure");
  };

  const sendOtp = async (toEmail: string) => {
    const locationId = getLocationId();
    if (!locationId) throw new Error("Location ID not found.");
    const result = await callEdge("send-otp", { location_id: locationId, email: toEmail });
    if (!result.success) throw new Error(result.error || "Failed to send OTP.");
    toast.success(`OTP sent to ${toEmail}`);
    startCooldown(60);
  };

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    setLoading(true); setError(""); setOtp("");
    try {
      await sendOtp(email.trim());
      setStep("otp");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to send OTP."); }
    finally { setLoading(false); }
  };

  const saveVerifiedEmail = async (verifiedEmail: string, customerName?: string) => {
    const locationId = getLocationId();
    if (locationId) {
      await supabase.from("user_profiles")
        .update({ quickmeasure_account_email: verifiedEmail })
        .eq("location_id", locationId);
    }
    setSaved(verifiedEmail);
    setStep("gaf_verified");
    toast.success(`GAF account verified${customerName ? ` for ${customerName}` : ""}. Email saved.`);
  };

  const checkGafAccount = async (accountEmail: string): Promise<boolean> => {
    const ar = await quickMeasureMeasurementOrdersService.checkAccount(accountEmail);
    if (ar.success) {
      await saveVerifiedEmail(accountEmail, ar.gafCustomerName);
      return true;
    }
    setError(ar.errors?.[0]?.errorMessage || "No valid GAF QuickMeasure account found for this email.");
    return false;
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length < 6) { setError("Please enter the full 6-digit code."); return; }
    const locationId = getLocationId();
    if (!locationId) return;
    setLoading(true); setError("");
    try {
      const vr = await callEdge("verify-otp", { location_id: locationId, email: email.trim(), otp: otp.trim() });
      if (!vr.success) { setError(vr.error || "Invalid OTP."); return; }
      setOtpEmail(email.trim());
      const ok = await checkGafAccount(email.trim());
      if (!ok) { setGafEmail(email.trim()); setGafOtp(""); setOtpSent(false); setStep("gaf_check"); }
    } catch (e) { setError(e instanceof Error ? e.message : "Verification failed."); }
    finally { setLoading(false); }
  };

  const handleGafCheckAccount = async () => {
    if (!gafEmail.trim() || !gafEmail.includes("@")) { setError("Please enter a valid email address."); return; }
    const locationId = getLocationId();
    if (!locationId) return;
    setError(""); setLoading(true);

    if (gafEmail.trim().toLowerCase() === otpEmail.toLowerCase()) {
      try { await checkGafAccount(gafEmail.trim()); }
      catch (e) { setError(e instanceof Error ? e.message : "Account check failed."); }
      finally { setLoading(false); }
      return;
    }

    setGafOtp(""); setOtpSent(false);
    try {
      await sendOtp(gafEmail.trim());
      setOtpSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to send OTP."); }
    finally { setLoading(false); }
  };

  const handleGafVerifyOtp = async () => {
    if (gafOtp.trim().length < 6) { setError("Please enter the full 6-digit code."); return; }
    const locationId = getLocationId();
    if (!locationId) return;
    setLoading(true); setError("");
    try {
      const vr = await callEdge("verify-otp", { location_id: locationId, email: gafEmail.trim(), otp: gafOtp.trim() });
      if (!vr.success) { setError(vr.error || "Invalid OTP."); return; }
      setOtpEmail(gafEmail.trim());
      const ok = await checkGafAccount(gafEmail.trim());
      if (!ok) { setOtpSent(false); setGafOtp(""); }
    } catch (e) { setError(e instanceof Error ? e.message : "Verification failed."); }
    finally { setLoading(false); }
  };

  const isConnected = step === "gaf_verified";

  return (
    <Card>
      <CardHeader>
            <CardTitle className="flex items-center gap-2">
              QuickMeasure Integration
              {isConnected ? (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connect your QuickMeasure account to access measurement and report services
            </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {initialising && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Initialising…
          </div>
        )}

        {!initialising && step === "email" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="qm-email" className="text-sm font-medium">Account Email</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter the email registered with your GAF QuickMeasure account.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                id="qm-email"
                type="email"
                placeholder="e.g. roofer@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                disabled={loading}
                className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              <Button onClick={handleSendOtp} disabled={loading || !email.trim()}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                  : <><Mail className="mr-2 h-4 w-4" />Send OTP</>}
              </Button>
            </div>
            {error && <ErrorBanner message={error} />}
          </div>
        )}

        {!initialising && step === "otp" && (
          <div className="space-y-4 max-w-[338px]">
            <div>
              <Label className="text-sm font-medium">Verification Code</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
              </p>
            </div>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            {error && <ErrorBanner message={error} />}
            <div className="flex gap-2">
              <Button onClick={handleVerifyOtp} disabled={otp.trim().length < 6 || loading} className="flex-1">
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</>
                  : <><ShieldCheck className="mr-2 h-4 w-4" />Verify Code</>}
              </Button>
              <Button variant="outline" onClick={() => { setStep("email"); setError(""); setOtp(""); }} disabled={loading}>
                Back
              </Button>
            </div>
            <ResendControl cooldown={cooldown} loading={loading} onResend={handleSendOtp} />
          </div>
        )}

        {!initialising && step === "gaf_check" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="qm-gaf-email" className="text-sm font-medium">Account Email</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
              Enter the email registered with your GAF QuickMeasure account.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                id="qm-gaf-email"
                type="email"
                placeholder="e.g. roofer@company.com"
                value={gafEmail}
                onChange={(e) => { 
                  setGafEmail(e.target.value); 
                  setError(""); 
                  setOtpSent(false); 
                  setGafOtp(""); }}
                disabled={loading || otpSent}
                className={error && !otpSent ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {!otpSent && (
                <Button
                 variant="outline" 
                 onClick={handleGafCheckAccount} 
                 disabled={loading || !gafEmail.trim()}>
                  {loading ? 
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking…
                    </>
                    : "Check account"}
                </Button>
              )}
            </div>

            {!otpSent && error && <ErrorBanner message={error} />}

            {otpSent && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-muted-foreground">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{gafEmail}</span>.
                </p>
                <OtpInput value={gafOtp} onChange={setGafOtp} disabled={loading} />
                {error && <ErrorBanner message={error} />}
                <div className="flex gap-2 max-w-[338px]">
                  <Button onClick={handleGafVerifyOtp} disabled={gafOtp.trim().length < 6 || loading} className="flex-1">
                    {loading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</>
                      : <><ShieldCheck className="mr-2 h-4 w-4" />Verify Code</>}
                  </Button>
                  <Button variant="outline" onClick={() => { setOtpSent(false); setGafOtp(""); setError(""); }} disabled={loading}>
                    Back
                  </Button>
                </div>
                <ResendControl cooldown={cooldown} loading={loading} onResend={handleGafCheckAccount} />
              </div>
            )}
          </div>
        )}

        {!initialising && step === "gaf_verified" && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Account Email</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Your verified GAF QuickMeasure account email.</p>
            </div>
            <div className="flex gap-2">
              <Input value={savedEmail} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { resetState(); setStep("email"); }}>
                Change account
              </Button>
            </div>
          </div>
        )}

        {!initialising && isConnected && (
          <Button variant="outline" onClick={handleDisconnect} disabled={loading}>
            Disconnect
          </Button>
        )}

        {/* ── Info box ── */}
        <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
          <p className="font-medium">About OAuth authorization</p>
          <p className="text-muted-foreground">
            QuickMeasure uses the OAuth 2.0 Client Credentials grant flow for secure API access.
            Your account email is validated against the GAF registry and stored in your profile —
            it's used when placing measurement orders on behalf of your account.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickMeasureOAuthSettings;