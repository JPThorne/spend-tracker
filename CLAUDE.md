# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build
cd api && dotnet build

# Run API (http://localhost:5000)
cd api/src/SpendTracker.Api && dotnet run

# Run all tests
cd api && dotnet test

# Run a single test class
dotnet test --filter ClassName=CsvParsingServiceTests

# Run a single test method
dotnet test --filter "Name=ParseAndImportCsvAsync_WithValidCsv_ImportsTransactionsAndSaves"

# Watch mode
cd api && dotnet watch test
```

## Architecture

**.NET 10 + vanilla JS spend tracker** — bank CSV import, categorization, and reporting. The API is a self-hosted Windows tray app (`WinExe`, `net10.0-windows`) that serves both the REST API and the frontend. Once `dotnet run` is started, the full app (UI + API) is available at `http://localhost:5000` — no separate web server is needed.

**Project layout** (`api/`):

| Project | Role |
|---|---|
| `SpendTracker.Domain.Abstractions` | Entities, repository interfaces, service interfaces, shared DTOs |
| `SpendTracker.Domain` | Service implementations, bank CSV parsers |
| `SpendTracker.Infrastructure` | EF Core + SQLite, DbUp migrations, repository implementations |
| `SpendTracker.Api` | ASP.NET Core controllers, middleware, Windows tray host |
| `SpendTracker.Api.UnitTests` | xUnit + Moq unit tests |

**Data flow for CSV import:**
Controller → `TransactionService.UploadCsvAsync` → `CsvParsingService.ParseAndImportCsvAsync` → bank-specific parser (Nedbank/Investec/ABSA, each implementing `ICsvParser`) → duplicate check via `ITransactionRepository.ExistsAsync` → bulk save with a `UploadBatchId` (Guid).

**Database migrations** run automatically at startup via `DatabaseUpgrader` (DbUp). Migration scripts live in `SpendTracker.Infrastructure/DatabaseMigrations/Scripts/` as embedded resources.

**ServiceResult pattern:** Services return `ServiceResult<T>` with a `ServiceErrorType` enum rather than throwing. Controllers map these to HTTP responses.

## Project notes

**`web/` vs `wwwroot/`:** `web/` is the source-of-truth directory for frontend edits and is tracked in git for convenience. The API actually serves static files from `api/src/SpendTracker.Api/wwwroot/`, which is a manual mirror of `web/` — there is no automated sync. When editing frontend files, update both locations and commit them together.

## Key files

- `api/src/SpendTracker.Api/Program.cs` — DI registration and middleware pipeline
- `api/src/SpendTracker.Domain/Services/CsvParsing/` — one file per bank format
- `api/src/SpendTracker.Infrastructure/DatabaseMigrations/Scripts/001_InitialCreate.sql` — full schema
- `web/app.js` — all frontend logic (single file, ~39 KB)
