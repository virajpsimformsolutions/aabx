export function isAabFile(pathValue: string): boolean {
  return pathValue.toLowerCase().endsWith(".aab");
}

export function isApksFile(pathValue: string): boolean {
  return pathValue.toLowerCase().endsWith(".apks");
}

export function isApkFile(pathValue: string): boolean {
  return pathValue.toLowerCase().endsWith(".apk");
}
