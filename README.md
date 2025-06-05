# Firebase Configuration Dashboard

A comprehensive React dashboard for managing Firebase-based application configurations including feature flags, beta user management, and configuration history with rollback capabilities.

## Features

- 🚩 **Feature Flags Management**: Toggle boolean feature flags with real-time updates
- 👥 **Beta User Management**: Manage beta feature access for specific users
- 📊 **Configuration History**: Complete audit trail with diff view and rollback functionality
- 🔐 **Authentication**: Google OAuth and email/password sign-in
- 📱 **Responsive Design**: Material-UI components with mobile-friendly layout
- ⚡ **Real-time Updates**: Live synchronization across all connected clients

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **UI Library**: Material-UI (MUI) v5
- **Backend**: Firebase (Firestore + Authentication)
- **State Management**: React Context + Hooks
- **Real-time**: Firebase Firestore real-time listeners

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Firebase project with Firestore and Authentication enabled

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd firebase-config-dashboard
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your Firebase configuration:
   ```bash
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Google Analytics (optional)

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Enable **Google** provider
4. Add your domain to authorized domains for production

### 3. Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (we'll update security rules later)
3. Select your preferred location

### 4. Set Up Firestore Security Rules

Replace the default rules with these production-ready rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User-specific data
    match /users/{userId}/items/{document} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Configuration documents - admin access only
    match /android_config/{document} {
      // Allow read access to all authenticated users (for apps to read configs)
      allow read: if request.auth != null;
      
      // Allow write access only to specific admin emails
      allow write: if request.auth != null && 
        request.auth.token.email in [
          'admin@yourdomain.com',
          'developer@yourdomain.com',
          'manager@yourdomain.com'
        ];
    }
    
    // Configuration history - admin access only
    match /config_versions/{document} {
      allow read, write: if request.auth != null && 
        request.auth.token.email in [
          'admin@yourdomain.com',
          'developer@yourdomain.com',
          'manager@yourdomain.com'
        ];
    }
  }
}
```

**Important**: Replace the email addresses with your actual admin emails.

## Firebase Data Structure

The application uses the following Firestore structure:

### Configuration Documents

```
android_config/
├── feature_flags
│   ├── dashboard_v2: true
│   ├── dark_mode: false
│   └── new_ui: true
└── beta_users
    ├── weather_v2: "user1@email.com,user2@email.com"
    ├── premium_features: "admin@company.com"
    └── new_dashboard: ""
```

### User Data

```
users/{userId}/
└── items/{itemId}
    ├── title: "Example Item"
    ├── description: "Item description"
    └── createdAt: timestamp
```

### Configuration History

```
config_versions/
└── history
    └── snapshots
        └── {snapshotId}
            ├── id: "feature_flags_1733456789000"
            ├── timestamp: "2025-06-05T14:30:00Z"
            ├── author: "admin@company.com"
            ├── configType: "feature_flags"
            ├── action: "update"
            ├── description: "Enabled dark mode"
            ├── previousSnapshot: {...}
            ├── currentSnapshot: {...}
            └── changes: {added: [], modified: {}, removed: []}
```

## Environment Configuration

### Development Environment

Create `.env.local`:
```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-dev-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-dev-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-dev-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-dev-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-dev-app-id
```

### Production Environment

Create `.env.production`:
```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-prod-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-prod-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-prod-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=987654321
REACT_APP_FIREBASE_APP_ID=your-prod-app-id
```

### Environment Best Practices

1. **Separate Firebase Projects**: Use different Firebase projects for dev/staging/production
2. **Environment-Specific Rules**: Adjust Firestore security rules per environment
3. **Admin Access**: Configure different admin email lists for each environment
4. **Domain Authorization**: Add appropriate domains to Firebase Auth settings

## Security Setup

### 1. Admin Access Control

Update the Firestore security rules with your admin email addresses:

```javascript
// Replace these with your actual admin emails
request.auth.token.email in [
  'john.doe@yourcompany.com',
  'jane.smith@yourcompany.com',
  'admin@yourcompany.com'
]
```

### 2. Production Security Checklist

- [ ] Update Firestore security rules with real admin emails
- [ ] Remove test mode from Firestore
- [ ] Add production domain to Firebase Auth authorized domains
- [ ] Enable Firebase App Check for additional security
- [ ] Set up Firebase Security Rules unit tests
- [ ] Configure Firebase Monitoring and Alerting

### 3. API Security

- [ ] Restrict Firebase API keys to specific domains
- [ ] Enable Firestore security rules testing
- [ ] Monitor Firebase usage and set up billing alerts
- [ ] Regular security rule audits

## Available Scripts

### Development

```bash
npm start          # Start development server
npm test           # Run test suite
npm run build      # Build for production
npm run eject      # Eject from Create React App (one-way operation)
```

### Firebase Deployment

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## Application Components

### Dashboard Layout

- **Feature Flags Widget**: Manage boolean feature toggles
- **Beta Features Widget**: Control user access to beta features
- **Configuration History Widget**: View change history and perform rollbacks
- **User Statistics**: Display user metrics and activity
- **User Profile**: Account information and settings

### Key Features

#### Feature Flags Management
- Add/remove feature flags
- Toggle flags on/off
- Rename flags
- Real-time synchronization

#### Beta User Management
- Create beta feature groups
- Add/remove users from beta groups
- Manage comma-separated user lists
- Email validation

#### Configuration History
- Complete audit trail of all changes
- Before/after state comparison
- One-click rollback functionality
- Change attribution and timestamps

## Deployment

### Firebase Hosting

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Firebase Hosting:**
   ```bash
   firebase init hosting
   ```

3. **Build and Deploy:**
   ```bash
   npm run build
   firebase deploy
   ```

### Alternative Deployments

- **Vercel**: Connect GitHub repo for automatic deployments
- **Netlify**: Drag and drop `build` folder or connect repository
- **AWS S3 + CloudFront**: Host static files with CDN

## Troubleshooting

### Common Issues

**Firebase Connection Errors:**
- Verify API keys in `.env.local`
- Check Firestore security rules
- Ensure authentication is enabled

**Permission Denied:**
- Add your email to admin list in security rules
- Verify you're signed in with correct account
- Check that Firestore rules are deployed

**Real-time Updates Not Working:**
- Check browser console for errors
- Verify Firestore listeners are active
- Ensure network connectivity

### Debug Mode

Add to `.env.local` for additional logging:
```bash
REACT_APP_DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Review [Material-UI Documentation](https://mui.com/getting-started/installation/)

---

## Learn More

- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React Documentation](https://reactjs.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Material-UI Documentation](https://mui.com/)