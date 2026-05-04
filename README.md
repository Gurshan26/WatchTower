# WatchTower - Full-Stack Observability

Traces, metrics, logs, and error tracking. No Grafana. No Datadog. No external services.
Just a Next.js app watching itself.

## What it does

WatchTower collects OpenTelemetry data from itself, stores it in SQLite, and shows it
in a real-time dashboard. The trace waterfall is hand-built. The OTLP collector is a
custom API route. The chaos console lets you trigger real errors and watch them appear
in the dashboard live.

The self-observing bit: The OTel SDK sends traces to `/api/otlp/v1/traces` - which
is a route in the same app. So when you load the dashboard, those HTTP requests get
traced, and you can see them in the trace explorer.

## Run it

```bash
npm install
npm run dev
# http://localhost:3000/dashboard
```

72 hours of synthetic historical data seeds automatically on first run.

## Test it

```bash
npm test
```

## Screenshots + video script

```bash
npm run demo:shots
```

## Record Full Demo Video

```bash
npm run demo:video
```

This runs an automated end-to-end walkthrough (overview, traces, logs, metrics, errors, chaos triggers)
and saves a real browser recording to `docs/demo/watchtower-demo-*.webm`.

## Deploy to Vercel

```bash
vercel deploy
```

Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL after first deploy.
Data uses `/tmp` storage on Vercel and resets between cold starts.
