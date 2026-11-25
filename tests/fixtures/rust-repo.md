<h1 align="center">ferrite</h1>

<p align="center">A memory-safe, zero-copy log shipper written in Rust.</p>

<p align="center">
  <a href="https://crates.io/crates/ferrite"><img src="https://img.shields.io/crates/v/ferrite.svg" alt="crates.io"></a>
  <a href="https://docs.rs/ferrite"><img src="https://docs.rs/ferrite/badge.svg" alt="docs.rs"></a>
</p>

<p align="center">
  <video src="https://github.com/ferrite-rs/ferrite/raw/main/media/tail.mp4" autoplay muted loop></video>
</p>

## Install

```shell
cargo install ferrite --locked
```

## How it works

ferrite tails files with inotify, batches lines in a lock-free ring buffer
and ships them over HTTP/2 to any OTLP collector.

### Backpressure

When the collector is slow, ferrite spills to disk instead of dropping lines.

## License

Apache-2.0
