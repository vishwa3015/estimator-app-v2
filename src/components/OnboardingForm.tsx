import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OnboardingForm = ({ open, onOpenChange }: OnboardingFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    locationId: "",
    pit: "",
    email: "",
    password: "",
    company_name: "",
    company_logo_url: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const newErrors: Record<string, string> = {};

      // Validate required fields
      if (!formData.locationId) {
        newErrors.locationId = "Location ID is required";
      }
      if (!formData.pit) {
        newErrors.pit = "Private Integration Token is required";
      }
      if (!formData.email) {
        newErrors.email = "Email is required";
      }
      if (!formData.password) {
        newErrors.password = "Password is required";
      }

      // Validate email format
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }

      // Validate password length
      if (formData.password && formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters long";
      }

      // If there are validation errors, show them and stop
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }

      // Call the Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke(
        "onboard-new-client",
        {
          body: formData,
        }
      );

      // Handle function invocation errors
      if (functionError) {
        console.error("Function invocation error:", functionError);
        toast({
          variant: "destructive",
          title: "Error",
          description: functionError.message || "Failed to onboard user. Please try again.",
        });
        setIsSubmitting(false);
        return;
      }

      // Handle unsuccessful responses
      if (!data?.success) {
        const errorMessage = data?.error || "Failed to onboard user";
        const lowerErrorMsg = errorMessage.toLowerCase();

        if (lowerErrorMsg.includes("already exists")) {
          toast({
            variant: "destructive",
            title: "User Already Exists",
            description: "A user with this email already exists in the system.",
          });
        } else if (lowerErrorMsg.includes("credential") || lowerErrorMsg.includes("authentication") || lowerErrorMsg.includes("pipeline")) {
          toast({
            variant: "destructive",
            title: "Invalid Credentials",
            description: "The provided credentials are invalid. Please check your Location ID and PIT token.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Onboarding Failed",
            description: errorMessage,
          });
        }
        setIsSubmitting(false);
        return;
      }

      // Success
      toast({
        title: "Success!",
        description: "User has been successfully onboarded.",
        className: "bg-green-50 border-green-200",
      });

      // Reset form and close dialog after a short delay
      setTimeout(() => {
        setFormData({
          locationId: "",
          pit: "",
          email: "",
          password: "",
          company_name: "",
          company_logo_url: "",
        });
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      console.error("Error onboarding user:", err);
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: err instanceof Error ? err.message : "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Onboard New Client</DialogTitle>
        </DialogHeader>

        <div className="space-y-4" onKeyPress={handleKeyPress}>
          {/* Required Fields Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locationId">
                Location ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="locationId"
                name="locationId"
                type="text"
                value={formData.locationId}
                onChange={handleChange}
                placeholder="Enter GHL Location ID"
                autoComplete="off"
                className={errors.locationId ? "border-red-500" : ""}
              />
              {errors.locationId && (
                <p className="text-sm text-red-500">{errors.locationId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pit">
                Private Integration Token (PIT) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pit"
                name="pit"
                type="password"
                value={formData.pit}
                onChange={handleChange}
                placeholder="Enter PIT token"
                autoComplete="new-password"
                className={errors.pit ? "border-red-500" : ""}
              />
              {errors.pit && (
                <p className="text-sm text-red-500">{errors.pit}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@example.com"
                  autoComplete="off"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter secure password"
                  autoComplete="new-password"
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
            </div>
          </div>

          {/* Company Information Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                name="company_name"
                type="text"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="Enter company name"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_logo_url">Company Logo URL</Label>
              <Input
                id="company_logo_url"
                name="company_logo_url"
                type="url"
                value={formData.company_logo_url}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating User...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingForm;