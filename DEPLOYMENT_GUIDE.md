# Guide de Déploiement - ERP Hôtel Casino

## Problème : "Failed to Fetch"

Cette erreur se produit car les Edge Functions Supabase ne sont pas encore déployées.

## Solution : Déploiement Manuel

### Étape 1 : Déployer la Base de Données

Allez sur votre Supabase Dashboard : https://supabase.com/dashboard/project/uvwzqfhyafxggrkkfxqg

1. Cliquez sur **SQL Editor** dans le menu de gauche
2. Créez une nouvelle requête
3. Copiez le contenu du fichier `consolidated_migration.sql` (qui sera créé)
4. Cliquez sur **Run** pour exécuter

### Étape 2 : Déployer les Edge Functions

Vous avez 3 fonctions à déployer :
- `auth-login` (authentification)
- `printer-proxy` (service d'impression)
- `manage-employee` (gestion des employés)

#### Option A : Via Supabase CLI (Recommandé)

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter à votre projet
supabase link --project-ref uvwzqfhyafxggrkkfxqg

# Déployer les fonctions
supabase functions deploy auth-login
supabase functions deploy printer-proxy
supabase functions deploy manage-employee
```

#### Option B : Via le Dashboard Supabase

1. Allez sur **Edge Functions** dans votre dashboard
2. Cliquez sur **Create a new function**
3. Pour chaque fonction :
   - Nom : `auth-login` (puis `printer-proxy`, puis `manage-employee`)
   - Copiez le code depuis `supabase/functions/[nom-fonction]/index.ts`
   - Cliquez sur **Deploy**

### Étape 3 : Tester l'Application

Une fois les étapes 1 et 2 terminées :

1. Lancez l'application : `npm run dev`
2. Connectez-vous avec :
   - **Login** : admin
   - **Mot de passe** : admin123

## Vérification

Pour vérifier que tout fonctionne :

1. **Base de données** : Allez dans Table Editor, vous devriez voir environ 40 tables
2. **Edge Functions** : Allez dans Edge Functions, vous devriez voir 3 fonctions déployées
3. **Application** : La page de connexion devrait fonctionner sans erreur "Failed to Fetch"

## En cas de problème

- Vérifiez que votre `.env` contient bien les bonnes informations
- Vérifiez que les Edge Functions sont bien déployées (status: Active)
- Consultez les logs dans Supabase Dashboard > Edge Functions > Logs
