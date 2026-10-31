import { SUPPORTED_PROVIDER_NAMES } from "../../providers/registry.js";

export function providersCommand(): void {
  console.log("Supported storage providers:");
  for (const name of SUPPORTED_PROVIDER_NAMES) {
    console.log(`  - ${name}`);
  }
}
