# Eagleview OAuth Implementation

This implementation follows the OAuth 2.0 Authorization Code flow with PKCE (Proof Key for Code Exchange) for secure authentication with Eagleview's API.

## Architecture

### Components

1. **OAuth Service** (`src/services/eagleview/oauth-service.ts`)
   - Client-side service for managing OAuth flow
   - Generates state parameter for CSRF protection
   - Handles token exchange directly with Eagleview
   - Manages token caching and validation
   - Implements token refresh using refresh_token

2. **Settings UI** (`src/components/settings/EagleViewOAuthSettings.tsx`)
   - User interface for connecting/disconnecting Eagleview
   - Shows connection status
   - Handles OAuth callback by exchanging code for token
   - Displays errors and manages the token exchange flow

## OAuth Flow

```
┌─────────┐                                  ┌──────────┐                              ┌──────────────┐
│  User   │                                  │   App    │                              │  Eagleview   │
└────┬────┘                                  └────┬─────┘                              └──────┬───────┘
     │                                            │                                            │
     │  1. Click "Connect to Eagleview"          │                                            │
     ├──────────────────────────────────────────>│                                            │
     │                                            │                                            │
     │                                            │  2. Generate state parameter              │
     │                                            │     (for CSRF protection)                 │
     │                                            │  3. Generate PKCE code_verifier           │
     │                                            │     and code_challenge                    │
     │                                            │                                            │
     │  4. Redirect to Eagleview OAuth page      │                                            │
     │    with client_id, redirect_uri, state,   │                                            │
     │    scope, code_challenge, and             │                                            │
     │    code_challenge_method (S256)           │                                            │
     │<───────────────────────────────────────────┤                                            │
     │                                            │                                            │
     │  5. Login and approve                     │                                            │
     ├───────────────────────────────────────────────────────────────────────────────────────>│
     │                                            │                                            │
     │  6. Redirect to callback URL              │                                            │
     │    with authorization code and state      │                                            │
     │<───────────────────────────────────────────────────────────────────────────────────────┤
     │                                            │                                            │
     │  7. User lands on /settings page          │                                            │
     │     App detects code in URL params        │                                            │
     ├──────────────────────────────────────────>│                                            │
     │                                            │                                            │
     │                                            │  8. App exchanges code for token          │
     │                                            │     POST to Eagleview token endpoint      │
     │                                            │     with code, client_id, and             │
     │                                            │     code_verifier (no secret needed)      │
     │                                            ├───────────────────────────────────────────>│
     │                                            │                                            │
     │                                            │  9. Eagleview validates code_verifier     │
     │                                            │     against code_challenge and returns:   │
     │                                            │      - access_token                       │
     │                                            │      - refresh_token                      │
     │                                            │      - id_token                           │
     │                                            │      - expires_in (3600 seconds)          │
     │                                            │<───────────────────────────────────────────┤
     │                                            │                                            │
     │                                            │  10. Token cached in localStorage         │
     │                                            │      Refresh token stored in database     │
     │                                            │      URL params and PKCE data cleaned up  │
     │  11. Connection successful                │                                            │
     │<───────────────────────────────────────────┤                                            │
     │                                            │                                            │
```

## Setup Instructions

### 1. Configure Redirect URI in Eagleview

In your Eagleview developer account, configure the OAuth redirect URI to point to your settings page:

**Production:**
```
https://yourdomain.com/settings
```

**Local Development:**
```
http://localhost:5173/settings
```

**Note:** Eagleview does not support query parameters in redirect URIs. The app uses localStorage to remember which section the user was on and automatically restores it after OAuth callback.

### 2. Store Client ID

Store your Eagleview Client ID in the `user_profiles` table:
- `eagleview_api_client_id`

**Note:** With PKCE flow, the client secret is not required. The code verifier and code challenge provide the security instead.

## Usage

### Connecting to Eagleview

1. Navigate to Settings → Eagleview Integration
2. Click "Connect to Eagleview"
3. Login to Eagleview and approve the authorization
4. Eagleview redirects back to Settings page with authorization code
5. The app automatically exchanges the code for an access token
6. Connection status updates to "Connected"

### Using the Access Token

```typescript
import { eagleViewOAuthService } from "@/services/eagleview/oauth-service";

// Check if authorized
if (eagleViewOAuthService.isAuthorized()) {
  // Get access token for API calls
  const token = await eagleViewOAuthService.getAccessToken();
  
  // Use token in your API requests
  const response = await fetch("https://apicenter.eagleview.com/api/v1/...", {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
}
```

### Updating Measurement Service

