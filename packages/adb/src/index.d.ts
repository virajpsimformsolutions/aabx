export interface Device {
    serial: string;
    state: string;
    model?: string;
}
export declare function listDevices(): Promise<Device[]>;
export declare function installApk(apkPath: string, deviceSerial?: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map