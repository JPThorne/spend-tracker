# Auto-Update System Documentation

## Overview

SpendTracker includes a robust auto-update system that:
- Checks for updates at startup and periodically (every 1 hour)
- Downloads updates to `%LOCALAPPDATA%\SpendTracker\Updates`
- Applies updates on restart via a separate updater tool
- Respects user preferences for auto-update enablement

## How It Works

1. **Update Check**: `UpdateChecker` service fetches the manifest from GitHub
2. **Download**: Updates are downloaded to the user's local app data directory (not temp)
3. **Apply**: A separate `SpendTrackerUpdater.exe` tool handles safe exe replacement
4. **Restart**: The updater launches the new version after successful replacement

## File Locations

- **Main App**: `SpendTracker.exe`
- **Updater Tool**: `SpendTrackerUpdater.exe` (automatically extracted from main exe on first run)
- **Update Download**: `%LOCALAPPDATA%\SpendTracker\Updates\SpendTracker.exe`
- **Backup**: `SpendTracker.exe.bak` (created during update if needed)

## Installation

1. Download `SpendTracker.exe` from the latest GitHub release
2. Run it
3. Auto-updates work automatically from there

The updater tool is embedded inside the exe and extracts itself on first run.

## Release Process

1. Update version in `SpendTracker.Api.csproj`
2. Commit changes
3. Create a git tag: `git tag v1.0.X`
4. Push tag: `git push origin v1.0.X`
5. GitHub Actions will automatically:
   - Build both `SpendTracker.exe` and `SpendTrackerUpdater.exe`
   - Create a GitHub release
   - Update `docs/update.xml` manifest

## Publisher Trust & Code Signing

### Current Behavior (Without Code Signing)

When Windows first runs the downloaded executable, you may see:
- **"Do you want to run this application?" dialog** - This is Windows SmartScreen
- The app name will appear as "SpendTracker" but may not be recognized as trusted

### Why This Happens

- The executable is downloaded from the internet (marked with Zone.Identifier)
- SmartScreen doesn't recognize it as a known/signed publisher
- This is a Windows security feature, not an error

### Solutions

#### Option 1: Code Signing (Recommended)
Implement Authenticode code signing:

1. **Obtain a Code Signing Certificate**
   - Requires a valid Code Signing Certificate (costs $100-500/year)
   - Can be obtained from providers like Sectigo, DigiCert, GlobalSign

2. **Sign the Executables in GitHub Actions**
   ```yaml
   - name: Sign executables
     run: |
       signtool sign /f cert.pfx /p ${{ secrets.CERT_PASSWORD }} /t http://timestamp.digicert.com publish/SpendTracker.exe
       signtool sign /f cert.pfx /p ${{ secrets.CERT_PASSWORD }} /t http://timestamp.digicert.com publish/SpendTrackerUpdater.exe
   ```

#### Option 2: User Installation Directory
Place the app in the system's Program Files directory instead of Local:

- Updates would be stored in `C:\Program Files\SpendTracker\`
- Requires elevation/admin privileges
- SmartScreen is slightly less aggressive with Program Files

#### Option 3: Accept SmartScreen
Users click through the SmartScreen dialog once, then the app is cached as trusted for that execution.

### User Experience Workflow

**First Run (with SmartScreen):**
1. User downloads `SpendTracker.exe` from GitHub release
2. Windows SmartScreen appears: "Do you want to run this file?"
3. User clicks "More info" → "Run anyway"
4. App starts normally

**Subsequent Runs:**
- The executable is cached locally
- SmartScreen recognizes it from updates directory
- No additional prompts appear
- Downloaded updates work seamlessly

**With Code Signing:**
1. User runs downloaded exe
2. No SmartScreen prompt (shows publisher name)
3. Complete trust chain established
4. Professional appearance

## Configuration

Set the update manifest URL in `appsettings.json`:

```json
{
  "UpdateManifestUrl": "https://raw.githubusercontent.com/JPThorne/spend-tracker/main/docs/update.xml"
}
```

The manifest XML format:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<item>
  <version>1.0.23.0</version>
  <url>https://github.com/JPThorne/spend-tracker/releases/download/v1.0.23/SpendTracker.exe</url>
  <changelog>https://github.com/JPThorne/spend-tracker/releases</changelog>
  <mandatory>false</mandatory>
</item>
```

## Troubleshooting

### Update Not Appearing in App
- Check `%LOCALAPPDATA%\SpendTracker\logs\spendtracker-*.log`
- Ensure `UpdateManifestUrl` is configured
- Verify manifest URL is accessible and valid XML

### Update Downloaded But Not Applied
- Check updater exe exists: `SpendTrackerUpdater.exe`
- Verify logs show "Update downloaded successfully"
- Manually restart the app to trigger update

### SmartScreen Appears on Every Download
- This is expected behavior without code signing
- Users can click through once per session
- Consider implementing code signing for production

## Security Considerations

- Updates are downloaded from GitHub releases (trusted source)
- Manifest is fetched from GitHub raw content (tamper-proof via HTTPS)
- Each downloaded update is validated before application
- Backup of previous version is created before replacement
- Update directory is in user's local app data (not world-writable)

## Future Enhancements

1. **Code Signing**: Add Authenticode signing to eliminate SmartScreen
2. **Delta Updates**: Download only changed files instead of full exe
3. **Rollback**: Automatic rollback if new version fails to start
4. **Staged Rollout**: Gradual percentage-based deployment
