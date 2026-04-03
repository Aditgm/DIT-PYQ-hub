#!/bin/bash
# Authentication Flow Verification Script
# Run this to diagnose 401 issues

set -e

echo "========================================="
echo "Auth Flow Diagnostic Tool"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Environment Variables
echo -e "\n${YELLOW}[1/6] Checking Environment Variables...${NC}"

if [ -z "$VITE_SUPABASE_URL" ]; then
    echo -e "${RED}✗ VITE_SUPABASE_URL is not set${NC}"
else
    echo -e "${GREEN}✓ VITE_SUPABASE_URL is set${NC}"
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}✗ VITE_SUPABASE_ANON_KEY is not set${NC}"
else
    echo -e "${GREEN}✓ VITE_SUPABASE_ANON_KEY is set${NC}"
fi

if [ -z "$API_SERVER_URL" ]; then
    echo -e "${YELLOW}⚠ API_SERVER_URL is not set (Vercel only)${NC}"
else
    echo -e "${GREEN}✓ API_SERVER_URL is set to: $API_SERVER_URL${NC}"
fi

# Step 2: Check Server is Running
echo -e "\n${YELLOW}[2/6] Checking Server Status...${NC}"

SERVER_URL="${API_SERVER_URL:-http://localhost:3001}"
if curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/health" | grep -q "200"; then
    echo -e "${GREEN}✓ Server is running at $SERVER_URL${NC}"
else
    echo -e "${RED}✗ Server is not running at $SERVER_URL${NC}"
    echo "  Start it with: cd server && npm start"
fi

# Step 3: Check Vercel Config
echo -e "\n${YELLOW}[3/6] Checking Vercel Configuration...${NC}"

if [ -f "vercel.json" ]; then
    echo -e "${GREEN}✓ vercel.json exists${NC}"
    
    if grep -q "API_SERVER_URL" .env.example 2>/dev/null; then
        echo -e "${GREEN}✓ API_SERVER_URL documented in .env.example${NC}"
    else
        echo -e "${RED}✗ API_SERVER_URL not documented${NC}"
    fi
else
    echo -e "${RED}✗ vercel.json not found${NC}"
fi

# Step 4: Test Auth Token Generation
echo -e "\n${YELLOW}[4/6] Testing Auth Token Flow...${NC}"

# Check if we have Supabase credentials to test
if [ -n "$VITE_SUPABASE_URL" ] && [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "Testing Supabase authentication..."
    
    # This would require a test user - just check the URL format
    if [[ "$VITE_SUPABASE_URL" == https://*.supabase.co ]]; then
        echo -e "${GREEN}✓ Supabase URL format is valid${NC}"
    else
        echo -e "${RED}✗ Supabase URL format is invalid${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping Supabase test - credentials not available${NC}"
fi

# Step 5: Check Code for Auth Header
echo -e "\n${YELLOW}[5/6] Checking Code for Authorization Header...${NC}"

if grep -q "Authorization.*Bearer" src/api/papers.js; then
    echo -e "${GREEN}✓ Frontend sends Authorization header${NC}"
else
    echo -e "${RED}✗ Frontend missing Authorization header${NC}"
fi

if grep -q "getBearerToken" server/routes/download.js; then
    echo -e "${Green}✓ Server has token extraction logic${NC}"
else
    echo -e "${RED}✗ Server missing token extraction${NC}"
fi

# Step 6: Check Proxy Forwarding
echo -e "\n${YELLOW}[6/6] Checking Vercel Proxy Header Forwarding...${NC}"

if [ -f "api/download/[...path].js" ]; then
    if grep -q "authorization" "api/download/[...path].js"; then
        echo -e "${GREEN}✓ Vercel proxy forwards Authorization header${NC}"
    else
        echo -e "${RED}✗ Vercel proxy may not forward Authorization header${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No Vercel API route found${NC}"
fi

# Summary
echo -e "\n========================================="
echo "Summary"
echo "========================================="
echo ""
echo "If you're still getting 401 errors, check:"
echo "1. User is logged in before clicking download"
echo "2. Session token is not expired"
echo "3. API_SERVER_URL is set in Vercel project env vars"
echo "4. Server logs show the Authorization header is received"
echo ""
echo "Run with debug logging:"
echo "  npm run dev"
echo "  # Check browser console and terminal for errors"
echo ""
