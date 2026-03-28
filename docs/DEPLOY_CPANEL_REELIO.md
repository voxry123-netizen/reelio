# Reelio — deployment pe cPanel

## Ce am pregătit în proiect
- rebranding principal din REALM în Reelio
- corectare variabilă frontend `NEXT_PUBLIC_API_BASE`
- corectare conexiune Redis pentru a accepta și `REDIS_URL`
- corectare nume coadă export worker (`export`)
- eliminare URL-uri hardcodate `localhost:3001` din UI-ul frontend unde apăreau în TopNav

## Structura recomandată pentru hosting
Publică aplicația în două aplicații Node separate:
- **Frontend**: `apps/web`
- **API**: `apps/api`

Serviciul `apps/ai` este opțional pentru cPanel. Feed-ul API are deja fallback dacă AI-ul nu răspunde.

## Variantă recomandată de domenii
- `app.domeniu-tau.ro` → frontend Next.js
- `api.domeniu-tau.ro` → backend Fastify

## Ce trebuie să existe în hosting
- Node.js App / Application Manager activ
- PostgreSQL activ
- Terminal sau SSH activ
- Cron Jobs activ

## 1. Creează baza de date PostgreSQL
Exemplu:
- DB: `reelio`
- user: `reelio_user`
- parolă: puternică

Completează apoi `DATABASE_URL` în format:

```env
DATABASE_URL=postgresql://USER:PAROLA@HOST:5432/NUME_DB?schema=public
```

## 2. Creează aplicația API în cPanel
Folder recomandat:

```text
/home/UTILIZATOR/reelio/api
```

Încarcă în acest folder conținutul din:

```text
apps/api
```

### Fișier `.env` pentru API
Exemplu minim:

```env
NODE_ENV=production
API_PORT=3001
API_HOST=127.0.0.1
CORS_ORIGIN=https://app.domeniu-tau.ro
JWT_ACCESS_SECRET=schimba_cu_un_secret_lung_1
JWT_REFRESH_SECRET=schimba_cu_un_secret_lung_2
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=2592000
COOKIE_SECURE=true
COOKIE_DOMAIN=.domeniu-tau.ro
DATABASE_URL=postgresql://USER:PAROLA@HOST:5432/NUME_DB?schema=public
REDIS_URL=redis://HOST:6379
REDIS_HOST=HOST
REDIS_PORT=6379
S3_ENDPOINT=https://s3-providerul-tau.example
S3_REGION=us-east-1
S3_ACCESS_KEY=KEY
S3_SECRET_KEY=SECRET
S3_BUCKET=reelio
S3_PUBLIC_URL=https://cdn.domeniu-tau.ro/reelio
AI_BASE_URL=http://127.0.0.1:8999
ADMIN_SEED_EMAIL=admin@reelio.local
ADMIN_SEED_PASSWORD=Admin123!ChangeMe
```

### Comenzi pentru API
```bash
npm install
npx prisma generate
npx prisma db push
npm run build
npm run seed
```

### Start command API
În cPanel setează startup command / startup file astfel încât aplicația să ruleze:

```bash
npm run start:api
```

## 3. Creează aplicația Frontend în cPanel
Folder recomandat:

```text
/home/UTILIZATOR/reelio/web
```

Încarcă în acest folder conținutul din:

```text
apps/web
```

### Fișier `.env` pentru frontend
```env
NODE_ENV=production
NEXT_PUBLIC_API_BASE=https://api.domeniu-tau.ro
PORT=3000
HOSTNAME=0.0.0.0
```

### Comenzi pentru frontend
```bash
npm install
npm run build
```

### Start command frontend
```bash
npm run start
```

## 4. Prisma și tabelele
Dacă pornești proiectul pentru prima dată:

```bash
npx prisma generate
npx prisma db push
npm run seed
```

Dacă baza există deja și vrei doar actualizare:

```bash
npx prisma generate
npx prisma db push
```

## 5. Worker și cron
Dacă ai Redis disponibil, pornește workerul separat din același cod API:

```bash
npm run start:worker
```

Dacă hostingul nu permite proces Node separat pentru worker, folosește cron pentru un restart de siguranță al aplicației și mută exporturile sensibile pe un host care suportă procese persistente.

## 6. Upload media
Frontendul folosește deja upload local-media pentru fișierele alese din browser. Pentru producție serioasă recomandat este să configurezi corect S3-compatible storage.

## 7. Test final
După deploy verifică în ordinea asta:
1. `https://api.domeniu-tau.ro/health`
2. `https://api.domeniu-tau.ro/docs`
3. `https://app.domeniu-tau.ro`
4. register
5. login
6. create realm
7. create post text
8. create post cu imagine/video
9. comments / likes
10. notifications
11. profile update
12. messages

## 8. Important pentru cookie-uri
Pentru login între subdomenii:
- `COOKIE_SECURE=true`
- `COOKIE_DOMAIN=.domeniu-tau.ro`
- `CORS_ORIGIN=https://app.domeniu-tau.ro`

## 9. Ce să NU urci pe hostingul final
Nu urca aceste directoare:
- `node_modules`
- `.next`
- `dist`
- fișiere locale de debug

Le generezi direct pe server.

## 10. Ordinea scurtă de lucru
1. creezi DB PostgreSQL
2. urci `apps/api`
3. configurezi `.env` la API
4. rulezi install + prisma + build + seed
5. pornești API
6. urci `apps/web`
7. configurezi `.env` la web
8. rulezi install + build
9. pornești frontendul
10. verifici health/docs/login/postări
