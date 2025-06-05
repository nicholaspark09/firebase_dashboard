# Firebase Environment Configuration Setup

## Step-by-Step Guide

### 1. Create Environment File

In your project root directory (where `package.json` is located), create a file called `.env.local`:

```bash
touch .env.local
```

### 2. Add Firebase Configuration

Copy your Firebase config values into `.env.local`:

```bash
REACT_APP_FIREBASE_API_KEY=AIzaSyC4j8k9L2mN3o4P5q6R7s8T9u0V1w2X3y4Z
REACT_APP_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=my-project-12345
REACT_APP_FIREBASE_STORAGE_BUCKET=my-project-12345.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789012345
```

### 3. Get Your Firebase Config Values

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → "Project settings"
4. Scroll down to "Your apps" section
5. Click on your web app or add a new web app
6. Copy the config values from the `firebaseConfig` object

### 4. Important Notes

- **File naming**: Use `.env.local` (not just `.env`) for local development
- **Prefix requirement**: All variables MUST start with `REACT_APP_` to be accessible in React
- **No quotes**: Don't wrap values in quotes in the .env file
- **No spaces**: No spaces around the `=` sign

### 5. Security Best Practices

✅ **DO:**
- Use `.env.local` for local development
- Add `.env.local` to your `.gitignore` file
- Use different environment files for different environments

❌ **DON'T:**
- Commit `.env.local` to git
- Share your `.env.local` file publicly
- Use these variables for server-side secrets (they're visible in the browser)

### 6. Different Environment Files

For different environments, you can use:

- `.env.local` - Local development (highest priority)
- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env` - Default fallback

### 7. Verify Setup

After creating your `.env.local` file, restart your development server:

```bash
npm start
```

If there are missing environment variables, the app will show a clear error message telling you which ones are missing.

### 8. Example .env.local File

```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyC4j8k9L2mN3o4P5q6R7s8T9u0V1w2X3y4Z
REACT_APP_FIREBASE_AUTH_DOMAIN=my-awesome-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=my-awesome-app-12345
REACT_APP_FIREBASE_STORAGE_BUCKET=my-awesome-app-12345.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=987654321098
REACT_APP_FIREBASE_APP_ID=1:987654321098:web:1234567890abcdef123456

# Optional: If using Firebase Analytics
# REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 9. Troubleshooting

**Problem: "Missing required environment variables" error**
- Check that your `.env.local` file is in the project root
- Verify all variable names start with `REACT_APP_`
- Restart your development server after making changes

**Problem: Variables showing as undefined**
- Make sure there are no typos in variable names
- Check that there are no extra spaces in your `.env.local` file
- Ensure you're not wrapping values in quotes