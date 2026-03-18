#!/bin/bash
#
# E2E Test Script for The Mile Game
# Tests complete user flow: Register → Login → Create Event → Verify
#

set -e  # Exit on error

BASE_URL="${BASE_URL:-http://localhost:8082}"
TEST_USER="Test User $(date +%s)"
TEST_EMAIL="test$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"
EVENT_NAME="Evento de Prueba $(date +%s)"
EVENT_SLUG="test-event-$(date +%s)"

echo "🧪 Starting E2E Test Suite"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Cleanup function
cleanup() {
    print_info "Cleaning up..."
    playwright-cli close-all 2>/dev/null || true
}

trap cleanup EXIT

# Phase 1: Registration
echo ""
echo "📋 Phase 1: User Registration"
echo "-----------------------------"

playwright-cli open "${BASE_URL}/register" 2>&1 | grep -q "Browser" && print_status "Browser opened" || print_error "Failed to open browser"

# Take snapshot to get element refs
playwright-cli snapshot --filename=/tmp/01-register.yml 2>&1 >/dev/null

# Fill form (refs may vary, adjust as needed)
playwright-cli fill e17 "${TEST_USER}" 2>&1 >/dev/null && print_status "Name filled" || print_error "Failed to fill name"
playwright-cli fill e20 "${TEST_EMAIL}" 2>&1 >/dev/null && print_status "Email filled" || print_error "Failed to fill email"
playwright-cli fill e23 "${TEST_PASSWORD}" 2>&1 >/dev/null && print_status "Password filled" || print_error "Failed to fill password"
playwright-cli fill e26 "${TEST_PASSWORD}" 2>&1 >/dev/null && print_status "Confirm password filled" || print_error "Failed to fill confirm password"

# Submit
playwright-cli click e27 2>&1 >/dev/null
sleep 2

# Verify registration (check localStorage)
AUTH_TOKEN=$(playwright-cli localstorage-get auth-token 2>&1 | grep -v "^$")
if [ -n "$AUTH_TOKEN" ]; then
    print_status "Registration successful - Auth token saved"
else
    print_error "Registration failed - No auth token"
    exit 1
fi

# Phase 2: Dashboard
echo ""
echo "📋 Phase 2: Dashboard Verification"
echo "-----------------------------------"

playwright-cli goto "${BASE_URL}/dashboard" 2>&1 >/dev/null
sleep 1
playwright-cli snapshot --filename=/tmp/02-dashboard.yml 2>&1 >/dev/null

# Verify user info
USER_INFO=$(playwright-cli localstorage-get auth-user 2>&1)
if echo "$USER_INFO" | grep -q "$TEST_EMAIL"; then
    print_status "Dashboard shows correct user"
else
    print_error "Dashboard shows wrong user"
fi

# Phase 3: Create Event
echo ""
echo "📋 Phase 3: Create Event"
echo "------------------------"

playwright-cli goto "${BASE_URL}/events/new" 2>&1 >/dev/null
sleep 1
playwright-cli snapshot --filename=/tmp/03-create-event.yml 2>&1 >/dev/null

# Fill event form
playwright-cli fill e54 "${EVENT_NAME}" 2>&1 >/dev/null && print_status "Event name filled" || print_error "Failed to fill event name"
playwright-cli fill e58 "2026-12-25" 2>&1 >/dev/null && print_status "Event date filled" || print_error "Failed to fill event date"
playwright-cli fill e64 "${EVENT_SLUG}" 2>&1 >/dev/null && print_status "Event slug filled" || print_error "Failed to fill event slug"

# Submit
playwright-cli click e90 2>&1 >/dev/null
sleep 2

# Verify event created
playwright-cli snapshot --filename=/tmp/04-after-create.yml 2>&1 >/dev/null
if playwright-cli eval "document.body.innerText.includes('${EVENT_NAME}')" 2>&1 | grep -q "true"; then
    print_status "Event created successfully"
else
    print_error "Event creation failed"
    exit 1
fi

# Phase 4: Event Page
echo ""
echo "📋 Phase 4: Event Page Verification"
echo "------------------------------------"

playwright-cli goto "${BASE_URL}/event/${EVENT_SLUG}/ranking" 2>&1 >/dev/null
sleep 1
playwright-cli snapshot --filename=/tmp/05-event-page.yml 2>&1 >/dev/null

# Check navigation tabs exist
if playwright-cli eval "!!document.querySelector('a[href*=\"quiz\"]')" 2>&1 | grep -q "true"; then
    print_status "Quiz tab exists"
else
    print_error "Quiz tab missing"
fi

if playwright-cli eval "!!document.querySelector('a[href*=\"corkboard\"]')" 2>&1 | grep -q "true"; then
    print_status "Corkboard tab exists"
else
    print_error "Corkboard tab missing"
fi

# Phase 5: Admin Panel
echo ""
echo "📋 Phase 5: Admin Panel Verification"
echo "-------------------------------------"

playwright-cli goto "${BASE_URL}/admin/event/${EVENT_SLUG}/theme" 2>&1 >/dev/null
sleep 1
playwright-cli snapshot --filename=/tmp/06-admin-theme.yml 2>&1 >/dev/null

if playwright-cli eval "document.body.innerText.includes('Customize Theme')" 2>&1 | grep -q "true"; then
    print_status "Admin panel loads correctly"
else
    print_error "Admin panel failed to load"
fi

# Final checks
echo ""
echo "📋 Final Checks"
echo "---------------"

# Check console errors
ERRORS=$(playwright-cli console 2>&1 | grep -c "ERROR" || true)
if [ "$ERRORS" -eq 0 ]; then
    print_status "No console errors"
else
    print_error "Found $ERRORS console errors"
fi

# Summary
echo ""
echo "=========================="
print_status "E2E Test Suite Complete!"
echo ""
print_info "Test user: ${TEST_EMAIL}"
print_info "Event: ${EVENT_NAME} (${EVENT_SLUG})"
print_info "Snapshots saved to: /tmp/0*.yml"
echo ""
