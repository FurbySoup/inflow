@echo off
title INFLOW
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo INFLOW needs Node.js ^(free^). Install the LTS version from https://nodejs.org, then double-click this file again.
  pause
  exit /b 1
)

node dist-server\index.js --open
if errorlevel 1 pause
