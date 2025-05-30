# Spotify "Unknown Error" Troubleshooting Guide

## Error Resolution Summary

The "Unknown error" when accessing `/api/spotify/auth` has been resolved with the following improvements:

### 1. Enhanced Error Handling

**Problem**: Generic "Unknown error" messages provided no debugging information.

**Solution**: Implemented comprehensive error handling with:
- Detailed error messages for each failure scenario
- Proper HTTP status codes
- Helpful suggestions for resolution
- Debug information in development mode

### 2. Parameter Validation

**Problem**: The auth endpoint was accessed directly without required parameters.

**Solution**: Added proper validation with clear error messages:
- Missing `code_challenge` parameter detection
- Missing `state` parameter detection
- Environment configuration validation
- Helpful error responses for direct access

### 3. Debugging Tools

**Problem**: No way to diagnose configuration issues.

**Solution**: Added comprehensive debugging tools:
- `/api/spotify/test` endpoint for diagnostics
- `SpotifyDebugInfo` component for real-time testing
- Detailed logging throughout the auth flow
- Configuration validation and warnings

## Common Error Scenarios and Solutions

### 1. "Missing code_challenge parameter"

**Cause**: Accessing `/api/spotify/auth` directly in browser
**Solution**: This endpoint should only be called programmatically by the Spotify client

**Correct Usage**:
\`\`\`typescript
// Use the spotifyClient to start auth flow
await spotifyClient.startAuthFlow()
\`\`\`

### 2. "Spotify client ID not configured"

**Cause**: Missing `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` environment variable
**Solution**: Set the environment variable in your deployment

**For Vercel**:
1. Go to Project Settings → Environment Variables
2. Add: `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` = `your_spotify_client_id`
3. Redeploy the application

**For Local Development**:
\`\`\`bash
# .env.local
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
\`\`\`

### 3. "Invalid redirect URI"

**Cause**: Redirect URI mismatch in Spotify app settings
**Solution**: Update Spotify app configuration

**Spotify Dashboard Settings**:
- Development: `http://localhost:3000/api/spotify/callback`
- Production: `https://yourdomain.com/api/spotify/callback`

### 4. Network/CORS Issues

**Cause**: Direct API calls to Spotify being blocked
**Solution**: All requests now go through server-side proxy

**Architecture**:
\`\`\`
Client → Next.js API Routes → Spotify API → Response → Client
\`\`\`

## Testing the Fix

### 1. Run Diagnostics

Use the debug component to test your configuration:

1. Open the app in development mode
2. Click "Spotify Debug" button in top-right corner
3. Review the diagnostic results
4. Fix any warnings or errors shown

### 2. Test Auth Flow

1. Click "Test Auth" in the debug panel
2. Should see helpful error message instead of "Unknown error"
3. Use "Connect to Spotify" button for proper auth flow

### 3. Check Console Logs

Monitor browser console for detailed logging:
\`\`\`javascript
// Expected log flow:
// 1. "Starting Spotify OAuth flow"
// 2. "Generated PKCE parameters"
// 3. "Redirecting to server-side auth endpoint"
// 4. "Spotify Authorization Request"
// 5. "Redirecting to Spotify authorization URL"
\`\`\`

## API Endpoint Testing

### Test Configuration
\`\`\`bash
curl http://localhost:3000/api/spotify/test
\`\`\`

**Expected Response**:
\`\`\`json
{
  "status": "healthy",
  "configuration": {
    "hasClientId": true,
    "clientIdLength": 32
  },
  "endpoints": {
    "auth": "http://localhost:3000/api/spotify/auth",
    "callback": "http://localhost:3000/api/spotify/callback"
  }
}
\`\`\`

### Test Auth Endpoint (Should Fail Gracefully)
\`\`\`bash
curl http://localhost:3000/api/spotify/auth
\`\`\`

**Expected Response**:
\`\`\`json
{
  "error": "invalid_request",
  "error_description": "Missing code_challenge parameter. This endpoint should be called programmatically.",
  "help": "Use the Spotify client to initiate authentication flow."
}
\`\`\`

## Environment Setup Checklist

### Required Environment Variables
- ✅ `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` - Your Spotify app's client ID

### Spotify App Configuration
- ✅ Redirect URIs configured correctly
- ✅ Required scopes enabled:
  - `user-read-private`
  - `user-read-email`
  - `playlist-modify-public`
  - `playlist-modify-private`
  - `streaming`

### Deployment Configuration
- ✅ HTTPS enabled in production
- ✅ Environment variables set in deployment platform
- ✅ Correct redirect URIs for each environment

## Monitoring and Maintenance

### Key Metrics to Monitor
1. **Auth Success Rate**: Should be >95%
2. **Error Rate**: Should be <5%
3. **Response Times**: Auth flow should complete in <10 seconds

### Regular Checks
1. Monitor error logs for new issues
2. Test auth flow across different browsers
3. Verify environment variables are set correctly
4. Check Spotify app configuration hasn't changed

## Support and Debugging

### Development Mode Features
- Comprehensive console logging
- Debug component with real-time diagnostics
- Detailed error messages with suggestions
- Test endpoints for configuration validation

### Production Mode Features
- Structured error logging
- User-friendly error messages
- Graceful error recovery
- Performance monitoring

The implementation now provides clear, actionable error messages instead of generic "Unknown error" responses, making it much easier to diagnose and resolve issues.
\`\`\`

The revised implementation addresses the "Unknown error" by:

1. **Adding comprehensive error handling** with specific error messages for each scenario
2. **Implementing proper parameter validation** with helpful error responses
3. **Creating debugging tools** to identify configuration issues
4. **Providing clear documentation** for troubleshooting common problems

The auth endpoint now returns meaningful error messages when accessed incorrectly, and the debug tools help identify any configuration issues quickly.
