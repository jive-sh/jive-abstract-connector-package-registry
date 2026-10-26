# jive-abstract-connector-package-registry

A Jive abstract for **package-registry connectors**: connectors to npm, GitHub Packages, JSR and the like. It
extends [`jive-abstract-connector`](https://github.com/jive-sh/jive-abstract-connector), which makes a connector a
Convex component published to npm, and adds the contract every registry connector implements, so an app such as
`@jive-sh/server` calls any registry the same way. Its CLI is `jive-connector-package-registry`.

## The contract

A connector of this kind exposes five actions in the module `packageRegistry`
(`src/component/packageRegistry.ts`). The exported type `PackageRegistryComponentApi` is the contract. They
cover the first two of the three steps by which Jive provisions a new package:

1. `createPlaceholder` creates the package by publishing an empty version as a person's account.
2. `registerTrustedPublisher` lets the package's CI workflow (`pipeline.yml` in its repository) publish it.
3. CI publishes every real version with its OIDC identity.

npm expires a trusted-publisher configuration whose first publish hasn't happened within 2 days; the expired one
stays listed but "can no longer be used or edited", and the remedy is to delete it and create a new one
([npm docs](https://docs.npmjs.com/trusted-publishers#trusted-publisher-configuration-expiry)). So a caller
registers the publisher only when that workflow is about to run, and replaces one that never published with
`removeTrustedPublisher` and `registerTrustedPublisher`.

| Function | Arguments | Returns |
| --- | --- | --- |
| `packageExists` | `{ packageName }` | `boolean` |
| `createPlaceholder` | `{ packageName, account }` | `{ status: "created", version }` \| `{ status: "alreadyExists" }` \| `{ status: "maintainedByAnotherAccount" }` |
| `listTrustedPublishers` | `{ packageName, account }` | `Array<{ id, claims, status: "validated" \| "unvalidated" }>` |
| `registerTrustedPublisher` | `{ packageName, publisher, account }` | `{ status: "registered" }` \| `{ status: "alreadyRegistered", id }` |
| `removeTrustedPublisher` | `{ packageName, id, account }` | `{ status: "removed" }` \| `{ status: "notFound" }` |

- A **trusted publisher** lets one CI workflow publish the package with its OIDC identity instead of a token.
  `publisher` (and each listed publisher's `claims`) is `{ provider: "github", repository: { owner, name },
  workflowFile, environment? }`, e.g. `{ provider: "github", repository: { owner: "jive-sh", name: "skill-sync" },
  workflowFile: "pipeline.yml", environment: "latest" }`.
- A listed publisher is **`validated`** once a version of the package was published through it, after which it
  never expires, and **`unvalidated`** otherwise. An unvalidated publisher is either waiting for its first
  publish or expired; the registry does not say which, and the caller that registered it knows when it did.
- **`account`** is `{ token, secondFactor: { type: "totp", secret } }`: one person's own account on the
  registry. `token` is from that person's login; `secret` is the shared secret of the account's authenticator
  app (RFC 6238, base32). When the registry asks for the second factor, the connector computes the current code
  from it and retries; it never returns or logs the secret or a code. A connector stores no credentials;
  whoever calls it passes the account to act as on every call, so one installed connector serves every person's
  account, and where credentials are kept is the caller's decision.
- **`createPlaceholder`** never touches an existing package. It answers `alreadyExists` only when `account`
  maintains the package, and `maintainedByAnotherAccount` when it doesn't, so a caller never goes on to
  register a publisher on someone else's package.
- Every write is idempotent: an existing package is `alreadyExists`, a publisher with the same claims
  `alreadyRegistered` (whatever its status), a publisher already deleted `notFound`.

```ts
// An app calling whichever registry connector it installed as `registry`
import type { PackageRegistryComponentApi, RegistryAccount } from "jive-abstract-connector-package-registry";

async function allowPipelineToPublish(ctx: ActionCtx, registry: PackageRegistryComponentApi, account: RegistryAccount) {
  return await ctx.runAction(registry.packageRegistry.registerTrustedPublisher, {
    packageName: "jive-abstract-connector",
    publisher: { provider: "github", repository: { owner: "jive-sh", name: "jive-abstract-connector" }, workflowFile: "pipeline.yml", environment: "latest" },
    account,
  });
}
```

## Create a registry connector

```sh
bunx jive-connector-package-registry create jive-connector-package-registry-example
```

The scaffold declares all five functions with validators that match the contract and handlers that throw
"not implemented", so it builds from the start. Everything else (layout, `codegen`, the hooks, environment
variables) is `jive-abstract-connector`'s; see its README.

## What this abstract adds to the hooks

`build` compiles a check that the component's generated `ComponentApi` has every contract function with exactly
the contract's kind, arguments and return type, and fails naming each one that is missing or differs:

```text
error TS2322: Type 'true' is not assignable to type '"packageRegistry.packageExists is missing"'.
```

A connector may expose more functions than the contract's. The contract is a type only: a connector depends on
this package as a dev dependency, and nothing of it ships in an installing app.

## Open questions

- A registry whose second factor is not an authenticator code (a security key alone, or browser approval) has
  no answer in this contract yet.
- GitHub Actions is the only trusted-publisher provider.
- `packageExists` takes no account, so it sees public packages only.
