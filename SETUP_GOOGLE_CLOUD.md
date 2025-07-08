# Google Cloud SDK Setup & Firebase Storage CORS Configuration

## 🔧 Step 1: Install Google Cloud SDK

### Option A: Using Homebrew (Recommended for macOS)
```bash
# Install Google Cloud SDK
brew install google-cloud-sdk

# Add to PATH if needed
echo 'source "$(brew --prefix)/share/google-cloud-sdk/path.bash.inc"' >> ~/.zshrc
echo 'source "$(brew --prefix)/share/google-cloud-sdk/completion.bash.inc"' >> ~/.zshrc
source ~/.zshrc
```

### Option B: Using curl installer
```bash
# Download and install
curl https://sdk.cloud.google.com | bash

# Restart shell
exec -l $SHELL

# Or manually add to PATH
echo 'source "$HOME/google-cloud-sdk/path.bash.inc"' >> ~/.zshrc
echo 'source "$HOME/google-cloud-sdk/completion.bash.inc"' >> ~/.zshrc
source ~/.zshrc
```

### Verify Installation
```bash
gcloud --version
```

## 🔐 Step 2: Authenticate with Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project syncin-event

# Verify project is set
gcloud config get-value project
```

## 🌐 Step 3: Apply CORS Configuration

```bash
# Navigate to your project directory
cd /Users/chinweiming/Desktop/Projects/VScode/syncin-events

# Apply CORS settings to Firebase Storage
gsutil cors set cors.json gs://syncin-event.firebasestorage.app

# Verify CORS settings were applied
gsutil cors get gs://syncin-event.firebasestorage.app
```

## ✅ Step 4: Test Configuration

### Test URLs Covered:
**Development:**
- `http://localhost:3000`
- `http://localhost:3001` 
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

**Production:**
- `https://syncin-events.vercel.app`
- `https://syncin-events-git-main-chinweimings-projects.vercel.app`
- `https://syncin-events-chinweimings-projects.vercel.app`
- `https://*.vercel.app` (wildcard for any Vercel subdomain)

### After applying CORS:
1. **Clear browser cache** (Cmd+Shift+R or Ctrl+Shift+R)
2. **Reload your app** in both localhost and production
3. **Check Event Album** - images should display properly
4. **Test downloads** - should work without CORS errors

## 🔍 Troubleshooting

### If gcloud command not found after installation:
```bash
# Find where gcloud is installed
which gcloud

# If not found, manually add to PATH
export PATH=$PATH:/Users/$(whoami)/google-cloud-sdk/bin
echo 'export PATH=$PATH:/Users/$(whoami)/google-cloud-sdk/bin' >> ~/.zshrc
source ~/.zshrc
```

### If authentication fails:
```bash
# Clear existing auth and re-authenticate
gcloud auth revoke --all
gcloud auth login
```

### If CORS still not working:
```bash
# Check current CORS settings
gsutil cors get gs://syncin-event.firebasestorage.app

# Re-apply CORS configuration
gsutil cors set cors.json gs://syncin-event.firebasestorage.app
```

### Alternative: Firebase Console Method (if CLI doesn't work)
1. Go to [Google Cloud Console](https://console.cloud.google.com/storage/browser)
2. Select "syncin-event" project
3. Click on the storage bucket
4. Go to "Permissions" tab
5. Add CORS policy manually

## 📝 Expected Output After Success

### CORS Get Command Should Show:
```json
[
  {
    "maxAgeSeconds": 3600,
    "method": ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
    "origin": [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://localhost:3000",
      "https://localhost:3001"
    ],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin", "Access-Control-Allow-Headers"]
  },
  {
    "maxAgeSeconds": 3600,
    "method": ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
    "origin": [
      "https://syncin-events.vercel.app",
      "https://syncin-events-git-main-chinweimings-projects.vercel.app",
      "https://syncin-events-chinweimings-projects.vercel.app",
      "https://*.vercel.app"
    ],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin", "Access-Control-Allow-Headers"]
  }
]
```

### Browser Console Should Show:
- ✅ No more CORS errors
- ✅ Images loading successfully
- ✅ Downloads working properly