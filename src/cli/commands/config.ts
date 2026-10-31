import { validateConfig } from "../../config/validate.js";
import { loadConfig } from "../config-loader.js";

export async function configCommand(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  validateConfig(config);
  console.log("Configuration is valid.");
  console.log(JSON.stringify(config, null, 2));
}
