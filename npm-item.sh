#!/bin/bash

set -e

TARGET_PKG=$1

if [[ ! -d $TARGET_PKG ]]; then
	echo "Usage: ./update-item.sh <path/to/package/>"
	exit 1
fi

cd $TARGET_PKG
echo "Updating in ${TARGET_PKG}"
if [[ -f package.json ]]; then
	rm -rf node_modules || true
	npm install --production
	npm prune
fi