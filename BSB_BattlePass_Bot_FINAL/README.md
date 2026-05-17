# BSB Battle Pass Bot — Guide de déploiement
## LA BRINK'S × BSB Bot — Saison 1

---

## ÉTAPE 1 — Créer le bot sur Telegram

1. Ouvre Telegram et cherche **@BotFather**
2. Envoie `/newbot`
3. Nom du bot : `BSB Battle Pass`
4. Username du bot : `BSBBattlePassBot` (ou similaire, doit finir par "bot")
5. Copie le **token** reçu → tu en auras besoin dans `.env`

Ensuite, configure le bot :
```
/setdescription → Rejoins le BSB Battle Pass et gagne jusqu'à 1 330$ USDT !
/setuserpic → Upload le logo LA BRINK'S
/setcommands →
start - Ouvrir le Battle Pass
progress - Ma progression
soumettre - Soumettre une preuve
classement - Top 10 membres
aide - Aide
```

---

## ÉTAPE 2 — Configurer Supabase

1. Va sur https://supabase.com → créer un compte
2. Nouveau projet → nom : `bsb-battle-pass` → région : **Europe (Frankfurt)**
3. Va dans **SQL Editor** → **New Query**
4. Colle tout le contenu de `BSB_BattlePass_Supabase_Schema.sql`
5. Clique **Run**
6. Va dans **Settings → API** et copie :
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_KEY`

---

## ÉTAPE 3 — Configurer les variables d'environnement

```bash
cp .env.example .env
```

Remplis le fichier `.env` :
```env
BOT_TOKEN=ton_token_botfather
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
MINI_APP_URL=https://bsb-battle-pass.vercel.app
ADMIN_TELEGRAM_ID=ton_telegram_id
ADMIN_IDS=ton_telegram_id
PUBLIC_CHANNEL=labrinks
```

Pour trouver ton Telegram ID : envoie un message à **@userinfobot**

---

## ÉTAPE 4 — Lancer le bot en local (test)

```bash
npm install
node index.js
```

Ouvre Telegram, trouve ton bot et envoie `/start`

---

## ÉTAPE 5 — Déployer sur Railway (production, gratuit)

1. Va sur https://railway.app → créer un compte avec GitHub
2. **New Project → Deploy from GitHub repo**
3. Upload ou link ce dossier
4. Dans **Variables** → ajoute toutes les variables du `.env`
5. Railway détecte automatiquement Node.js et lance `node index.js`
6. Ton bot sera actif 24h/24

**Alternative gratuite : Render.com**
- New Web Service → connecte GitHub → même configuration

---

## COMMANDES ADMIN

| Commande | Action |
|----------|--------|
| `/admin` | Ouvre le panel admin |
| `/stats` | Stats de la saison |
| `/ban [telegram_id]` | Bannir un membre fraudeur |

---

## FLUX COMPLET

```
Membre → /start
       → S'inscrit automatiquement
       → Mission 1 débloquée
       → Complète la mission
       → /soumettre → envoie screenshot
       → Admin reçoit notification
       → Admin valide via bouton
       → Membre notifié + niveau débloqué
       → Récompense créée dans DB
```

---

## STRUCTURE DES FICHIERS

```
bsb-bot/
├── index.js          ← Bot principal (toutes les commandes)
├── db.js             ← Fonctions base de données Supabase
├── messages.js       ← Tous les textes et claviers
├── .env              ← Variables d'environnement (à créer)
├── .env.example      ← Template des variables
└── package.json      ← Dépendances Node.js
```

---

## PROCHAINE ÉTAPE

Étape 4 : **Panel Admin** — interface web pour valider les missions,
voir les soumissions en temps réel et gérer les paiements.
