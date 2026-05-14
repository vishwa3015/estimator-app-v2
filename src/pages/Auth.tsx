
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { setLocationContext } from '@/hooks/use-location-context';
import { AuthData, GHLCredentials } from '@/types/ghl';
import { ghlService } from '@/services/ghl';
import { contactsService } from '@/services/ghl/contacts';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoLogging, setAutoLogging] = useState(false);
  const navigate = useNavigate();

  // Check for URL parameters and auto-login
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlEmail = urlParams.get('email');
    const urlPassword = urlParams.get('password');

    if (urlEmail && urlPassword) {
      setAutoLogging(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      attemptAutoLogin(urlEmail, urlPassword);
    }
  }, []);

  const attemptAutoLogin = async (urlEmail: string, urlPassword: string) => {
    try {
      const authResult = await supabase.auth.signInWithPassword({
        email: urlEmail.trim(),
        password: urlPassword,
      });

      const { data, error } = authResult;

      if (error) {
        console.error('Auto-login failed:', error.message);
        toast.error(`Auto-login failed: ${error.message}`);
        setEmail(urlEmail);
        setPassword(urlPassword);
        setAutoLogging(false);
        return;
      }

      if (data.session) {
        await handleSuccessfulAuth(data);
      } else {
        // No session created
        toast.error("Could not create session. Please sign in manually.");
        setEmail(urlEmail);
        setPassword(urlPassword);
        setAutoLogging(false);
      }
    } catch (error) {
      console.error('Auto-login error:', error);
      toast.error("Auto-login encountered an error. Please sign in manually.");
      setAutoLogging(false);
    }
  };

  const handleSuccessfulAuth = async (data: AuthData) => {

    contactsService.clearCache();
    // Fetch user profile data
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('private_integration_token, api_key, location_id, name')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      toast.error("Profile not found. Please contact support.");
      setAutoLogging(false);
      return;
    }

    if (!profile.private_integration_token || !profile.api_key || !profile.location_id) {
      toast.error("API Key and Location ID not configured in your profile. Please contact support.");
      setAutoLogging(false);
      return;
    }

    // Fetch location details to get EagleView credentials
    const credentials: GHLCredentials = {
      pit: profile.private_integration_token,
      apikey: profile.api_key,
      companyId: profile.location_id
    };

    // Store credentials for backward compatibility
    localStorage.setItem("smartroofing_credentials", JSON.stringify(credentials));

    // Set location context
    try {
      await setLocationContext(profile.location_id);
    } catch (error) {
      console.error('Error setting location context:', error);
    }

    navigate('/', { state: { credentials } });
    toast.success(`Welcome ${profile.name || 'back'}!`);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      let authResult;
      if (isSignUp) {
        authResult = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
      } else {
        authResult = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
      }

      const { data, error } = authResult;

      if (error) {
        toast.error(error.message);
        return;
      }

      if (isSignUp && data.user && !data.session) {
        toast.success("Please check your email to confirm your account");
        return;
      }

      if (data.session) {
        await handleSuccessfulAuth(data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen during auto-login
  if (autoLogging) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Logging you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen p-4">
      <div className="grid gap-8 w-full max-w-2xl">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">
              {isSignUp ? 'Sign Up' : 'Sign In'} to Estimator
            </CardTitle>
            <CardDescription>
              {isSignUp ? 'Create a new account' : 'Enter your email and password to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
