; GymOS Inno Setup Script
; Compile with Inno Setup 6+ (https://jrsoftware.org/isinfo.php)

#define MyAppName "GymOS"
#define MyAppVersion "1.0.17"
#define MyAppPublisher "Gym AGOD"
#define MyAppExeName "GymOS.exe"

[Setup]
AppId={{A7F3B2C1-5D4E-4F6A-8B9C-0D1E2F3A4B5C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=output
OutputBaseFilename=GymOS-Setup 1.0.17
SetupIconFile=assets\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
VersionInfoVersion=1.0.17.0
VersionInfoCompany=Gym AGOD
VersionInfoDescription=Instalador de GymOS
VersionInfoProductName=GymOS
VersionInfoProductVersion=1.0.17.0
VersionInfoCopyright=Copyright (C) 2026 Gym AGOD

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "output\GymAGOD-Certificate.cer"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; AppUserModelID: "GymOS.App"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon; AppUserModelID: "GymOS.App"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Iniciar {#MyAppName}"; Flags: nowait postinstall skipifsilent

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  CertPath: String;
begin
  if CurStep = ssPostInstall then
  begin
    CertPath := ExpandConstant('{app}\GymAGOD-Certificate.cer');
    if FileExists(CertPath) then
    begin
      Exec('certutil.exe', '-addstore -f Root "' + CertPath + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('certutil.exe', '-addstore -f TrustedPublisher "' + CertPath + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;

