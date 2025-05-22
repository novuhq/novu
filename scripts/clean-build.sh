#!/bin/sh

pnpm run clean
pnpm i
pnpm run symlink:submodules
pnpm nx run-many --target=build --all --skip-nx-cache
