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
through its environment. EF Core and Identity still need to be added before
the API creates the MDB database or stores any application data.

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
