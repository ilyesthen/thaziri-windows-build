; Custom NSIS installer script for Thaziri
; Checks Windows version before installation

!macro customInstall
  ; Check Windows version
  ${If} ${IsWin7}
  ${OrIf} ${IsWin8}
    MessageBox MB_YESNO|MB_ICONEXCLAMATION "Warning: This application requires Windows 8.1 or later.$\r$\n$\r$\nYour Windows version (Windows 7/8) is not officially supported.$\r$\n$\r$\nThe application may not work correctly.$\r$\n$\r$\nDo you want to continue anyway?" IDYES continue
    Abort
  ${EndIf}
  continue:
!macroend

!macro customHeader
  !system "echo '' > ${BUILD_RESOURCES_DIR}/customHeader"
!macroend
