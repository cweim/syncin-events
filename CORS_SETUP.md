# Firebase Storage CORS Setup

## Problem
Images are showing as black and downloads are failing due to CORS restrictions:
```
Origin http://localhost:3001 is not allowed by Access-Control-Allow-Origin
```

## Solution

### Step 1: Install Google Cloud SDK
```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### Step 2: Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project syncin-event
```

### Step 3: Apply CORS Configuration
```bash
# Navigate to your project directory
cd /Users/chinweiming/Desktop/Projects/VScode/syncin-events

# Apply the CORS configuration
gsutil cors set cors.json gs://syncin-event.firebasestorage.app
```

### Step 4: Verify CORS Configuration
```bash
# Check current CORS settings
gsutil cors get gs://syncin-event.firebasestorage.app
```

## Alternative: Firebase Console Method

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select "syncin-event" project
3. Go to Storage → Rules
4. Update storage rules to be more permissive (temporary for testing):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Test After Setup

1. Clear browser cache
2. Reload the Event Album page
3. Images should load properly
4. Downloads should work

## Production Domains to Add Later

When deploying to production, add these domains to cors.json:
- `https://your-custom-domain.com`
- `https://syncin-events.vercel.app`
- `https://*.vercel.app`