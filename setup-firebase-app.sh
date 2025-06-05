#!/bin/bash

# Firebase React App Setup Script
# This script will install Node.js/npm if needed and create the React project

set -e  # Exit on any error

PROJECT_NAME="firebase-mui-app"
NODE_VERSION="18"  # LTS version

echo "🚀 Firebase React App Setup Script"
echo "=================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get OS type
get_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command_exists apt-get; then
            echo "ubuntu"
        elif command_exists yum; then
            echo "centos"
        elif command_exists pacman; then
            echo "arch"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Function to install Node.js on different systems
install_nodejs() {
    local os=$(get_os)
    echo "🔧 Installing Node.js and npm..."
    
    case $os in
        "ubuntu")
            echo "📦 Installing on Ubuntu/Debian..."
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "centos")
            echo "📦 Installing on CentOS/RHEL..."
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
            sudo yum install -y nodejs npm
            ;;
        "arch")
            echo "📦 Installing on Arch Linux..."
            sudo pacman -S nodejs npm
            ;;
        "macos")
            echo "📦 Installing on macOS..."
            if command_exists brew; then
                brew install node
            else
                echo "❌ Homebrew not found. Please install Homebrew first:"
                echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                echo "   Then run this script again."
                exit 1
            fi
            ;;
        "windows")
            echo "📦 Windows detected..."
            echo "Please install Node.js manually from https://nodejs.org/"
            echo "Then run this script again."
            exit 1
            ;;
        *)
            echo "❌ Unsupported operating system. Please install Node.js manually from https://nodejs.org/"
            exit 1
            ;;
    esac
}

# Check if Node.js and npm are installed
echo "🔍 Checking for Node.js and npm..."

if ! command_exists node; then
    echo "❌ Node.js not found."
    install_nodejs
else
    NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 16 ]; then
        echo "⚠️  Node.js version is too old ($(node --version)). Installing newer version..."
        install_nodejs
    else
        echo "✅ Node.js found: $(node --version)"
    fi
fi

if ! command_exists npm; then
    echo "❌ npm not found."
    install_nodejs
else
    echo "✅ npm found: $(npm --version)"
fi

# Verify npx is available (comes with npm 5.2+)
if ! command_exists npx; then
    echo "❌ npx not found. Updating npm..."
    npm install -g npm@latest
fi

echo "✅ npx found: $(npx --version)"

# Check if project directory already exists
if [ -d "$PROJECT_NAME" ]; then
    echo "⚠️  Directory '$PROJECT_NAME' already exists."
    read -p "Do you want to remove it and start fresh? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing existing directory..."
        rm -rf "$PROJECT_NAME"
    else
        echo "❌ Aborted. Please remove the directory manually or choose a different name."
        exit 1
    fi
fi

# Create React app with TypeScript
echo "🏗️  Creating React app with TypeScript..."
# Clear npx cache to ensure we get the latest version
echo "🧹 Clearing npx cache..."
npx clear-npx-cache 2>/dev/null || true
# Use the latest version to avoid version warnings
npx create-react-app@latest "$PROJECT_NAME" --template typescript

# Navigate to project directory
cd "$PROJECT_NAME"

# Install additional dependencies
echo "📦 Installing additional dependencies..."
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material firebase

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p src/components src/contexts src/config

# Create placeholder files with basic content
echo "📝 Creating placeholder files..."

# Firebase config placeholder
cat > src/config/firebase.ts << 'EOF'
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase config object
// Replace these values with your actual Firebase project config
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
EOF

# Create a simple README with next steps
cat > SETUP_INSTRUCTIONS.md << 'EOF'
# Firebase Setup Instructions

## Next Steps:

1. **Set up Firebase Project:**
   - Go to https://console.firebase.google.com/
   - Create a new project
   - Enable Authentication (Email/Password)
   - Enable Firestore Database

2. **Update Firebase Config:**
   - Copy your Firebase config from the Firebase console
   - Replace the placeholder values in `src/config/firebase.ts`

3. **Copy Component Files:**
   - Copy the React component files provided separately
   - Place them in the appropriate directories:
     - `src/components/Login.tsx`
     - `src/components/Dashboard.tsx`
     - `src/contexts/AuthContext.tsx`
     - `src/App.tsx`

4. **Run the Application:**
   ```bash
   npm start
   ```

## Project Structure:
```
src/
├── components/
│   ├── Login.tsx
│   └── Dashboard.tsx
├── contexts/
│   └── AuthContext.tsx
├── config/
│   └── firebase.ts
├── App.tsx
└── index.tsx
```
EOF

echo ""
echo "🎉 Setup completed successfully!"
echo "================================"
echo "📁 Project created: $PROJECT_NAME"
echo "📍 Location: $(pwd)"
echo ""
echo "📋 Next steps:"
echo "1. Set up your Firebase project at https://console.firebase.google.com/"
echo "2. Update src/config/firebase.ts with your Firebase config"
echo "3. Copy the React component files from the previous artifacts"
echo "4. Run 'npm start' to start the development server"
echo ""
echo "📖 See SETUP_INSTRUCTIONS.md for detailed instructions"
echo ""
echo "🚀 Happy coding!"