Update `src/services/eagleview/measurement-orders-service.ts` to use OAuth tokens:

```typescript
import { eagleViewOAuthService } from "./oauth-service";
import { eagleViewAuthService } from "./auth-service"; // fallback to client credentials

export const getAccessToken = async (): Promise<string> => {
  // Try OAuth first
  if (eagleViewOAuthService.isAuthorized()) {
    try {
      return await eagleViewOAuthService.getAccessToken();
    } catch (error) {
      console.warn("OAuth token failed, falling back to client credentials:", error);
    }
  }
  
  // Fallback to client credentials flow
  return await eagleViewAuthService.getAccessToken();
};
```

## Security Features

### PKCE (Proof Key for Code Exchange)

- Code verifier: Random 43-128 character string generated for each authorization
- Code challenge: SHA-256 hash of code verifier, base64url-encoded
- Prevents authorization code interception attacks
- More secure than client secret for public clients

### State Parameter

- Random string generated and stored before authorization
- Verified on callback to prevent CSRF attacks

### Token Storage

- Access tokens cached in localStorage with expiration
- Refresh tokens stored securely in Supabase database
- 5-minute buffer before expiration for automatic refresh
- Tokens cleared on disconnect or error
- PKCE code verifier cleared after successful token exchange

### Scopes

Default scopes requested:
- `openid`: OpenID Connect identity
- `Order`: Place and manage orders
- `AdjustOrder`: Adjust existing orders
- `Download_Report`: Download measurement reports
- `getReportDetail`: Get detailed report information
- `offline_access`: Request refresh token for token renewal

## API Reference

### eagleViewOAuthService

#### `initiateAuthorization(clientId: string, scopes?: string[]): Promise<void>`
Starts the OAuth flow with PKCE by:
1. Generating a random state parameter for CSRF protection
2. Generating a code verifier (64 characters)
3. Creating a code challenge (SHA-256 hash of verifier, base64url-encoded)
4. Storing state and code verifier in localStorage
5. Redirecting to Eagleview's authorization page with code_challenge and code_challenge_method=S256

- Default scopes: `"openid Order AdjustOrder Download_Report getReportDetail offline_access"`

#### `exchangeCodeForToken(code: string, clientId: string, state?: string): Promise<EagleViewOAuthToken>`
Exchanges authorization code for access token using PKCE:
1. Verifies state parameter against stored value
2. Retrieves code verifier from localStorage
3. Sends POST request with code, client_id, and code_verifier (no client secret)
4. Caches access token in localStorage
5. Stores refresh token in database
6. Cleans up state and code verifier

#### `getCachedToken(): EagleViewOAuthToken | null`
Retrieves cached token if valid (checks expiration with 5-minute buffer).

#### `isAuthorized(): Promise<boolean>`
Checks if user has valid OAuth token or can refresh it.

#### `getAccessToken(): Promise<string>`
Returns access token for API calls. Automatically attempts refresh if token is expired.

#### `refreshToken(): Promise<EagleViewOAuthToken>`
Refreshes access token using refresh_token grant:
1. Fetches refresh_token and client_id from database
2. Sends POST request with grant_type=refresh_token, refresh_token, and client_id
3. Updates cached token and refresh token in database

#### `clearTokenCache(): void`
Clears all OAuth-related data from localStorage (access token, state, code verifier).

#### `clearRefreshToken(): Promise<void>`
Clears refresh token from database.

## Troubleshooting

### "Invalid OAuth state parameter"
- This indicates a potential CSRF attack or session issue
- Clear localStorage and reconnect
- Ensure state is being properly stored and verified

### "Token exchange failed"
- Verify client credentials are correct in GHL settings
- Check browser console for detailed error messages
- Ensure redirect URI matches Eagleview configuration exactly
- Check for CORS issues in browser network tab

### Authorization loop (keeps redirecting)
- Clear localStorage: `localStorage.clear()`
- Check browser console for errors
- Verify client credentials are correct

### Token expired
- Use the refresh_token to get a new access_token
- The service automatically handles token expiration with 5-minute buffer

## Next Steps

1. ✅ OAuth Authorization Code flow with PKCE implemented
2. ✅ Refresh token support implemented
3. ✅ Automatic token refresh before expiration
4. ✅ Automatic token refresh on API 401 errors
5. Handle token revocation
6. Add user profile fetching from Eagleview (using id_token)
7. Monitor and log token refresh failures

## References

- [Eagleview OAuth Documentation](https://developer.eagleview.com/documentation/authentication-methods/v1/authorization-code)
- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749)
- [OAuth 2.0 Authorization Code Flow](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
