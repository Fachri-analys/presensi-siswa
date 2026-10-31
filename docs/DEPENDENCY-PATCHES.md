# Dependency Patches

## `braces`

The root lockfile pins `braces@3.0.3` to the immutable commit `28d440b5dd449dbf1fe6f3506cf94ecca4d02660` from the public `FSDevelop/braces` fork. The lockfile records a SHA-512 integrity value. This is a development dependency reached through `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch`; it is omitted from the frontend production runtime image.

The pinned tree includes the 100-level nesting limit and regression coverage from [upstream PR #72](https://github.com/micromatch/braces/pull/72). The repository test checks that depth 101 is rejected and a normal brace pattern still works. It also checks that the lockfile continues to reference this reviewed commit and integrity value.

GitHub later [withdrew GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), stating that it was not practically exploitable. The fork pin remains defense in depth until an official npm release provides the fix. Recheck the official package and remove this override when an official patched release is available. `npm audit` could not be completed from the current desktop because the npm registry is unreachable; the CI audit step remains the release gate.
