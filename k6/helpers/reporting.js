import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.3/index.js";

export function getSummary(data) {
  return {
    "reports/result.json": JSON.stringify(data),
    "reports/summary.txt": textSummary(data, {
      indent: " ",
      enableColors: false,
    }),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
