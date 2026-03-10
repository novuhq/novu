import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { MetricReader, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;

/**
 * Build the base resource.
 *
 * OTEL_SERVICE_NAME / OTEL_SERVICE_VERSION env vars take precedence over the
 * programmatic values so operators can override them at deploy time without a
 * code change. The NodeSDK also runs envDetector + processDetector by default
 * (controlled by OTEL_NODE_RESOURCE_DETECTORS) which merges OTEL_RESOURCE_ATTRIBUTES.
 */
function buildResource(serviceName: string, version: string) {
  return resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? serviceName,
    [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION ?? version,
    'service.group': 'novu',
    'deployment.environment': process.env.NODE_ENV ?? 'development',
  });
}

/**
 * Starts the OpenTelemetry SDK.
 *
 * MUST be called before any other imports (especially before newrelic and NestJS
 * bootstrap) so auto-instrumentations can properly patch HTTP, MongoDB, Bull, etc.
 *
 * All standard OTEL SDK environment variables are honoured natively — no custom
 * parsing needed. Plug in any OTLP-compatible backend with:
 *
 *   ENABLE_OTEL=true
 *   OTEL_SERVICE_NAME=novu-api
 *   OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.us.signoz.cloud:443
 *   OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key=<key>
 *
 * Works out-of-the-box with: SigNoz, Datadog, Sumo Logic, Grafana Cloud,
 * Honeycomb, Jaeger, OpenTelemetry Collector, and anything else that speaks OTLP.
 *
 * Signal-specific overrides also work:
 *   OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
 *   OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
 *   OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
 *   OTEL_EXPORTER_OTLP_TRACES_HEADERS
 *   OTEL_EXPORTER_OTLP_PROTOCOL                     (http/protobuf | http/json | grpc)
 *   OTEL_EXPORTER_OTLP_TIMEOUT
 *   OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE  (cumulative | delta | lowmemory)
 *   OTEL_METRIC_EXPORT_INTERVAL                     (ms, default: 60000)
 *   OTEL_METRIC_EXPORT_TIMEOUT                      (ms, default: 30000)
 *   OTEL_NODE_RESOURCE_DETECTORS                    (env,host,os,container,process,...)
 *   OTEL_RESOURCE_ATTRIBUTES                        (key=value,key2=value2)
 *
 * Novu-specific knobs (not standard OTEL):
 *   ENABLE_OTEL=true|false                   (default: false)
 *   ENABLE_OTEL_LOGS=true|false              (default: false — opt-in OTLP log export)
 *   OTEL_LOG_LEVEL=none|error|warn|info|debug|verbose|all  (default: warn — SDK diagnostic logging)
 *   OTEL_PROMETHEUS_PORT=9464                (default: 9464)
 *   OTEL_CAPTURE_DB_STATEMENTS=true|false    (default: false — opt-in; serialises query/command
 *                                             payloads into db.statement spans. Disable in
 *                                             production if queries contain sensitive data.)
 */
