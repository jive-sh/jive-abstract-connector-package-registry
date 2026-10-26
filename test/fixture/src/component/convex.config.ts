import { defineComponent } from "convex/server";

// Declare the environment variables this connector reads, e.g. defineComponent(name, { env: { API_TOKEN: v.string() } }).
// The installing app supplies their values in app.use(component, { env }).
export default defineComponent("fixture");
