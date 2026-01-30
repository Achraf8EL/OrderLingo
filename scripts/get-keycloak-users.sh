#!/bin/bash
# Script pour récupérer la liste des utilisateurs Keycloak avec leurs IDs
set -e

KEYCLOAK_HOME=${KEYCLOAK_HOME:-/opt/keycloak}
KCADM="$KEYCLOAK_HOME/bin/kcadm.sh"
REALM=food

echo "=== Utilisateurs Keycloak (realm: $REALM) ==="
echo ""

# Config credentials
"$KCADM" config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin 2>/dev/null

# Get users
USERS=$("$KCADM" get users -r "$REALM" 2>/dev/null)

# Parse and display
echo "$USERS" | jq -r '.[] | "\(.username) (ID: \(.id))"' 2>/dev/null || echo "jq not installed, showing raw JSON:"
if [ $? -ne 0 ]; then
  echo "$USERS"
fi

echo ""
echo "=== Instructions ==="
echo "Pour assigner un manager à un restaurant:"
echo "1. Copie l'ID de l'utilisateur ci-dessus"
echo "2. Dans le frontend, va sur le restaurant → Onglet 'Infos'"
echo "3. Colle l'ID dans le champ 'Managers' et clique 'Ajouter'"
echo "4. Sauvegarde"
