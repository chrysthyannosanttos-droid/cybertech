!include "MUI2.nsh"

Name "RemoteDesk"
OutFile "RemoteDesk-Installer.exe"
InstallDir "$PROGRAMFILES\RemoteDesk"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

!define MUI_ABORTWARNING
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  File "..\desktop\dist\win-unpacked\RemoteDesk.exe"
  File /r "..\client\dist\*.*"
  File "..\agent\bin\Release\RemoteAgent.exe"

  ; Create shortcuts
  CreateShortCut "$DESKTOP\RemoteDesk.lnk" "$INSTDIR\RemoteDesk.exe"
  CreateShortCut "$SMSTARTUP\RemoteDesk.lnk" "$INSTDIR\RemoteDesk.exe"

  ; Register Windows Service for agent
  ExecWait 'sc create RemoteDeskAgent binPath=\"$INSTDIR\RemoteDeskAgent.exe\" start= auto'

  ; Open firewall ports
  ExecWait 'netsh advfirewall firewall add rule name="RemoteDesk Signaling" dir=in action=allow protocol=TCP localport=3000'
  ExecWait 'netsh advfirewall firewall add rule name="RemoteDesk WebRTC" dir=in action=allow protocol=UDP localport=5000'
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\RemoteDesk.exe"
  Delete "$DESKTOP\RemoteDesk.lnk"
  Delete "$SMSTARTUP\RemoteDesk.lnk"
  ExecWait 'sc delete RemoteDeskAgent'
  ExecWait 'netsh advfirewall firewall delete rule name="RemoteDesk Signaling"'
  ExecWait 'netsh advfirewall firewall delete rule name="RemoteDesk WebRTC"'
  RMDir /r "$INSTDIR"
SectionEnd
