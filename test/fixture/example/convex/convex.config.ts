import { defineApp } from "convex/server";
import fixture from "jive-abstract-connector-package-registry-fixture/convex.config.js";

const app = defineApp();
app.use(fixture);

export default app;
