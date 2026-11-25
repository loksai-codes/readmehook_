<p align="center">
  <img src="./docs/logo.png" alt="Relay logo" width="120" />
</p>

# Relay

[![CI](https://github.com/acme/relay/actions/workflows/ci.yml/badge.svg)](https://github.com/acme/relay/actions)
[![npm](https://img.shields.io/npm/v/@acme/relay.svg)](https://www.npmjs.com/package/@acme/relay)

Relay is a tiny event bus for edge functions. Publish from anywhere, subscribe from anywhere.

## Architecture

```mermaid
flowchart LR
  Producer -->|HTTP| Edge[Edge Router]
  Edge --> Queue[(Durable Queue)]
  Queue --> Consumer
```

## Quickstart

```bash
npx create-relay-app my-app
cd my-app
npm run dev
```

## Usage

```ts
import { relay } from '@acme/relay';

await relay.publish('orders.created', { id: 42 });
```

## License

MIT
