#!/bin/bash
# Seeds realm "food", client "food-api", roles, and demo users.
# Idempotent: safe to run multiple times. Run after kcadm config credentials.
set -e
KEYCLOAK_HOME=${KEYCLOAK_HOME:-/opt/keycloak}
KCADM="$KEYCLOAK_HOME/bin/kcadm.sh"
REALM=food
CLIENT_ID=food-api
CLIENT_SECRET=food-api-dev-secret

# --- Realm ---
if ! "$KCADM" get realms/"$REALM" &>/dev/null; then
  echo "Creating realm $REALM..."
  "$KCADM" create realms -s realm="$REALM" -s enabled=true
fi
"$KCADM" update realms/"$REALM" -s sslRequired=NONE 2>/dev/null || true

# --- Client ---
EXISTS=$("$KCADM" get clients -r "$REALM" -q clientId="$CLIENT_ID" 2>/dev/null || echo "[]")
CLIENT_UUID=""
if echo "$EXISTS" | grep -q '"clientId"'; then
  CLIENT_UUID=$(echo "$EXISTS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Client $CLIENT_ID exists, updating..."
else
  echo "Creating client $CLIENT_ID..."
  "$KCADM" create clients -r "$REALM" \
    -s clientId="$CLIENT_ID" \
    -s enabled=true \
    -s clientAuthenticatorType=client-secret \
    -s secret="$CLIENT_SECRET" \
    -s directAccessGrantsEnabled=true \
    -s 'redirectUris=["http://localhost:3000/*"]' \
    -s 'webOrigins=["http://localhost:3000"]' \
    -s standardFlowEnabled=false \
    -s implicitFlowEnabled=false \
    -s serviceAccountsEnabled=false
  CLIENT_UUID=$("$KCADM" get clients -r "$REALM" -q clientId="$CLIENT_ID" 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

# Ensure client has proper mappers for audience and roles
if [ -n "$CLIENT_UUID" ]; then
  # Audience mapper (adds client_id to token audience)
  MAPPER_EXISTS=$("$KCADM" get clients/"$CLIENT_UUID"/protocol-mappers/models -r "$REALM" 2>/dev/null | grep -q '"name":"audience-mapper"' && echo "yes" || echo "no")
  if [ "$MAPPER_EXISTS" = "no" ]; then
    echo "Adding audience mapper to client $CLIENT_ID..."
    # Create mapper using JSON to ensure correct format
    "$KCADM" create clients/"$CLIENT_UUID"/protocol-mappers/models -r "$REALM" -f - <<EOF 2>/dev/null || true
{
  "name": "audience-mapper",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-audience-mapper",
  "config": {
    "included.client.audience": "$CLIENT_ID",
    "id.token.claim": "true",
    "access.token.claim": "true"
  }
}
EOF
  else
    echo "Audience mapper already exists for client $CLIENT_ID"
  fi
fi

# --- Realm roles ---
for role in platform_admin restaurant_manager staff; do
  "$KCADM" get roles/"$role" -r "$REALM" &>/dev/null || \
    "$KCADM" create roles -r "$REALM" -s name="$role" 2>/dev/null || true
done

# --- Demo users ---
create_user() {
  local u=$1 p=$2 r=$3 email=$4 first=$5 last=$6
  # Get user ID if exists, or create
  USER_ID=$("$KCADM" get users -r "$REALM" -q username="$u" 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
  if [ -z "$USER_ID" ]; then
    echo "Creating user $u..."
    "$KCADM" create users -r "$REALM" \
      -s username="$u" \
      -s enabled=true \
      -s email="$email" \
      -s emailVerified=true \
      -s firstName="$first" \
      -s lastName="$last" 2>/dev/null || true
    USER_ID=$("$KCADM" get users -r "$REALM" -q username="$u" 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
  else
    echo "Updating user $u..."
    "$KCADM" update users/"$USER_ID" -r "$REALM" \
      -s email="$email" \
      -s emailVerified=true \
      -s firstName="$first" \
      -s lastName="$last" 2>/dev/null || true
  fi
  if [ -n "$USER_ID" ]; then
    "$KCADM" set-password -r "$REALM" --username "$u" --new-password "$p" 2>/dev/null || true
    "$KCADM" add-roles -r "$REALM" --uusername "$u" --rolename "$r" 2>/dev/null || true
  fi
}

create_user "admin-food" "admin123" "platform_admin" "admin@food.local" "Admin" "Food"
create_user "manager1"   "manager123" "restaurant_manager" "manager1@food.local" "Manager" "One"
create_user "staff1"    "staff123"   "staff" "staff1@food.local" "Staff" "One"

echo "Keycloak seed done: realm=$REALM, client=$CLIENT_ID, users admin-food, manager1, staff1."
