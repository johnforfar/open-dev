#!/bin/bash

# 🔄 OpenDev IDE Integration Script
# Integrates local development features into xnode-manager-frontend

set -e

FRONTEND_DIR="../openmesh-network/xnode-manager-frontend/nextjs-app"
CUSTOM_DIR="."

echo "🚀 Starting OpenDev IDE integration..."

# Check if frontend exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

echo "📁 Frontend directory: $FRONTEND_DIR"
echo "🔧 Custom components: $CUSTOM_DIR"

# 1. Create local development components directory
echo "📂 Creating local dev components..."
mkdir -p "$FRONTEND_DIR/components/local-dev"

# 2. Copy custom components
echo "📋 Copying custom components..."
cp -r "$CUSTOM_DIR/components/"* "$FRONTEND_DIR/components/local-dev/" 2>/dev/null || true

# 3. Create local development hooks
echo "🎣 Creating custom hooks..."
mkdir -p "$FRONTEND_DIR/hooks/local-dev"
cp -r "$CUSTOM_DIR/hooks/"* "$FRONTEND_DIR/hooks/local-dev/" 2>/dev/null || true

# 4. Create local development API routes
echo "🔌 Creating local dev API routes..."
mkdir -p "$FRONTEND_DIR/app/api/local-dev"
cp -r "$CUSTOM_DIR/api/"* "$FRONTEND_DIR/app/api/local-dev/" 2>/dev/null || true

# 5. Create local development pages
echo "📄 Creating local dev pages..."
mkdir -p "$FRONTEND_DIR/app/local-dev"
cp -r "$CUSTOM_DIR/pages/"* "$FRONTEND_DIR/app/local-dev/" 2>/dev/null || true

# 6. Create local development utilities
echo "🛠️ Creating local dev utilities..."
mkdir -p "$FRONTEND_DIR/lib/local-dev"
cp -r "$CUSTOM_DIR/utils/"* "$FRONTEND_DIR/lib/local-dev/" 2>/dev/null || true

# 7. Modify existing components to include local dev features
echo "🔧 Modifying existing components..."

# Modify the main layout to include local dev detection
if [ -f "$FRONTEND_DIR/app/layout.tsx" ]; then
    echo "📱 Modifying main layout..."
    # Add local dev detection logic
    sed -i '' 's/export default function RootLayout/import { LocalDevProvider } from "..\/components\/local-dev\/LocalDevProvider";\n\nexport default function RootLayout/' "$FRONTEND_DIR/app/layout.tsx"
    sed -i '' 's/<body>/<body>\n        <LocalDevProvider>/' "$FRONTEND_DIR/app/layout.tsx"
    sed -i '' 's/<\/body>/        <\/LocalDevProvider>\n      <\/body>/' "$FRONTEND_DIR/app/layout.tsx"
fi

# Modify the xnodes page to show local VMs
if [ -f "$FRONTEND_DIR/app/xnodes/page.tsx" ]; then
    echo "🖥️ Modifying xnodes page..."
    # Add local VM detection and display
    sed -i '' 's/import { useXnodes }/import { useXnodes } from "..\/..\/hooks\/useXnodes";\nimport { useLocalVMs } from "..\/..\/hooks\/local-dev\/useLocalVMs";/' "$FRONTEND_DIR/app/xnodes/page.tsx"
fi

# 8. Install additional dependencies if needed
echo "📦 Installing additional dependencies..."
cd "$FRONTEND_DIR"
npm install --save-dev @types/node 2>/dev/null || true

echo "✅ Integration complete!"
echo "🚀 Run 'make dev' to start the enhanced frontend"
echo "🔧 Local development features are now integrated into the existing UI"
