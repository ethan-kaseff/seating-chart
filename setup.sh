#!/bin/bash
set -e

echo "🚀 Seating Chart - Vercel Setup"
echo "================================"

# Check if logged in
if ! vercel whoami &>/dev/null; then
  echo "❌ Not logged in to Vercel. Run: vercel login"
  exit 1
fi

echo "✓ Logged in as: $(vercel whoami)"

# Step 1: Link project to Vercel
echo ""
echo "📦 Step 1: Linking project to Vercel..."
if [ ! -d ".vercel" ]; then
  vercel link --yes
else
  echo "✓ Already linked"
fi

# Step 2: Create Postgres database
echo ""
echo "🗄️  Step 2: Creating Postgres database..."
echo "   (This may prompt you to select a region)"

# Check if database already exists by looking for env vars
if vercel env ls 2>/dev/null | grep -q "POSTGRES_URL"; then
  echo "✓ Database already configured"
else
  vercel postgres create seating-chart-db --yes 2>/dev/null || echo "Database may already exist, continuing..."
fi

# Step 3: Pull environment variables
echo ""
echo "🔐 Step 3: Pulling environment variables..."
vercel env pull .env.local --yes

# Step 4: Add NEXTAUTH_SECRET if not exists
echo ""
echo "🔑 Step 4: Setting up NEXTAUTH_SECRET..."
if ! grep -q "NEXTAUTH_SECRET" .env.local 2>/dev/null; then
  SECRET=$(openssl rand -base64 32)
  echo "NEXTAUTH_SECRET=$SECRET" >> .env.local
  # Also add to Vercel
  echo "$SECRET" | vercel env add NEXTAUTH_SECRET production --yes
  echo "$SECRET" | vercel env add NEXTAUTH_SECRET preview --yes
  echo "$SECRET" | vercel env add NEXTAUTH_SECRET development --yes
  echo "✓ NEXTAUTH_SECRET added"
else
  echo "✓ NEXTAUTH_SECRET already exists"
fi

# Step 5: Show database seeding instructions
echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Seed the database by running:"
echo "   npm run db:seed"
echo ""
echo "2. Start the dev server:"
echo "   npm run dev"
echo ""
echo "3. Deploy to production:"
echo "   vercel --prod"
echo ""
echo "🔑 Test login: guest@test.com / guest123"
