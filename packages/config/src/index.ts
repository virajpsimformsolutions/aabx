export interface AabxConfig {
  output: string;
  bundletoolVersion: string;
  installAfterBuild: boolean;
  clean: boolean;
}

const defaultConfig: AabxConfig = {
  output: "./dist",
  bundletoolVersion: "latest",
  installAfterBuild: false,
  clean: true,
};

export function loadConfig(): AabxConfig {
  return defaultConfig;
}
