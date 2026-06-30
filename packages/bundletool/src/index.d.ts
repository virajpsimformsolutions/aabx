export interface SigningConfig {
    keystorePath: string;
    keystorePassword: string;
    keyAlias: string;
    keyPassword: string;
}
export interface BuildApksOptions {
    mode?: "universal";
    signing?: SigningConfig;
}
export declare function ensureBundletool(version: string): Promise<string>;
export declare function resolveBundletoolVersion(version: string): Promise<string>;
export declare function getBundletoolCacheRoot(): string;
export declare function buildUniversalApks(aabPath: string, outApksPath: string, javaBin: string, bundletoolJar: string, options?: BuildApksOptions): Promise<void>;
export declare function extractUniversalApk(apksPath: string, outputDir: string, outputFileName?: string): Promise<string>;
//# sourceMappingURL=index.d.ts.map