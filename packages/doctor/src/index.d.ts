import type { DoctorCheckResult } from "@mspvirajpatel/core";
export interface DoctorContext {
    outputDir?: string;
}
export declare function runChecks(context?: DoctorContext): Promise<DoctorCheckResult[]>;
//# sourceMappingURL=index.d.ts.map