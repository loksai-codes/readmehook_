# ledgerd

A double-entry accounting daemon with a gRPC API.

## How it works 🔧

1. Clients send transactions over gRPC.
2. `ledgerd` validates that debits equal credits.
3. Entries are appended to a write-ahead log, then applied to Postgres.

```text
client -> grpc -> validator -> WAL -> postgres
```

## Getting started

Build from source with Go 1.22+:

```bash
go install github.com/ledgerd/ledgerd/cmd/ledgerd@latest
ledgerd --config ./ledgerd.yaml
```
