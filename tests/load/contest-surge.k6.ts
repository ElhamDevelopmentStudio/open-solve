import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 200 },
    { duration: "2m", target: 1000 },
    { duration: "30s", target: 0 },
  ],
};

const baseUrl = __ENV.LOADTEST_BASE_URL ?? "http://localhost:3000";

export default function contestSurgeScenario() {
  const res = http.get(`${baseUrl}/contests`);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "no errors": (r) => typeof r.body === "string" && !r.body.includes("error"),
  });
  sleep(1);
}
