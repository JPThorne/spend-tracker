# k6 API Smoke Tests

This folder contains lightweight API integration tests for the SpendTracker API.

## Prerequisites
- Install [k6](https://k6.io/docs/get-started/installation/).
- Start the API locally (e.g., `dotnet run` from `api/SpendTracker.Api`).

## Environment Variables
- `API_BASE_URL` (default: `https://localhost:5001`)
- `API_KEY` (optional; if set, sent as `x-api-key`)

## Run the smoke test
```bash
k6 run tests/k6/api-smoke.js
```

## Example with env vars
```bash
API_BASE_URL=https://localhost:5001 API_KEY=your-api-key k6 run tests/k6/api-smoke.js
```