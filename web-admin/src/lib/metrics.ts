import client from "prom-client";

type MetricsSingleton = {
  register: typeof client.register;
  httpRequestsTotal: client.Counter<string>;
  httpRequestDuration: client.Histogram<string>;
};

const globalForPrometheus = globalThis as unknown as {
  __fsmMetrics?: MetricsSingleton;
};

function getMetrics(): MetricsSingleton {
  if (!globalForPrometheus.__fsmMetrics) {
    const register = client.register;

    // Évite le double enregistrement au hot-reload
    register.clear();
    client.collectDefaultMetrics({ register, prefix: "fsm_web_admin_" });

    const httpRequestsTotal = new client.Counter({
      name: "fsm_http_requests_total",
      help: "Nombre total de requêtes HTTP",
      labelNames: ["method", "route", "status_code"],
      registers: [register],
    });

    const httpRequestDuration = new client.Histogram({
      name: "fsm_http_request_duration_seconds",
      help: "Durée des requêtes HTTP en secondes",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [register],
    });

    globalForPrometheus.__fsmMetrics = {
      register,
      httpRequestsTotal,
      httpRequestDuration,
    };
  }

  return globalForPrometheus.__fsmMetrics;
}

export const register = getMetrics().register;
export const httpRequestsTotal = getMetrics().httpRequestsTotal;
export const httpRequestDuration = getMetrics().httpRequestDuration;

export function observeHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number,
) {
  const { httpRequestsTotal, httpRequestDuration } = getMetrics();
  const labels = {
    method,
    route,
    status_code: String(statusCode),
  };
  httpRequestsTotal.inc(labels);
  httpRequestDuration.observe(labels, durationSeconds);
}
