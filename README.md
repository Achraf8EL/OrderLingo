# OrderLingo — Multi-tenant Restaurant Platform

Socle technique multi-restaurants : **tenant = restaurant**, isolation par `restaurant_id`, CRUD restaurants / menu / stock / commandes, auth Keycloak (JWT), Docker Compose.

## Quick start

```bash
# 1. Lancer l’infra + API
docker compose up -d

# 2. Vérifier
curl -s http://localhost:8000/health
# => {"status":"ok"}
# OpenAPI : http://localhost:8000/docs

# 3. Keycloak : realm `food`, client `food-api`, rôles et users de démo sont créés au premier démarrage (seed). Voir section E.
# 4. Migrations : appliquées au démarrage de l’API. Sinon : docker compose exec api python -m alembic upgrade head
```

## Stack

- **Backend**: FastAPI, PostgreSQL, SQLAlchemy 2.0, Alembic, Redis (optionnel)
- **Auth**: Keycloak (JWT)
- **Infra**: Docker + Docker Compose

---

## A) Docker Compose

Services : Postgres (5432), Keycloak (8081), Redis (6379), API (8000).

```bash
# Lancer tout
docker compose up -d

# Ou step-by-step
docker compose up -d postgres redis keycloak
# puis build + run API après migrations
```

Variables d’environnement pour l’API (déjà configurées dans `docker-compose.yml`) :

- `DATABASE_URL` : `postgresql+asyncpg://orderlingo:orderlingo_secret@postgres:5432/orderlingo`
- `KEYCLOAK_ISSUER` : `http://localhost:8081/realms/food`
- `KEYCLOAK_AUDIENCE` : `food-api`
- `KEYCLOAK_JWKS_URI` : `http://keycloak:8080/realms/food/protocol/openid-connect/certs` (côté Docker) ou `http://localhost:8081/realms/food/protocol/openid-connect/certs` (local)
- `REDIS_URL` : `redis://redis:6379/0`

---

## B) Dockerfile backend

Le Dockerfile dans `backend/` build l’image FastAPI et lance uvicorn sur le port 8000. Utilisé par `docker compose` pour le service `api`. L’entrypoint exécute `alembic upgrade head` au démarrage puis uvicorn.

---

## C) Backend — structure et code

- `app/core/` : `config`, `database` (engine/session/Base), `security` (JWT Keycloak)
- `app/models/` : Restaurant, RestaurantUser, MenuItem, InventoryItem, InventoryLevel, Order, OrderItem
- `app/schemas/` : Pydantic create/update/read
- `app/api/routes/` : restaurants, menu, inventory, orders
- `app/services/` : `stock` (availability), `ordering` (validation, create, status)

Toutes les tables ont `restaurant_id` (ou FK vers une entité scopée). Les routes filtrent systématiquement par `restaurant_id`.

---

## D) Alembic

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # ou Windows: .venv\Scripts\activate
pip install -r requirements.txt

# URL sync pour Alembic (psycopg). Par défaut = asyncpg URL avec +asyncpg → +psycopg
export DATABASE_URL="postgresql+asyncpg://orderlingo:orderlingo_secret@localhost:5432/orderlingo"

