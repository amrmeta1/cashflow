#!/bin/bash

# Add environment variables to all environments (Production, Preview, Development)

echo "Adding NEXT_PUBLIC_DEV_SKIP_AUTH to preview..."
yes "" | vercel env add NEXT_PUBLIC_DEV_SKIP_AUTH preview <<EOF
true
EOF

echo "Adding NEXT_PUBLIC_DEV_SKIP_AUTH to development..."
yes "" | vercel env add NEXT_PUBLIC_DEV_SKIP_AUTH development <<EOF
true
EOF

echo "Adding NEXT_PUBLIC_ENABLE_MOCKS to preview..."
yes "" | vercel env add NEXT_PUBLIC_ENABLE_MOCKS preview <<EOF
true
EOF

echo "Adding NEXT_PUBLIC_ENABLE_MOCKS to development..."
yes "" | vercel env add NEXT_PUBLIC_ENABLE_MOCKS development <<EOF
true
EOF

echo "Adding NEXT_PUBLIC_API_BASE_URL to preview..."
yes "" | vercel env add NEXT_PUBLIC_API_BASE_URL preview <<EOF
https://api.tadfuq.com
EOF

echo "Adding NEXT_PUBLIC_API_BASE_URL to development..."
yes "" | vercel env add NEXT_PUBLIC_API_BASE_URL development <<EOF
https://api.tadfuq.com
EOF

echo "Adding NEXT_PUBLIC_INGESTION_API_BASE_URL to preview..."
yes "" | vercel env add NEXT_PUBLIC_INGESTION_API_BASE_URL preview <<EOF
https://ingestion.tadfuq.com
EOF

echo "Adding NEXT_PUBLIC_INGESTION_API_BASE_URL to development..."
yes "" | vercel env add NEXT_PUBLIC_INGESTION_API_BASE_URL development <<EOF
https://ingestion.tadfuq.com
EOF

echo "Adding NEXTAUTH_URL to preview..."
yes "" | vercel env add NEXTAUTH_URL preview <<EOF
https://frontend-peach-three-20.vercel.app
EOF

echo "Adding NEXTAUTH_URL to development..."
yes "" | vercel env add NEXTAUTH_URL development <<EOF
https://frontend-peach-three-20.vercel.app
EOF

echo "Adding NEXTAUTH_SECRET to preview..."
yes "" | vercel env add NEXTAUTH_SECRET preview <<EOF
4Mg7bRimgvt4wXDreQDPBIgAbeNA4GfufOWb91Dwcus=
EOF

echo "Adding NEXTAUTH_SECRET to development..."
yes "" | vercel env add NEXTAUTH_SECRET development <<EOF
4Mg7bRimgvt4wXDreQDPBIgAbeNA4GfufOWb91Dwcus=
EOF

echo "Done! All environment variables added to all environments."
