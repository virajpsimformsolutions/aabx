# Expo CI/CD Integration (EAS + AABX)

This guide explains how to build Android AAB with Expo EAS in GitHub Actions and convert it to a signed APK using AABX.

## Workflow File

- .github/workflows/expo-eas-aabx.yml

## What the Workflow Does

1. Installs Node and Java
2. Installs project dependencies
3. Authenticates with Expo using EXPO_TOKEN
4. Builds Android AAB on EAS
5. Downloads the AAB artifact
6. Decodes signing keystore from secret
7. Creates signing JSON config
8. Runs AABX to generate signed APK
9. Uploads both AAB and APK as workflow artifacts

## Required GitHub Secrets

Configure these repository secrets:

- EXPO_TOKEN
- ANDROID_KEYSTORE_BASE64
- ANDROID_KEY_ALIAS
- ANDROID_KEYSTORE_PASSWORD
- ANDROID_KEY_PASSWORD

### How to create ANDROID_KEYSTORE_BASE64

Use your local keystore file:

```bash
base64 -i path/to/upload-key.jks | pbcopy
```

Paste the copied value into `ANDROID_KEYSTORE_BASE64` in GitHub Secrets.

## Triggering

- Automatically on push to `main`
- Manually via `workflow_dispatch`

## Notes

- If you only need APK from Expo directly, you can use an EAS profile with `android.buildType = apk`.
- Use this workflow when you want APK derived from the AAB path and signed through AABX.
- VS Code may show warnings like `Context access might be invalid` for custom secrets; this is a static validation warning and does not block runtime if secrets exist.
