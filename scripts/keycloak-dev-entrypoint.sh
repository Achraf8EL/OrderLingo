#!/bin/bash
set -e
KEYCLOAK_HOME=${KEYCLOAK_HOME:-/opt/keycloak}
ADMIN_USER=${KC_BOOTSTRAP_ADMIN_USERNAME:-admin}
ADMIN_PASS=${KC_BOOTSTRAP_ADMIN_PASSWORD:-admin}

# Start Keycloak in background
"$KEYCLOAK_HOME/bin/kc.sh" start-dev &
PID=$!

# Wait for Keycloak to be ready (fixed sleep – /dev/tcp often unavailable in minimal images)
echo "Waiting for Keycloak (40s)..."
sleep 40

# Disable HTTPS requirement for master realm (dev only)
echo "Setting master realm sslRequired=NONE..."
for i in 1 2 3 4 5 6 7 8; do
  "$KEYCLOAK_HOME/bin/kcadm.sh" config credentials \
    --server http://localhost:8080 \
    --realm master \
    --user "$ADMIN_USER" \
    --password "$ADMIN_PASS" 2>/dev/null && break
  sleep 5
done
"$KEYCLOAK_HOME/bin/kcadm.sh" update realms/master -s sslRequired=NONE 2>/dev/null || true

echo "Seeding realm food, client food-api, roles, demo users..."
bash /scripts/keycloak-seed-food.sh || true

echo "Keycloak ready. Master + food allow HTTP."
wait $PID
