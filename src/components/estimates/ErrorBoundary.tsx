import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Bug, ExternalLink } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error?: Error;
    resetError: () => void;
    errorInfo?: React.ErrorInfo;
  }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
            errorInfo={this.state.errorInfo}
          />
        );
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetError={this.resetError}
          errorInfo={this.state.errorInfo}
        />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error?: Error;
  resetError: () => void;
  errorInfo?: React.ErrorInfo;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  resetError,
  errorInfo
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const copyErrorDetails = () => {
    const details = {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    };
    
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">Something went wrong</h3>
                <p className="text-sm mt-1">
                  The estimate editor encountered an unexpected error. 
                  Your data has been preserved and you can try reloading the component.
                </p>
              </div>

              {error && (
                <div className="bg-muted/50 p-3 rounded text-xs font-mono">
                  <strong>Error:</strong> {error.message}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button onClick={resetError} size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="gap-2"
                >
                  <Bug className="h-4 w-4" />
                  {showDetails ? 'Hide' : 'Show'} details
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyErrorDetails}
                  className="gap-2"
                >
                  Copy error info
                </Button>
              </div>

              {showDetails && (
                <div className="mt-4 space-y-3">
                  {error?.stack && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Stack Trace:</h4>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {errorInfo?.componentStack && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Component Stack:</h4>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export { ErrorBoundary, DefaultErrorFallback };
export type { ErrorBoundaryProps, DefaultErrorFallbackProps };