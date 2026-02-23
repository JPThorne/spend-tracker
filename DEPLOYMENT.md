# SpendTracker - Windows Desktop Deployment Guide

This guide explains how to build and distribute SpendTracker as a Windows desktop application.

## Overview

SpendTracker is packaged as a self-contained Windows application that:
- Runs as a local web server on `http://localhost:5000`
- Automatically opens in your default browser
- Stores all data locally in a SQLite database
- Requires no external dependencies or installation of .NET runtime
- Works completely offline

## For Developers: Building the Application

### Prerequisites
- .NET 10 SDK installed
- Windows 10/11 (for building Windows executables)

### Quick Build

Run the PowerShell publishing script from the `api` directory IN POWERSHELL:

```powershell
cd api
.\publish.ps1
```

This will create a `publish\win-x64` folder containing:
- `SpendTracker.exe` - The main executable (~80-120 MB)
- `web.config` - IIS configuration (not needed for desktop use)
- `spendtracker.db` - SQLite database (created on first run)

### Manual Build

If you prefer to build manually:

```powershell
cd api
dotnet publish .\src\SpendTracker.Api\SpendTracker.Api.csproj `
    --configuration Release `
    --runtime win-x64 `
    --self-contained true `
    --output .\publish\win-x64 `
    /p:PublishSingleFile=true `
    /p:PublishReadyToRun=true `
    /p:IncludeNativeLibrariesForSelfExtract=true
```

### Build Options

#### Debug Build
```powershell
.\publish.ps1 -Configuration Debug
```

#### Custom Output Path
```powershell
.\publish.ps1 -OutputPath "C:\MyCustomPath"
```

## For End Users: Installing the Application

### Installation Steps

1. **Download** the `SpendTracker.exe` file
2. **Create a folder** for the application (e.g., `C:\Program Files\SpendTracker`)
3. **Move** `SpendTracker.exe` to that folder
4. **Double-click** `SpendTracker.exe` to run

### First Launch

On first launch:
1. The application will create a `spendtracker.db` file (your data)
2. Your default browser will automatically open to `http://localhost:5000`
3. The application window will show server logs

### Daily Use

1. Double-click `SpendTracker.exe` to start the server
2. Browser opens automatically, or navigate to `http://localhost:5000`
3. Upload CSV files and categorize transactions
4. Close the browser tab when done
5. Press `Ctrl+C` in the console window or close it to stop the server

### Data Location

Your transaction data is stored in:
```
<SpendTracker.exe location>\spendtracker.db
```

**Important:** Back up this file regularly to prevent data loss!

## Creating a Windows Installer

### Option 1: ZIP Distribution (Simple)

1. Build the application
2. Copy the `publish\win-x64` folder contents
3. Create a ZIP file: `SpendTracker-v1.0-win-x64.zip`
4. Include a README with installation instructions

### Option 2: MSI Installer (Professional)

Use WiX Toolset to create a Windows installer:

1. Install WiX Toolset: `https://wixtoolset.org/`

2. Create `installer.wxs`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" 
           Name="SpendTracker" 
           Language="1033" 
           Version="1.0.0.0" 
           Manufacturer="Your Company" 
           UpgradeCode="PUT-GUID-HERE">
    
    <Package InstallerVersion="200" Compressed="yes" InstallScope="perMachine" />
    
    <MajorUpgrade DowngradeErrorMessage="A newer version is already installed." />
    <MediaTemplate EmbedCab="yes" />

    <Feature Id="ProductFeature" Title="SpendTracker" Level="1">
      <ComponentGroupRef Id="ProductComponents" />
    </Feature>

    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFilesFolder">
        <Directory Id="INSTALLFOLDER" Name="SpendTracker" />
      </Directory>
      <Directory Id="ProgramMenuFolder">
        <Directory Id="ApplicationProgramsFolder" Name="SpendTracker"/>
      </Directory>
    </Directory>

    <ComponentGroup Id="ProductComponents" Directory="INSTALLFOLDER">
      <Component Id="SpendTrackerExe" Guid="PUT-GUID-HERE">
        <File Id="SpendTrackerExe" Source="publish\win-x64\SpendTracker.exe" KeyPath="yes">
          <Shortcut Id="StartMenuShortcut" 
                    Directory="ApplicationProgramsFolder" 
                    Name="SpendTracker"
                    WorkingDirectory="INSTALLFOLDER" 
                    Icon="SpendTracker.ico"
                    IconIndex="0" 
                    Advertise="yes" />
        </File>
      </Component>
    </ComponentGroup>
  </Product>
</Wix>
```

3. Build the installer:
```cmd
candle installer.wxs
light installer.wixobj -out SpendTracker-Setup.msi
```

### Option 3: MSIX Package (Modern)

For Windows 10/11 Store distribution:

1. Install Windows SDK
2. Use `MakeAppx.exe` to package
3. Sign with certificate

## Troubleshooting

### Port Already in Use

If port 5000 is already in use, edit `appsettings.json` before building:

```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5063"
      }
    }
  }
}
```

Also update `app.js` to match the new port.

### Browser Doesn't Open

Manually navigate to `http://localhost:5000` in your browser.

### Application Won't Start

1. Check Windows Firewall settings
2. Run as Administrator
3. Check Windows Event Viewer for errors
4. Ensure no antivirus blocking the executable

### Database Errors

If the database is corrupted:
1. Backup `spendtracker.db`
2. Delete the file
3. Restart the application (creates new database)
4. Re-import your CSV files

## Security Considerations

### API Key

The application uses a default API key defined in `appsettings.json`. For production:

1. Generate a new GUID
2. Update `appsettings.json` before building
3. Update `app.js` with the same key

### Data Privacy

- All data stays on the user's computer
- No external connections are made
- Database is not encrypted (consider encrypting for sensitive data)

### Firewall

The application binds to `localhost` only - no external network access by default.

## Distribution Checklist

- [ ] Build release version with `publish.ps1`
- [ ] Test executable on clean Windows machine
- [ ] Create installer or ZIP package
- [ ] Write user documentation (README)
- [ ] Include sample CSV file for testing
- [ ] Test installation process
- [ ] Document system requirements (Windows 10/11, x64)
- [ ] Create uninstall instructions
- [ ] Set up version numbering scheme

## System Requirements

**Minimum:**
- Windows 10 (64-bit)
- 100 MB free disk space
- 512 MB RAM

**Recommended:**
- Windows 11 (64-bit)
- 200 MB free disk space
- 1 GB RAM
- Modern web browser (Chrome, Edge, Firefox)

## Version History

- **v1.0** - Initial desktop release
  - Self-contained Windows executable
  - Auto-browser launch
  - SQLite local storage
  - CSV import/export
  - Category management
  - Transaction categorization

## Support

For issues or questions:
- Check the main README.md
- Review application logs in the console window
- Check `spendtracker.db` file permissions
