# Production Deployment Guide for Playlist Time Machine

This guide will help you deploy the Playlist Time Machine application to your production domain at https://playlisttimemachine.com.

## Spotify Configuration

### 1. Spotify Developer Dashboard Setup

1. Log in to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your "Playlist Time Machine" app
3. Click "Edit Settings"
4. Add the following Redirect URIs:
   - `https://playlisttimemachine.com/api/spotify/callback`
   - `https://playlisttimemachine.com/callback`
5. Save your changes
6. Note your Client ID: `20db563517e94795a0ab1ebd2bbb5607`

### 2. Environment Variables

When deploying to your hosting platform, set the following environment variables:

\`\`\`
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=20db563517e94795a0ab1ebd2bbb5607
\`\`\`

## Deployment Checklist

- [ ] Spotify Client ID is set in environment variables
- [ ] Redirect URIs are configured in Spotify Developer Dashboard
- [ ] HTTPS is enabled for your domain
- [ ] Database connection is configured (if applicable)
- [ ] All API routes are working correctly

## Testing the Deployment

1. Visit https://playlisttimemachine.com/spotify-debug to verify your configuration
2. Test the authentication flow by clicking "Connect to Spotify"
3. Verify that playlist creation works correctly

## Troubleshooting

If you encounter the "INVALID_CLIENT: Invalid redirect URI" error:

1. Double-check that the exact redirect URIs are added to your Spotify app
2. Ensure there are no trailing slashes in the URIs
3. Verify that your Client ID is correct
4. Check that you're using HTTPS in production
5. Clear your browser cache and cookies
6. Wait 5-10 minutes for Spotify's systems to update

## Support

If you continue to experience issues, please check the server logs for detailed error messages or contact Spotify Developer Support.
