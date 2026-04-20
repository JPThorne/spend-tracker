import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  duration: "10s",
};

const baseUrl = __ENV.API_BASE_URL || "https://localhost:5001";

export default function () {
  const healthResponse = http.get(`${baseUrl}/health`);
  check(healthResponse, {
    "health endpoint returns 200": (res) => res.status === 200,
  });

  const transactionsResponse = http.get(`${baseUrl}/api/transactions`);
  check(transactionsResponse, {
    "transactions endpoint returns 200": (res) => res.status === 200,
  });

  sleep(1);
}