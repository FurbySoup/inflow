#!/bin/bash
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "INFLOW needs Node.js (free). Install the LTS version from https://nodejs.org, then double-click this file again."
  open https://nodejs.org
  read -n 1 -p "Press any key to close"
  echo
  exit 1
fi

if ! node dist-server/index.js --open; then
  echo
  read -n 1 -p "Press any key to close"
  echo
fi