alembic revision --autogenerate -m "description"   # créer une révision
alembic upgrade head                              # appliquer les migrations
```

En Docker, exécuter les migrations dans le conteneur API ou via un job dédié (même `DATABASE_URL` mais host = `postgres`).

---

## E) Auth Keycloak — realm, client, rôles, vérification JWT

### 0. Seed automatique (recommandé)

Au démarrage, le script `scripts/keycloak-seed-food.sh` crée :

- Realm **`food`** (`sslRequired=NONE` pour HTTP en dev)
- Client **`food-api`** (confidentiel, Direct Access Grants, secret `food-api-dev-secret`)
- Rôles realm : `platform_admin`, `restaurant_manager`, `staff`
- Users de démo :

| Username    | Mot de passe | Rôle                |
|------------|--------------|---------------------|
| `admin-food` | `admin123`   | `platform_admin`    |
| `manager1`   | `manager123` | `restaurant_manager`|
| `staff1`     | `staff123`   | `staff`             |

**Frontend** : dans `frontend/.env.local`, mets `KEYCLOAK_CLIENT_SECRET=food-api-dev-secret`.  
Tu peux te connecter avec `admin-food` / `admin123` (ou les autres) sur le login.

Les données Keycloak sont persistées via le volume `keycloak_data` ; le seed est idempotent.

### 1. Créer le realm `food` (si pas de seed)

1. Admin Console : http://localhost:8081 (user `admin` / `admin`).
2. Créer un realm `food`.

### 2. Client `food-api` (si pas de seed)

1. Dans `food` : **Clients** → **Create**.
2. **Client ID** : `food-api`.
3. **Client authentication** : ON.
4. **Access type** : `confidential` (ou `bearer-only` si l’API ne fait que vérifier les tokens).
5. **Valid redirect URIs** : ex. `http://localhost:3000/*` pour Next.js.
6. **Web origins** : idem. **Direct access grants** : ON pour le login username/password.
7. **Credentials** → secret : note-le et mets-le dans `KEYCLOAK_CLIENT_SECRET` (frontend).

### 3. Audience et roles

- **Audience** : dans **Clients** → `food-api` → **Settings** : mettre **Client ID** = `food-api` (utilisé comme audience dans les tokens).
- **Roles** (à créer dans le realm ou le client) :
  - `platform_admin` : accès global.
  - `restaurant_manager` : gestion d’un ou plusieurs restaurants (lié via `restaurant_users`).
  - `staff` : accès restaurant (lié via `restaurant_users`).

Attacher ces rôles aux users (ou groupes) dans Keycloak.

### 4. Vérification JWT dans FastAPI

- `app/core/security.py` :
  - Récupère le JWKS depuis `KEYCLOAK_JWKS_URI`.
  - Décode le JWT avec `python-jose` (audience = `food-api`, issuer = realm `food`).
  - Expose `get_current_user` et `require_roles("platform_admin" | "restaurant_manager" | "staff")`.
- Les routes utilisent `Depends(get_current_user)` et `Depends(require_restaurant_manager)` ou `require_restaurant_staff` selon l’endpoint. L’accès par restaurant est vérifié via la table `restaurant_users`.

---

## F) Exemples d’appels `curl`

Remplace `TOKEN` par un JWT obtenu via Keycloak (flow OAuth2 / OIDC ou password grant pour les tests).  
`RID` = `restaurant_id` (UUID), `OID` = `order_id`, `IID` = `menu_item_id`.

### Créer un restaurant (platform_admin)

```bash
curl -s -X POST http://localhost:8000/restaurants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "La Piazza", "slug": "la-piazza", "description": "Pizza & pasta"}'
```

### Lister les restaurants (platform_admin)

```bash
curl -s http://localhost:8000/restaurants -H "Authorization: Bearer $TOKEN"
```

### Ajouter un item au menu (manager du resto)

```bash
curl -s -X POST "http://localhost:8000/restaurants/$RID/menu/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "Margherita", "price": "12.50", "is_active": true, "tags": ["pizza", "vegetarian"]}'
```

### Ajouter stock / availability

- Créer un inventory item (manager) :

```bash
curl -s -X POST "http://localhost:8000/restaurants/$RID/inventory/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "tomate", "unit": "kg"}'
```

- Mettre à jour le niveau (manager) :

```bash
curl -s -X PUT "http://localhost:8000/restaurants/$RID/inventory/items/$INV_ITEM_ID/levels" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 10, "in_stock": true}'
```

- Disponibilité par item menu (staff/manager) :

```bash
curl -s "http://localhost:8000/restaurants/$RID/availability" -H "Authorization: Bearer $TOKEN"
```

### Créer une commande (staff/manager)

```bash
curl -s -X POST "http://localhost:8000/restaurants/$RID/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"menu_item_id": "'"$IID"'", "quantity": 2, "options": null}
    ]
  }'
```

