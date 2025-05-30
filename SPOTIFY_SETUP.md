# Spotify Integration Setup

To enable Spotify playlist creation, you need to set up a Spotify app and configure environment variables.

## Step 1: Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the details:
   - **App Name**: Playlist Time Machine
   - **App Description**: Generate playlists from Billboard #1 hits
   - **Website**: Your deployed app URL
   - **Redirect URI**: `https://your-domain.com/callback` (replace with your actual domain)
5. Check the boxes for the terms of service
6. Click "Save"

## Step 2: Get Your Client ID

1. In your newly created app, you'll see the **Client ID**
2. Copy this value

## Step 3: Configure Environment Variables

### For Vercel Deployment:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add a new environment variable:
   - **Name**: `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`
   - **Value**: Your Spotify Client ID from Step 2
   - **Environment**: Production (and Preview if you want)
4. Click "Save"
5. Redeploy your application

### For Local Development:

1. Create a `.env.local` file in your project root
2. Add the following line:
   \`\`\`
   NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   \`\`\`
3. Replace `your_spotify_client_id_here` with your actual Client ID
4. Restart your development server

## Step 4: Update Redirect URI

Make sure your Spotify app's redirect URI matches your deployed domain:
- Production: `https://your-domain.com/callback`
- Local development: `http://localhost:3000/callback`

## Troubleshooting

### "INVALID_CLIENT" Error
- Double-check that your Client ID is correct
- Ensure the environment variable is properly set and deployed
- Verify that the redirect URI in your Spotify app matches exactly

### "Invalid Redirect URI" Error
- Make sure the redirect URI in your Spotify app settings matches your domain
- Check that there are no trailing slashes or typos

### Environment Variable Not Found
- Ensure you're using `NEXT_PUBLIC_` prefix for client-side variables
- Redeploy after adding environment variables in Vercel
- Check that the variable name matches exactly
