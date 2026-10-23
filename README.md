# MDB

## Automated tests

See [tests/README.md](tests/README.md) for the isolated SQL Server integration
suite. Run `dotnet test MDB.slnx` with Docker Desktop running. The suite creates
its own disposable SQL Server container and does not touch your development DB.

## React client

With the Docker API running, start the frontend in a second terminal:

```powershell
cd src/mdb-client
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/auth` and `/api` requests to the
API on port 5132, so no API CORS change is needed for local development.
`npm run build` checks TypeScript and creates a production bundle in `dist`.
Deployment needs the same route forwarding to the API; Vite's proxy is only
for the development server.

Registration creates an account and signs in automatically. Existing accounts
can use Sign in. The account screen loads the email from the protected
`/api/me` endpoint. Sign out clears the local session; it does not revoke
previously issued API tokens.

### Zustand walkthrough

- `src/mdb-client/src/stores/authStore.ts`: `create` defines the shared state
  and actions. `set` updates state; `get` reads the latest state inside actions.
- `src/mdb-client/src/App.tsx`: selectors such as
  `useAuthStore((state) => state.user)` subscribe to one part of the store.
  React renders again when that selected value changes.
- `src/mdb-client/src/api.ts`: HTTP calls stay separate from state management.
  Email and password form inputs stay in component state.

This first client keeps the access token only in memory. Reloading the page,
signing out, or reaching token expiry requires signing in again. Automatic
refresh and persistent login are not wired into the client yet.

## Run the API with Docker

Start Docker Desktop using Linux containers, then run from the repository root:

The local `.env` file holds the SQL Server password and is ignored by Git.
If setting up a fresh checkout, first copy `.env.example` to `.env` and replace
the example password with a strong password.

```powershell
docker compose up --build -d
```

Open http://localhost:5132. The initial API returns `Hello World!`.

```powershell
docker compose logs -f api
docker compose down
```

Run `docker compose up --build -d` again after changing the API source.

The Dockerfile publishes the .NET 10 API in a build stage and runs it as a
non-root user in the smaller ASP.NET runtime image. Compose exposes HTTP on
localhost port 5132 for local development. HTTPS can be configured at a reverse
proxy when deploying.

## SQL Server

Compose runs SQL Server 2022 Developer alongside the API. The API waits for SQL
Server to become healthy and receives `ConnectionStrings:DefaultConnection`
through its environment. In Development, the API calls `EnsureDeletedAsync`
and `EnsureCreatedAsync` on every startup, then seeds the platform administrator.
Every startup deletes all existing MDB data, including users, schools, and
memberships. This is a temporary development workflow, with no migrations.
Database initialization and seeding do not run outside Development.

To connect from SQL Server Management Studio on Windows:

- Server: `localhost,14330`
- Authentication: SQL Server Authentication
- Login: `sa`
- Password: the value in `.env`
- Enable Trust server certificate for this local development instance.

Database files live in the `sqlserver-data` Docker volume and survive
`docker compose down`, but the API's Development startup recreates MDB.
`docker compose down -v` deletes that volume and its data.
The `sa` login and trusted local certificate configuration are for development;
use a dedicated application login and a trusted certificate when deploying.

Changing `.env` after the volume is initialized does not change the existing
SQL Server login password; update the login in SQL Server as well.

## Accounts

The API uses ASP.NET Core Identity with SQL Server through `AuthController`:

- `POST /auth/register` with JSON `{ "email": "you@example.com", "password": "YourStrongPassword1!" }`.
- `POST /auth/login` with the same JSON returns an access token
  and refresh token.
- `GET /api/me` with `Authorization: Bearer <accessToken>` returns your ID and email.
- `POST /auth/refresh` with JSON `{ "refreshToken": "<refreshToken>" }` renews tokens.

Identity tokens are opaque bearer tokens, not JWTs. Keep tokens out of logs and
source control. Data protection keys persist in the `api-keys` Docker volume
so container replacement does not invalidate tokens.

Email confirmation, password recovery, and two-factor authentication endpoints
are not implemented yet. Account email confirmation is not currently required.
School and membership tables are included. Progress tracking is not implemented.

## Platform administrator and schools

Set `MDB_ADMIN_EMAIL` and `MDB_ADMIN_PASSWORD` in the Git-ignored `.env` file.
Docker passes these to `SeedAdmin:Email` and `SeedAdmin:Password`. The development
seed creates that user with the Identity role `PlatformAdmin`. Public registration
cannot assign this role. Passwords are hashed by Identity, not stored as plaintext
in the database. The seeded account has its email marked confirmed for development.

Sign in through `POST /auth/login` with the seeded credentials, then use its
access token as a Bearer token:

```http
POST /api/schools
Content-Type: application/json
Authorization: Bearer <admin-access-token>

{
  "name": "Brisbane Salsa",
  "slug": "brisbane-salsa"
}
```

Returns `201 Created` with the school's ID, name, and slug. The Location header
points to `GET /api/schools/{id}`. Both endpoints require `PlatformAdmin`:
unauthenticated requests get 401 and ordinary users get 403. Duplicate slugs
return 409; invalid input returns 400. Slugs are stored lowercase.
Creating a school does not create memberships; membership management comes next.

After changing the API, run `docker compose up --build -d` to rebuild.
Use HTTPS when deploying.

Run `pwsh -File scripts/Test-Auth.ps1` against the running Docker stack to test
registration, validation, login, protected access, refresh, and account lockout.
Each run leaves one disposable `smoke-...@example.com` account in the database.