### Voir une commande et mettre à jour le statut

```bash
curl -s "http://localhost:8000/restaurants/$RID/orders/$OID" -H "Authorization: Bearer $TOKEN"

curl -s -X PATCH "http://localhost:8000/restaurants/$RID/orders/$OID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

Statuts possibles : `draft` → `confirmed` → `preparing` → `ready` → `delivered` | `cancelled`.

---

## Frontend (Admin UI)

Next.js 14 (App Router), TypeScript, Tailwind, composants type shadcn (Radix). Thème **terracotta / sage / cream**.

### Lancer le frontend

```bash
cd frontend
cp .env.example .env.local
# Éditer .env.local : KEYCLOAK_CLIENT_SECRET = secret du client food-api (Keycloak → Clients → food-api → Credentials)
npm install
npm run dev
```

Ouvre **http://localhost:3000**. Redirection vers `/login`. Connexion via **username / password** (Direct Access Grant) ; le token est envoyé à l’API.

### Pages

- **Login** : `/login`
- **Dashboard** : `/dashboard` (raccourcis)
- **Restaurants** : `/dashboard/restaurants` (liste, création)
- **Détail restaurant** : `/dashboard/restaurants/[id]` — onglets **Infos**, **Menu**, **Stock**, **Disponibilité**, **Commandes**

### Variables d’environnement (.env.local)

- `NEXT_PUBLIC_API_URL` : URL de l’API (défaut `http://localhost:8000`)
- `NEXT_PUBLIC_KEYCLOAK_URL` : URL Keycloak (défaut `http://localhost:8081`)
- `KEYCLOAK_CLIENT_SECRET` : secret du client `food-api` (serveur uniquement, pour `/api/auth/login`)

---

## G) Bonnes pratiques

- **Multi-tenant** : une seule DB, `restaurant_id` partout ; jamais de données d’un autre restaurant.
- **Index** : index sur `restaurant_id` (et composites si besoin) pour les tables scopées.
- **Validation** : `restaurant_id` vérifié (existence + accès) dans les deps et services.
- **Erreurs** : 400 (validation), 404 (ressource inexistante), 409 (conflit, ex. slug dupliqué, transition de statut invalide).
- **N+1** : utilisation de `selectinload` pour `Order.items` etc. quand on renvoie des agrégats.

---

## H) Roadmap

| Phase | Contenu |
|-------|--------|
| **MVP** | Monolithe modulaire : CRUD restaurants, menu, stock/availability, commandes, auth Keycloak, Docker Compose. |
| **V1** | Webhooks (ex. `order_ready`), notifications. Admin UI : Next.js + shadcn (**fait**). |
| **V2** | IA vocale : LLM + STT/TTS, appels téléphoniques, extraction de commandes en JSON → appels API. |

---

## Endpoints MVP (rappel)

| Méthode | Endpoint | Rôle |
|--------|----------|------|
| POST | `/restaurants` | platform_admin |
| GET | `/restaurants` | platform_admin |
| GET | `/restaurants/{id}` | platform_admin ou manager du resto |
| PATCH | `/restaurants/{id}` | platform_admin ou manager |
| POST | `/restaurants/{id}/menu/items` | manager |
| GET | `/restaurants/{id}/menu/items` | staff / manager |
| PATCH | `/restaurants/{id}/menu/items/{item_id}` | manager |
| DELETE | `/restaurants/{id}/menu/items/{item_id}` | manager |
| GET | `/restaurants/{id}/availability` | staff / manager |
| GET | `/restaurants/{id}/inventory/items` | staff / manager |
| POST | `/restaurants/{id}/orders` | staff / manager |
| GET | `/restaurants/{id}/orders` | staff / manager |
| GET | `/restaurants/{id}/orders/{order_id}` | staff / manager |
| PATCH | `/restaurants/{id}/orders/{order_id}/status` | staff / manager |

OpenAPI : `GET /docs` et `GET /openapi.json`.
