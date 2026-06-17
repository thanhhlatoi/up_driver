# Google Drive Upload Web Tool

Web app for uploading local images and videos to selected Google Drive accounts and mapped top-level folders. Each mapped folder has fixed `Images` and `Videos` subfolders.

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Google Drive API via `googleapis`
- Native `request.formData()` for multipart upload parsing
- PostgreSQL + Prisma
- Basic Auth middleware
- Google OAuth connect flow

## Setup

Install dependencies:

```bash
npm install
```

Create a local PostgreSQL database first. Prisma migrations create tables inside an existing database; they do not install PostgreSQL or usually create the database name for you.

Example database name:

```text
drive_upload_web
```

Using `psql`:

```bash
psql -U postgres
```

Then run:

```sql
CREATE DATABASE drive_upload_web;
```

Or create the same database from pgAdmin.

Create `.env.local` from `.env.example` after PostgreSQL is ready:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/drive_upload_web"
ENCRYPTION_KEY="base64_32_byte_key"

GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback

BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=
```

Environment variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `ENCRYPTION_KEY`: base64-encoded 32-byte key used to encrypt Google refresh tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- `GOOGLE_OAUTH_CLIENT_ID`: Google OAuth client ID.
- `GOOGLE_OAUTH_CLIENT_SECRET`: Google OAuth client secret.
- `GOOGLE_OAUTH_REDIRECT_URI`: callback URL. Must match Google Cloud Console.
- `BASIC_AUTH_USER`: Basic Auth username.
- `BASIC_AUTH_PASSWORD`: Basic Auth password.

Generate `ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output into `.env.local`.

Run database migration:

```bash
npx prisma migrate dev
```

This creates the application tables in PostgreSQL:

```text
DriveAccount
DriveFolder
UploadSession
UploadFile
```

If you get an error like `database "drive_upload_web" does not exist`, create the database first and run the migration again.

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

If you changed `.env.local`, restart the dev server. Next.js does not reliably reload server-side environment variables without restarting.

## First-Time Local Flow

```text
1. Install PostgreSQL and start the PostgreSQL service.
2. Create database: drive_upload_web.
3. Copy .env.example to .env.local.
4. Fill DATABASE_URL, ENCRYPTION_KEY, Google OAuth envs, and Basic Auth envs.
5. Run npx prisma migrate dev.
6. Run npm run dev.
7. Open /admin/drive-accounts.
8. Click Connect Google Drive.
9. Create a mapped top-level folder under the connected Drive account.
10. Go to / and upload files into the selected Drive account/folder.
```

## Upload Behavior

Drive account flow:

```text
/admin/drive-accounts
  -> Connect Google Drive
  -> Google OAuth consent
  -> account refresh token encrypted in PostgreSQL
```

Mapped folder structure:

```text
Selected Google Drive Account
+-- Project_X
|   +-- Images
|   +-- Videos
+-- Client_Y
    +-- Images
    +-- Videos
```

Upload modes:

- `SEQUENTIAL`: uploads all images first, then uploads all videos.
- `PARALLEL`: uploads image group and video group concurrently; each group uploads files sequentially internally.

Unsupported files are not uploaded and are returned in the result.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Notes

- Drive accounts are connected through Google OAuth from `/admin/drive-accounts`.
- Top-level folders are created from `/admin/drive-accounts/[id]/folders` and mapped in PostgreSQL.
- Duplicate file names are allowed because Google Drive supports multiple files with the same name in one folder.
- Deleting a Drive account or mapped folder deletes the related Google Drive folders and cascades related upload history in PostgreSQL after explicit confirmation.
- This version does not include CLI, pause/resume/cancel, or realtime byte-level progress.
