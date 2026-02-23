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
k6 run .\api-smoke.js --env API_BASE_URL=http://localhost:5000 --env API_KEY=b8f4e7a9-2c3d-4f5a-9e8b-1d2c3e4f5a6b
```