export function startOtel(serviceName: string, version: string): NodeSDK | undefined {
  if (process.env.ENABLE_OTEL !== 'true') {
    return undefined;
  }

  if (sdk) {
    return sdk;
  }

  const diagLevel = (process.env.OTEL_LOG_LEVEL ?? 'warn').toLowerCase();
  const levelMap: Record<string, DiagLogLevel> = {
    none: DiagLogLevel.NONE,
    error: DiagLogLevel.ERROR,
    warn: DiagLogLevel.WARN,
    info: DiagLogLevel.INFO,
    debug: DiagLogLevel.DEBUG,
    verbose: DiagLogLevel.VERBOSE,
    all: DiagLogLevel.ALL,
  };

  const prometheusPort = parseInt(process.env.OTEL_PROMETHEUS_PORT ?? '9464', 10);
  const captureDbStatements = process.env.OTEL_CAPTURE_DB_STATEMENTS === 'true';

  /*
   * Metrics readers — both run simultaneously:
   *
   * 1. OTLPMetricExporter (push): sends metrics to your OTLP backend every 60 s.
   *    Reads the same standard env vars as traces/logs:
   *      OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
   *      OTEL_EXPORTER_OTLP_HEADERS  / OTEL_EXPORTER_OTLP_METRICS_HEADERS
   *    This is what SigNoz, Datadog, Grafana Cloud, Honeycomb etc. receive.
   *
   * 2. PrometheusExporter (pull): exposes a scrape endpoint at :OTEL_PROMETHEUS_PORT/metrics.
   *    Useful for self-hosted setups running their own Prometheus/Grafana stack.
   *    Set OTEL_DISABLE_PROMETHEUS=true to skip starting the server.
   */
  const metricExportIntervalMs = parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL ?? '60000', 10);
  const metricExportTimeoutMs = parseInt(process.env.OTEL_METRIC_EXPORT_TIMEOUT ?? '30000', 10);

  const metricReaders: MetricReader[] = [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: metricExportIntervalMs,
      exportTimeoutMillis: metricExportTimeoutMs,
    }),
  ];

  if (process.env.OTEL_DISABLE_PROMETHEUS !== 'true') {
    metricReaders.push(
      new PrometheusExporter({
        port: prometheusPort,
        preventServerStart: false,
        appendTimestamp: true,
      })
    );
  }

  /*
   * logRecordProcessors is how NodeSDK 0.211+ receives log processors.
   * The SDK creates and manages the LoggerProvider internally.
   * OTLPLogExporter with no args reads all standard env vars natively:
   *   OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
   *   OTEL_EXPORTER_OTLP_HEADERS  / OTEL_EXPORTER_OTLP_LOGS_HEADERS
   *
   * When ENABLE_OTEL_LOGS=true the PinoInstrumentation bridge (below) will
   * forward every pino log record to this exporter automatically.
   */
  const logRecordProcessors =
    process.env.ENABLE_OTEL_LOGS === 'true' ? [new BatchLogRecordProcessor(new OTLPLogExporter())] : [];

  sdk = new NodeSDK({
    resource: buildResource(serviceName, version),
    /*
     * OTLPTraceExporter with no args reads all standard env vars natively:
     *   OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
     *   OTEL_EXPORTER_OTLP_HEADERS  / OTEL_EXPORTER_OTLP_TRACES_HEADERS
     *   OTEL_EXPORTER_OTLP_PROTOCOL / OTEL_EXPORTER_OTLP_TIMEOUT
     */
    spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter(), {
        maxQueueSize: 2048,
        scheduledDelayMillis: 5000,
      }),
    ],
    metricReaders,
    // Multiple @opentelemetry/sdk-logs versions coexist via nestjs-otel@6.2.0's
    // older transitive deps — their LogRecordProcessor shapes diverged in 0.202→0.203.
    // biome-ignore lint/suspicious/noExplicitAny: version mismatch workaround
    logRecordProcessors: logRecordProcessors as any,
    contextManager: new AsyncLocalStorageContextManager(),
    textMapPropagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
        new B3Propagator(),
        new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
      ],
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },

        /*
         * MongoDB driver — produces spans with net.peer.name, db.system, etc.
         * that observability tools use to build service maps and show
         * upstream/downstream dependencies. enhancedDatabaseReporting captures
         * command payloads (opt-in via OTEL_CAPTURE_DB_STATEMENTS).
         */
        '@opentelemetry/instrumentation-mongodb': {
          enhancedDatabaseReporting: captureDbStatements,
        },

        /*
         * Mongoose ORM instrumentation disabled — its suppressInternalInstrumentation
         * flag blocks context propagation into the mongodb driver, which kills
         * service-map dependency links. Without suppression it creates duplicate spans.
         * The mongodb driver instrumentation above covers all DB operations with the
         * network-level attributes needed for service maps.
         */
        '@opentelemetry/instrumentation-mongoose': { enabled: false },

        /*
         * IORedis:
         * requireParentSpan=false ensures standalone Redis calls (e.g. cache
         * reads outside of an HTTP request) are still captured as root spans.
         * The default (true) silently drops them.
         *
         * dbStatementSerializer is opt-in for the same PII reason as Mongoose.
         */
        '@opentelemetry/instrumentation-ioredis': {
          requireParentSpan: false,
          ...(captureDbStatements && {
            dbStatementSerializer: (cmdName, cmdArgs) => {
              const args = (cmdArgs as Array<string | Buffer | number>).map(String).join(' ');

              return `${cmdName} ${args}`.trim();
            },
          }),
        },

        /*
         * HTTP: suppress internal health-check / Prometheus-scrape noise so APM
         * dashboards don't get swamped with irrelevant root spans.
         */
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => {
            const url = req.url ?? '';

            return url === '/favicon.ico' || url.startsWith('/health') || url.startsWith('/metrics');
          },
        },

        /*
         * Pino (via nestjs-pino):
         * The instrumentation is already included in getNodeAutoInstrumentations —
         * do NOT add a separate new PinoInstrumentation() or the pino module gets
         * patched twice, causing duplicate log records.
         *
         * What this does:
         *   - Injects trace_id / span_id / trace_flags into every pino JSON log
         *     record while inside a trace context (visible in console output).
         *   - When ENABLE_OTEL_LOGS=true, also bridges pino records to the OTLP
         *     log exporter so logs appear in your APM backend alongside traces.
         *
         * logKeys uses the OTEL semantic-convention field names which most backends
         * (SigNoz, Datadog, Grafana Loki) understand natively for log-trace linking.
         */
        '@opentelemetry/instrumentation-pino': {
          logKeys: {
            traceId: 'trace_id',
            spanId: 'span_id',
            traceFlags: 'trace_flags',
          },
        },
      }),
    ],
  });

  diag.setLogger(new DiagConsoleLogger(), {
    logLevel: levelMap[diagLevel] ?? DiagLogLevel.WARN,
    suppressOverrideMessage: true,
  });

  sdk.start();

  return sdk;
}

export async function shutdownOtel(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = undefined;
  }
}

export function getOtelSdk(): NodeSDK | undefined {
  return sdk;
}
