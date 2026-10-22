@echo off
node "%~dp0scripts\start-preview.mjs"
if errorlevel 1 (
  pause
  exit /b 1
)
