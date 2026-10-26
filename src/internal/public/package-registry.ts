import { Option } from "effect";
import type { ConnectorAbstract } from "jive-abstract-connector";
import { packageRegistryScaffold } from "./scaffold";

/** The package-registry kind of connector: `jive-connector` with the `PackageRegistryComponentApi` contract. */
export const packageRegistryAbstract: ConnectorAbstract = {
  cliName: "jive-connector-package-registry",
  description: "scaffold, build, audit and publish a Jive package-registry connector: a Convex component exposing the PackageRegistryComponentApi functions",
  abstractPackageName: "jive-abstract-connector-package-registry",
  contract: Option.some({ componentApiType: "PackageRegistryComponentApi" }),
  scaffold: packageRegistryScaffold,
};
