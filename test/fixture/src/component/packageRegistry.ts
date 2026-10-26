import { v } from "convex/values";
import { action } from "./_generated/server";

const claims = v.object({
  provider: v.literal("github"),
  repository: v.object({ owner: v.string(), name: v.string() }),
  workflowFile: v.string(),
  environment: v.optional(v.string()),
});

/** The account an operation acts as; its caller supplies it on every call, so the component stores no credential. */
const account = v.object({ token: v.string() });

const secondFactorRequired = v.object({
  status: v.literal("secondFactorRequired"),
  approval: v.optional(v.object({ pageUrl: v.string(), resultUrl: v.string() })),
});

function notImplemented(name: string): never {
  throw new Error(`packageRegistry.${name} is not implemented yet`);
}

/** Whether the registry has any version of the package. */
export const packageExists = action({
  args: { packageName: v.string() },
  returns: v.boolean(),
  handler: async () => notImplemented("packageExists"),
});

/** Creates the package by publishing an empty placeholder version as `account`; an existing package is reported, not touched. */
export const createPlaceholder = action({
  args: { packageName: v.string(), account, oneTimePassword: v.optional(v.string()) },
  returns: v.union(
    v.object({ status: v.literal("created"), version: v.string() }),
    v.object({ status: v.literal("alreadyExists") }),
    secondFactorRequired,
  ),
  handler: async () => notImplemented("createPlaceholder"),
});

/** The trusted publishers configured on the package, as seen by an account that maintains it. */
export const listTrustedPublishers = action({
  args: { packageName: v.string(), account },
  returns: v.array(v.object({ id: v.string(), claims })),
  handler: async () => notImplemented("listTrustedPublishers"),
});

/** Lets one CI workflow publish the package with its OIDC identity; an identical publisher is reported, not added again. */
export const registerTrustedPublisher = action({
  args: { packageName: v.string(), publisher: claims, account, oneTimePassword: v.optional(v.string()) },
  returns: v.union(
    v.object({ status: v.literal("registered") }),
    v.object({ status: v.literal("alreadyRegistered"), id: v.string() }),
    secondFactorRequired,
  ),
  handler: async () => notImplemented("registerTrustedPublisher"),
});
