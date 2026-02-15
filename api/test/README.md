# SpendTracker Tests

This folder contains unit tests and lightweight API integration tests.

## Unit Tests (xUnit)
Run the unit tests from the repo root:

```bash
dotnet test tests/SpendTracker.Api.UnitTests/SpendTracker.Api.UnitTests.csproj
```

### Coverage
The project includes `coverlet.collector`. Collect coverage with:

```bash
dotnet test tests/SpendTracker.Api.UnitTests/SpendTracker.Api.UnitTests.csproj /p:CollectCoverage=true
```

## API Integration Tests (k6)
See `tests/k6/README.md` for usage.