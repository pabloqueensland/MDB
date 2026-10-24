# API integration tests

Requirements: .NET 10 SDK and Docker Desktop running Linux containers.

From the repository root:

```powershell
dotnet test MDB.slnx
```

Or use Visual Studio Test Explorer. The first run restores the test packages
and may download the SQL Server image. The API and frontend do not need to be
running, and you do not need to start Compose.

The suite uses xUnit, WebApplicationFactory, and Testcontainers. Requests run
through the real controllers, Identity authentication/authorization, EF Core,
and SQL Server. It does not fake authentication or use an in-memory database.

One separate SQL Server container is created per test run with a random host
port, no development volume, and an MDB_Tests database. The host runs in Testing
so Development startup is skipped. Its database registration is replaced with
the container connection, then the real seed routine creates a synthetic admin.
The suite does not read your .env or connect to your development SQL Server.
The test container is disposed after the run.

Tests share the fixture but use unique account emails and school slugs. The
API collection runs serially, so tests do not race on the shared database.
No test depends on another test's execution order.

Coverage:

- Registration, duplicate accounts, input validation, login and account lookup.
- Missing/invalid bearer tokens, token refresh, and login lockout.
- Seeded admin access and attempted privilege escalation through registration.
- School creation/retrieval, normalization, duplicate slugs, invalid input, 404s.
- Anonymous and ordinary-user rejection from admin endpoints.
- Membership uniqueness, different roles across schools, and protection against
  deleting existing data when seed credentials are invalid.
- School manager/admin assignment permissions, cross-school isolation, teacher
  access denial, and attempted leadership demotion or privilege escalation.
- Platform-only impersonation, target permissions, nested impersonation denial,
  session revocation/expiry, revoked admin access, and unassigned demo users.
- Move listing/class filters, student and teacher access, school isolation,
  platform-admin access, and empty results for users without memberships.
- Stream/class enrolment access, fractional class levels, lower-level access,
  Salsa On1/On2 and Bachata separation, deactivation, enrolment permissions, and
  database rejection of a class paired with the wrong stream.
- Stream and class creation by platform/school administrators, teacher/student
  denial, duplicate streams, invalid class levels, and cross-school rejection.
- Student mastery persistence, idempotent marking/unmarking, per-student privacy,
  token-derived ownership, and denial after enrolment deactivation.

To run one area:

```powershell
dotnet test MDB.slnx --filter FullyQualifiedName~SchoolsTests
dotnet test MDB.slnx --filter FullyQualifiedName~AuthTests
```

For a report:

```powershell
dotnet test MDB.slnx --logger "trx;LogFileName=api-tests.trx"
```

These are API integration tests, not frontend browser tests. They have been
authored but not executed yet; run them to establish the first verified result.
