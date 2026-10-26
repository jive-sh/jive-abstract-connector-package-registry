# jive-abstract-connector-package-registry

A Jive abstract for **package-registry connectors**: connectors to npm, GitHub Packages, JSR and the like. It
extends [`jive-abstract-connector`](https://github.com/jive-sh/jive-abstract-connector), which makes a connector a
Convex component published to npm, and adds the contract every registry connector implements, so an app such as
`@jive-sh/server` calls any registry the same way. Its CLI is `jive-connector-package-registry`.

## The contract

A connector of this kind exposes four actions in the module `packageRegistry`
(`src/component/packageRegistry.ts`). The exported type `PackageRegistryComponentApi` is the contract. They
cover the first two of the three steps by which Jive provisions a new package:

1. `createPlaceholder` creates the package by publishing an empty version as a person's account.
2. `registerTrustedPublisher` lets the package's CI workflow (`pipeline.yml` in its repository) publish it.
3. CI publishes every real version with its OIDC identity.

npm deletes a trusted-publisher configuration whose first publish hasn't happened within 2 days
([npm docs](https://docs.npmjs.com/trusted-publishers#trusted-publisher-configuration-expiry)), so a caller
registers the publisher only when that workflow is about to run.

| Function | Arguments | Returns |
| --- | --- | --- |
| `packageExists` | `{ packageName }` | `boolean` |
| `createPlaceholder` | `{ packageName, account, oneTimePassword? }` | `{ status: "created", version }` \| `{ status: "alreadyExists" }` \| second factor required |
| `listTrustedPublishers` | `{ packageName, account }` | `Array<{ id, claims }>` |
| `registerTrustedPublisher` | `{ packageName, publisher, account, oneTimePassword? }` | `{ status: "registered" }` \| `{ status: "alreadyRegistered", id }` \| second factor required |

- A **trusted publisher** lets one CI workflow publish the package with its OIDC identity instead of a token.
  `publisher` (and each listed publisher's `claims`) is `{ provider: "github", repository: { owner, name },
  workflowFile, environment? }`, e.g. `{ provider: "github", repository: { owner: "jive-sh", name: "skill-sync" },
  workflowFile: "pipeline.yml", environment: "latest" }`.
- **`account`** is `{ token }`: the credential of one person's own account on the registry. A connector stores no
  credentials; whoever calls it passes the account to act as on every call, so one installed connector serves
  every person's account, and where credentials are kept is the caller's decision.
- **Second factor required** is `{ status: "secondFactorRequired", approval?: { pageUrl, resultUrl } }`. Call
  again with `oneTimePassword`: a code from the account's authenticator or, when `approval` is present, what
  `resultUrl` answers with once someone (a person, or an automated browser holding the account's security key)
  approves at `pageUrl`. For npm, `resultUrl` answers 202 while pending and 200 `{ token }` after.
- Both writes are idempotent: an existing package is `alreadyExists`, a publisher with the same claims
  `alreadyRegistered`.

```ts
// An app calling whichever registry connector it installed as `registry`
import type { PackageRegistryComponentApi } from "jive-abstract-connector-package-registry";

async function allowPipelineToPublish(ctx: ActionCtx, registry: PackageRegistryComponentApi, token: string) {
  return await ctx.runAction(registry.packageRegistry.registerTrustedPublisher, {
    packageName: "jive-abstract-connector",
    publisher: { provider: "github", repository: { owner: "jive-sh", name: "jive-abstract-connector" }, workflowFile: "pipeline.yml", environment: "latest" },
    account: { token },
  });
}
```

## Create a registry connector

```sh
bunx jive-connector-package-registry create jive-connector-package-registry-example
```

The scaffold declares all four functions with validators that match the contract and handlers that throw
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

- How a caller obtains and keeps an account's credential, and how the second factor is satisfied without a
  person, are undecided; `oneTimePassword` and `approval` are only the hooks for it.
- GitHub Actions is the only trusted-publisher provider.
- `packageExists` takes no account, so it sees public packages only.
