# MDB

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
through its environment. The API calls EF Core `EnsureCreatedAsync` at startup
to create the MDB database and Identity tables if they do not exist.
There are no migrations. `EnsureCreated` does not update existing schemas;
schema changes will need a deliberate database update or recreation during
development. Never delete a database containing data you need to keep.

To connect from SQL Server Management Studio on Windows:

- Server: `localhost,14330`
- Authentication: SQL Server Authentication
- Login: `sa`
- Password: the value in `.env`
- Enable Trust server certificate for this local development instance.

Database files live in the `sqlserver-data` Docker volume and survive
`docker compose down`. `docker compose down -v` deletes that volume and its data.
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
There are no school tenants or progress tables yet.

After changing the API, run `docker compose up --build -d` to rebuild.
Use HTTPS when deploying.

Run `pwsh -File scripts/Test-Auth.ps1` against the running Docker stack to test
registration, validation, login, protected access, refresh, and account lockout.
Each run leaves one disposable `smoke-...@example.com` account in the database.
