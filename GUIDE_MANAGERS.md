# Guide : Gestion des Managers

## Nouvelle fonctionnalité : Sélecteur d'utilisateurs

Au lieu de copier/coller manuellement les IDs Keycloak, tu peux maintenant **sélectionner les managers directement depuis une liste**.

---

## 🚀 Installation et démarrage

### 1. Installer les nouvelles dépendances frontend

```bash
cd frontend
npm install
```

### 2. Reconstruire et redémarrer le backend

```bash
cd ..
docker compose up -d --build api
```

### 3. Redémarrer le frontend

```bash
cd frontend
npm run dev
```

---

## 📖 Utilisation

### Assigner un manager à un restaurant

1. **Connecte-toi avec `admin-food` / `admin123`**

2. **Va sur ton restaurant** (liste des restaurants → cliquer sur un restaurant)

3. **Clique sur l'onglet "Infos"**

4. **Dans la section "Managers assignés"** :
   - Clique sur **"+ Ajouter un manager"**
   - Une liste s'affiche avec tous les utilisateurs Keycloak
   - Tu peux **rechercher** par nom ou email
   - Clique sur un utilisateur pour l'ajouter
   - Le nom complet s'affiche (ex: "Manager One" au lieu de "9ee90e49-...")

5. **Clique sur "Enregistrer"**

6. **Déconnecte-toi et reconnecte-toi avec le manager** (ex: `manager1` / `manager123`)

7. Le manager voit maintenant le restaurant dans sa liste !

---

## ✨ Avantages de la nouvelle interface

| Avant | Après |
|-------|-------|
| Copier l'ID depuis Keycloak Admin | Sélectionner depuis une liste |
| ID illisible (`9ee90e49-d677-...`) | Nom complet ("Manager One") |
| Erreurs de copie possibles | Interface sécurisée |
| Besoin d'ouvrir Keycloak Admin | Tout dans l'interface |

---

## 🔧 Fonctionnalités

### Backend
- **Nouveau endpoint** : `GET /users` pour lister les utilisateurs Keycloak
- Accessible uniquement aux `platform_admin`
- Utilise l'API Admin de Keycloak

### Frontend
- **Composant `UserSelect`** : Sélecteur avec recherche
- Affiche le nom complet et l'email des utilisateurs
- Supporte la recherche en temps réel
- Interface moderne avec shadcn/ui

---

## 📝 Architecture

```
Frontend (admin-food)
    ↓
GET /users (API)
    ↓
Keycloak Admin API
    ↓
Liste des utilisateurs (realm: food)
    ↓
Affichage dans le sélecteur
```

---

## 🎯 Permissions

| Utilisateur | Peut lister les users | Peut assigner des managers |
|------------|------------------------|----------------------------|
| `admin-food` (platform_admin) | ✅ | ✅ |
| `manager1` (restaurant_manager) | ❌ | ❌ |
| `staff1` (staff) | ❌ | ❌ |

---

## 🐛 En cas de problème

### Erreur "503 Service Unavailable" lors du listing des users

Le backend ne peut pas se connecter à Keycloak. Vérifie :

```bash
# Vérifier que Keycloak est up
docker compose ps keycloak

# Vérifier les logs
docker compose logs keycloak --tail 20
docker compose logs api --tail 20
```

### Les utilisateurs ne s'affichent pas

Vérifie que les dépendances sont bien installées :

```bash
cd frontend
npm list cmdk @radix-ui/react-popover
```

Si manquant, réinstalle :

```bash
npm install cmdk @radix-ui/react-popover
```

---

## 💡 Prochaines améliorations possibles

- [ ] Ajouter un badge pour voir les rôles de chaque utilisateur
- [ ] Permettre l'assignation de staff (en plus des managers)
- [ ] Filtrer par rôle dans le sélecteur
- [ ] Afficher les restaurants déjà assignés à un utilisateur
- [ ] Créer un nouvel utilisateur directement depuis l'interface
