<p align="center">
  <img src="docs/moirae-demo.gif" width="800" alt="Five Raft nodes on a timeline. A partition cuts two of them off; they turn amber again and again trying to elect a leader, every vote request dies at the wall, and they never turn blue. The other three keep their leader. When the wall lifts, one election settles it.">
</p>

# moirae

**Deterministic simulation testing for distributed systems, in TypeScript.** Run Raft, Paxos or
your own protocol under injected faults. Every failure is a seed that replays byte for byte, and a
trace you can scrub through.

[![moirae-core on npm](https://img.shields.io/npm/v/moirae-core?label=moirae-core)](https://www.npmjs.com/package/moirae-core)
[![ci](https://github.com/pchrysostomou/moirae/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/pchrysostomou/moirae/actions/workflows/ci.yml)
[![node 20 | 22 | 24](https://img.shields.io/badge/node-20%20%7C%2022%20%7C%2024-3c873a)](.github/workflows/ci.yml)
[![licence Apache-2.0](https://img.shields.io/badge/licence-Apache--2.0-blue)](LICENSE)

**Try it in ten seconds.** With Node 20 or newer:

```
npx moirae demo
```

That runs the scenario above, prints what happened, writes `moirae-demo.jsonl`, and opens it in
the studio. Or open the same trace in your browser with nothing installed:
[pchrysostomou.github.io/moirae](https://pchrysostomou.github.io/moirae/?trace=clean-partition.jsonl).

You just watched five Raft nodes lose their network for two seconds. The two on the wrong side of
the wall tried twelve times to elect a leader and never could — every vote request died at the
wall. The three on the right side kept theirs. When the wall came down, one election settled it,
and a node that crashed came back with its log intact.

This is v0: three protocols (Raft, single-decree Paxos and the ABD atomic register), no trace
shrinking, no Byzantine faults, no membership changes, no pre-vote, nothing hosted but the viewer.
If you arrived expecting Antithesis, this is the small, readable TypeScript end of that idea — not
a replacement for it.

That run is not a recording of luck. It is seed 19, and `npx moirae demo` replays it byte for byte
on your machine. Any trace opens the same way: `npx moirae replay some-trace.jsonl`.

## What it is

moirae is deterministic simulation testing for distributed systems, in TypeScript. You write a
protocol against a small interface, run it under a deterministic scheduler with injected faults —
latency, loss, duplication, partitions, crashes — and when an invariant breaks you get a seed that
reproduces the failure exactly, and a trace you can scrub through.

The engine is small and has no dependencies. Raft ships as the proof that the interface is enough:
a transcription of the paper, with each of the ten classically mis-implemented rules tested
against its naive form, including the Figure 8 sequence. Single-decree Paxos and the ABD atomic
register sit beside it, built the same way from their papers.

## Install

```
npm install moirae-core moirae-protocols
```

**npm currently has 0.1.x, which is Raft only.** Paxos and ABD are on `main` as 0.2.0, and the
npm release of it is pending.

`moirae-core` is the engine, with no dependencies. `moirae-protocols` is the protocols, each with
its safety invariants, to run under the engine or to copy as a starting point. Both need Node 20
or newer. The `moirae` package is the CLI behind `npx moirae`: `demo`, `replay`, and the studio
bundled with them.

An engine written in Rust can write the same trace format: `cargo add moirae-trace`, and
`moirae-sched` for the scheduler ([ADR-009](docs/DECISIONS.md)).

## Write a protocol

```ts
// examples/src/ping.ts — the protocol in the README, kept real: this file is
// typechecked and linted under the same rules as the shipped protocols, and
// CI asserts that the README's copy is identical to it.

import { simulate, type Ctx, type Process, type SimulationResult } from 'moirae-core';

interface State {
  count: number;
  [field: string]: unknown;
}

// Every node pings its first peer on a timer. Time, randomness and timers
// come from ctx, and from nowhere else.
class Ping implements Process<State> {
  init(ctx: Ctx<State>): State {
    ctx.setTimer('tick', ctx.randomInt(10, 30));
    return { count: 0 };
  }
  onTimer(ctx: Ctx<State>): void {
    ctx.state.count++;
    ctx.send(ctx.peers[0] as number, { type: 'ping', n: ctx.state.count });
    ctx.setTimer('tick', 30);
  }
  onMessage(ctx: Ctx<State>): void {
    ctx.state.count++;
  }
}

export function run(): SimulationResult {
  return simulate<State>({
    seed: 0xc0ffee,
    nodes: 3,
    process: Ping,
    until: { simTime: 5_000 },
    network: {
      latency: [10, 50],
      dropRate: 0.02,
      partitions: [{ groups: [[1], [2, 3]], start: 1000, end: 2000 }],
    },
    faults: { crashes: [{ node: 2, at: 2500, restartAt: 3000 }] },
    invariants: [
      {
        name: 'countNeverNegative',
        check: (world) => (world.nodes.some((n) => n.state !== null && n.state.count < 0) ? 'negative' : null),
      },
    ],
  });
}

// run().violation is null, or { invariant, detail, step, time } — and the seed
// above reproduces it. run().jsonl is the trace: `npx moirae replay` opens it.
```

A process sees the world only through `ctx`. There is no other way to get the time, a random
number, or a timer, and a lint rule keeps it that way.

## Architecture

Three pieces, and a file between them.

```
   you write                  moirae runs                                 you look
+------------------+     +------------------------------------+     +--------------------+
|  Process         | --> |  engine  (moirae-core)             | --> |  trace.jsonl       | --> studio:
|    init          |     |    clock, (time, seq) event queue, |     |    one event per   |     scrub it,
|    onMessage     |     |    PRNG, network model, faults,    |     |    line; versioned |     or write
|    onTimer       |     |    invariants                      |     |    the contract    |     your own
+------------------+     +------------------------------------+     +--------------------+
```

<!-- TODO(pchrysostomou): studio GIF goes here. Record the studio itself on the seed-19 trace:
     the scrubber moving through the partition, a message selected and its detail panel open,
     the state panel updating. Something like:
     <p align="center"><img src="docs/moirae-studio.gif" width="800" alt="..."></p> -->

- **Engine** — [`packages/core`](packages/core), published as `moirae-core`: the clock, the
  `(time, seq)` event queue, the PRNG, the network model, fault injection and invariant checking.
  Zero dependencies.
- **Protocols** — [`packages/protocols`](packages/protocols), `moirae-protocols`: `Process`
  implementations. Raft, single-decree Paxos and the ABD register today, each transcribed from
  its paper ([`docs/RAFT.md`](docs/RAFT.md), [`docs/PAXOS.md`](docs/PAXOS.md),
  [`docs/ABD.md`](docs/ABD.md)).
  [`examples`](examples) holds the fixed scenarios, with their trace hashes pinned in CI, and the
  sample above.
- **Studio** — [`apps/studio`](apps/studio): a pure function of a trace file. It imports one type
  from the engine and nothing else.
- **Rust** — [`crates/moirae-trace`](crates/moirae-trace) writes the trace format byte for byte as
  the engine does, and [`crates/moirae-sched`](crates/moirae-sched) is the engine's PRNG and
  scheduling policies for simulators written in Rust ([ADR-009](docs/DECISIONS.md)). Neither
  simulates; the TypeScript engine stays the canonical implementation of the format.

The data flow is `simulate()` → `trace.jsonl` → studio, and **the trace file is the contract**:
versioned JSONL, one self-describing event per line. Anyone can write another viewer against it,
or replace the engine behind it, without touching the other side.

- The interfaces, precisely: [`docs/SPEC.md`](docs/SPEC.md).
- Why TypeScript, and why the engine has zero dependencies: [`docs/DECISIONS.md`](docs/DECISIONS.md)
  (ADR-001 and ADR-004).

## How it compares

Four tools that share the idea and differ in where they draw the line.

| | What runs | How you use it | Faults | When something breaks | Language, licence |
| --- | --- | --- | --- | --- | --- |
| **moirae** | Your protocol, in-process, on a simulated clock and network | Implement `Process` against `Ctx`, call `simulate()` | Latency, loss, duplication, partitions, crashes and restarts | A seed that replays byte for byte, and a trace the studio scrubs through | TypeScript, Apache-2.0 |
| [Antithesis](https://antithesis.com/) | Your whole system as containers, dependencies and clients included, in a deterministic hypervisor | Ship containers, write assertions with its SDKs | A wide range, including network partitions and node kills | Every bug reproduces in the same environment | Commercial, hosted |
| [madsim](https://github.com/madsim-rs/madsim) | Your Rust async code on a tokio-compatible simulated runtime | Swap dependencies for their madsim versions behind a cfg flag | Failure injection on simulated I/O | Deterministic: the same seed reproduces the run | Rust, Apache-2.0 |
| [Jepsen](https://jepsen.io/) | Real processes on real nodes, driven over SSH | Write a test in Clojure: client, nemesis, checker | Partitions, clock skew, process kills | A history the checker analyses for consistency violations | Clojure, open source |

moirae is the small end of this: an engine of a few files with no dependencies, protocols
transcribed from their papers, and a trace file as the contract between the two and the viewer.
If the system you need to test cannot be rewritten against a small interface, the other three are
built for that.

## Contribute a protocol

The protocols still to transcribe are open issues under the
[`help-wanted`](https://github.com/pchrysostomou/moirae/labels/help-wanted) label, each naming
the paper to work from. Smaller entry points are under
[`good-first-issue`](https://github.com/pchrysostomou/moirae/labels/good-first-issue).
[CONTRIBUTING.md](CONTRIBUTING.md) is the bar: a protocol is a transcription of its paper, tested
against the mistakes people actually make when they implement it.

## Reading

- [A negative claim is satisfied by an empty stage](docs/writing/negative-assertions.md) — why a
  test that asserts something did not happen must also prove it could have, through three cases
  from this project.
- [Devlog](docs/devlog.md) — what broke while building this, phase by phase, and what each break
  changed.

## Determinism, enforced

Same seed, same trace, byte for byte — across runs, machines and Node versions. CI hashes the
example traces on Node 20, 22 and 24 on every push; an engine change that alters a single byte
fails the build. When a fuzz run finds a violation, the seed is the whole bug report.

Apache-2.0.
