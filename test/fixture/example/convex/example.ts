import { v } from "convex/values";
import { components } from "./_generated/api";
import { action } from "./_generated/server";

export const packageExists = action({
  args: { packageName: v.string() },
  returns: v.boolean(),
  handler: (ctx, args) => ctx.runAction(components.fixture.packageRegistry.packageExists, args),
});
