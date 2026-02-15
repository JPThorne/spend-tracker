import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  duration: "10s",
};

const baseUrl = __ENV.API_BASE_URL || "https://localhost:5001";
const apiKey = __ENV.API_KEY || "";

export default function () {
  const headers = apiKey ? { "x-api-key": apiKey } : {};

  const healthResponse = http.get(`${baseUrl}/health`, { headers });
  check(healthResponse, {
    "health endpoint returns 200": (res) => res.status === 200,
  });

  const transactionsResponse = http.get(`${baseUrl}/api/transactions`, { headers });
  check(transactionsResponse, {
    "transactions endpoint returns 200 when API key set": (res) =>
      apiKey ? res.status === 200 : res.status === 401,
  });

  sleep(1);
}