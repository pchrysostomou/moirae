# Changelog

Notable changes to the npm packages (`moirae`, `moirae-core`, `moirae-protocols`) and the Rust
crates (`moirae-trace`, `moirae-sched`). The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are the npm versions unless a
crate is named; PR numbers are on
[github.com/pchrysostomou/moirae](https://github.com/pchrysostomou/moirae/pulls).

## [Unreleased]

Everything on `main` since v0.1.1. None of it is on npm yet.

### Added

- Single-decree Paxos, transcribed from *Paxos Made Simple*, with pinned-hash engine scenarios
  and a 200-seed fuzz gate (#44). Paxos traces render with role and ballot in the studio (#46).
- The single-writer ABD atomic register (Attiya, Bar-Noy and Dolev 1995), with engine scenarios,
  a fault matrix, a 200-seed fuzz run and a bounded history checker as test infrastructure
  (#47, #48; by Loofy).
- Trace format v2: the header carries the time unit, crash events carry optional field lists,
  a `queue-full` drop reason, log namespacing (SPEC §5). Integers past 2^53 travel as digit
  strings (#49, #55).
- Rust crates for engines written in Rust, with the TypeScript engine staying canonical
  (ADR-009): `moirae-trace`, a byte-exact JSONL writer with a verifying sink and the trace hash,
  and `moirae-sched`, the engine's PCG32 seeding, named substreams, and the Uniform and PCT
  scheduling policies (#49, #50, #51). On crates.io as 0.0.2 since 2026-09-05.
- Studio fixtures from a foreign engine, ananke, pinned to that engine's trace hash
  (#51, #52, #54).
- `scripts/gate.sh`: every CI check as one command, run before every commit (#53).
- Docs: CONTRIBUTING (#19, #20); the devlog (#15, #16, #21, #35); the negative-assertions essay
  (#16, #17); a Reading section in the README (#18); a section index for the Raft ATC paper
  (#42, by Arush Khasru).

### Fixed

- CLI: a v2 crash event without field lists summarises as crashed, not as undefined (#52).
- `moirae-sched`: `Scheduler` is `Send`, so an executor can hold it behind a mutex (#50). PCT
  change points are a geometric process over polls (#49).

## [0.1.1] — 2026-08-30

### Fixed

- The `moirae` CLI republished from the unscoped-name commit so the registry matches v0.1.0
  (#14). No functional change.

## [0.1.0] — 2026-08-30

First release: `moirae`, `moirae-core` and `moirae-protocols` on npm.

### Added

- The engine (`moirae-core`): clock, `(time, seq)` event queue, PRNG, `simulate()`, and the
  determinism test that pins a seed to a byte-identical trace (#2).
- Network model and fault injection: latency, loss, duplication, partitions, crashes and
  restarts; invariants (#3).
- Raft, transcribed from the paper: election, replication, the §5.4 restrictions, persistence;
  each classically mis-implemented rule tested against its naive form, Figure 8 included (#5).
- Two fixed scenarios, `clean-partition` (the demo, seed 19) and `harsh`, with pinned trace
  hashes (#6).
- The studio: a React trace viewer that is a pure function of a trace file (#7).
- The `moirae` CLI: `npx moirae demo` and `npx moirae replay <trace>`, with the studio bundled
  (#9).
- The workspace, the nondeterminism lint rule, and CI (#1, #4).

[Unreleased]: https://github.com/pchrysostomou/moirae/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/pchrysostomou/moirae/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/pchrysostomou/moirae/releases/tag/v0.1.0
