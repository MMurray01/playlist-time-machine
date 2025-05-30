# Fixing 'INVALID_CLIENT: Invalid redirect URI' Error

## Root Causes

The 'INVALID_CLIENT: Invalid redirect URI' error occurs when:

1. **Redirect URI Mismatch**: The redirect URI in your Spotify app settings doesn't exactly match what your application sends
2. **Missing Redirect URIs**: Required redirect URIs aren't configured in your Spotify app
3. **Protocol Mismatch**: HTTP vs HTTPS differences between environments
4. **Trailing Slash Issues**: Presence or absence of trailing slashes
5. **Case Sensitivity**: Differences in capitalization

## Current Application Flow

Our app uses this redirect flow:
1. User clicks "Connect to Spotify" 
2. App redirects to `/api/spotify/auth` (our server endpoint)
3. Server redirects to Spotify with redirect_uri = `https://yourdomain.com/api/spotify/callback`
4. Spotify redirects back to `/api/spotify/callback`
5. Server processes the callback and redirects to `/callback` (client page)

## Required Spotify App Configuration

### Step 1: Access Your Spotify App Settings

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in and select your "Playlist Time Machine" app
3. Click "Settings" or "Edit Settings"

### Step 2: Configure Redirect URIs

Add ALL of these redirect URIs to your Spotify app (exact URLs, no trailing slashes):

**For Production:**
\`\`\`
https://yourdomain.com/api/spotify/callback
https://yourdomain.com/callback
\`\`\`

**For Development:**
\`\`\`
http://localhost:3000/api/spotify/callback
http://localhost:3000/callback
\`\`\`

**For Vercel Preview Deployments:**
\`\`\`
https://your-app-git-main-username.vercel.app/api/spotify/callback
https://your-app-git-main-username.vercel.app/callback
\`\`\`

### Step 3: Replace with Your Actual Domain

Replace `yourdomain.com` with your actual deployed domain. For example:
- `https://playlist-time-machine.vercel.app/api/spotify/callback`
- `https://playlist-time-machine.vercel.app/callback`

## Common Mistakes to Avoid

❌ **Don't add trailing slashes:**
- Wrong: `https://yourdomain.com/api/spotify/callback/`
- Correct: `https://yourdomain.com/api/spotify/callback`

❌ **Don't mix protocols:**
- Use `https://` for production
- Use `http://` only for localhost

❌ **Don't forget both URIs:**
- You need BOTH `/api/spotify/callback` AND `/callback`

❌ **Don't use wildcards:**
- Spotify doesn't support wildcard redirect URIs

## Verification Steps

### 1. Check Your Current Domain
\`\`\`bash
# In your browser console on your deployed app:
console.log(window.location.origin)
# Use this exact origin for your redirect URIs
\`\`\`

### 2. Test the Configuration
After updating your Spotify app settings:
1. Wait 5-10 minutes for changes to propagate
2. Clear your browser cache
3. Try the Spotify connection again

### 3. Debug Redirect URI Issues
Check the browser network tab when the error occurs:
1. Look for the request to Spotify's authorize endpoint
2. Check the `redirect_uri` parameter in the URL
3. Ensure it exactly matches one of your configured URIs

## Environment-Specific Solutions

### Local Development
\`\`\`
Redirect URIs to add:
- http://localhost:3000/api/spotify/callback
- http://localhost:3000/callback
\`\`\`

### Vercel Production
\`\`\`
Redirect URIs to add:
- https://your-app.vercel.app/api/spotify/callback
- https://your-app.vercel.app/callback
\`\`\`

### Custom Domain
\`\`\`
Redirect URIs to add:
- https://yourdomain.com/api/spotify/callback
- https://yourdomain.com/callback
\`\`\`

## Troubleshooting Checklist

- [ ] Spotify app has correct redirect URIs configured
- [ ] No trailing slashes in redirect URIs
- [ ] Correct protocol (http for localhost, https for production)
- [ ] Both `/api/spotify/callback` and `/callback` URIs added
- [ ] Waited 5-10 minutes after making changes
- [ ] Cleared browser cache
- [ ] Environment variable `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` is set correctly
- [ ] Using the correct Spotify Client ID

## Quick Fix Commands

If you're using Vercel, you can check your current deployment URL:
\`\`\`bash
vercel ls
# Use the URL from this command for your redirect URIs
\`\`\`

## Still Having Issues?

1. **Double-check the Client ID**: Ensure `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` matches your Spotify app
2. **Check for typos**: Even small typos in redirect URIs will cause this error
3. **Try incognito mode**: Sometimes cached auth state causes issues
4. **Contact Spotify**: If all else fails, Spotify Developer Support can verify your app configuration
