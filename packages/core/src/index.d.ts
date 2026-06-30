export interface BuildOptions {
    inputAabPath: string;
    outputDir: string;
    bundletoolVersion: string;
    installAfterBuild: boolean;
    deviceSerial?: string;
    clean: boolean;
}
export interface BuildResult {
    apksPath: string;
    universalApkPath: string;
    durationMs: number;
}
export interface DoctorCheckResult {
    name: string;
    ok: boolean;
    severity: "critical" | "warning";
    message: string;
    fix?: string;
}
//# sourceMappingURL=index.d.ts.map