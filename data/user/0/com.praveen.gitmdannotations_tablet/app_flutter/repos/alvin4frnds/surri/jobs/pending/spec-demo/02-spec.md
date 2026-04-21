# Auth flow — TOTP rollout (demo spec)

End-to-end proof that GitMdScribe can discover a spec on this repo's
`claude-jobs` sidecar branch. Remove the `jobs/` folder from
`claude-jobs` when you're done verifying.

## Overview

Add TOTP as a second factor for the internal admin dashboard. Rollout
in two stages: opt-in beta first, then required after 30 days.

## Goals

- G1. Reduce account-takeover risk from password reuse.
- G2. Keep login frictionless for existing sessions.
- G3. Support recovery without a second device.

## Non-goals

- Hardware keys (FIDO2) in this phase.
- External customer auth — out of scope.

## Open questions

1. Should the flow support magic-link fallback?
2. Refresh-token lifetime when TOTP is active?
3. Recovery-code rotation policy?
4. Do we block legacy sessions on rollout day?

## Implementation sketch

- POST /api/auth/totp/enroll
- GET  /api/auth/totp/challenge
- POST /api/auth/totp/verify

## Changelog

- 2026-04-21 — seeded by GitMdScribe end-to-end test
- 2026-04-21 19:59 tablet: Submitted review of 02-spec.md.
