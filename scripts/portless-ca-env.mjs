#!/usr/bin/env node
/**
 * Resolve NODE_EXTRA_CA_CERTS for the portless local HTTPS proxy CA.
 * `portless trust` only updates the OS store for browsers; Node needs this env var.
 */
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function resolvePortlessCaCertPath() {
  const configured = process.env.NODE_EXTRA_CA_CERTS;

  if (configured && existsSync(configured)) {
    return configured;
  }

  const stateDir = process.env.PORTLESS_STATE_DIR || join(homedir(), '.portless');
  const caPath = join(stateDir, 'ca.pem');

  if (existsSync(caPath)) {
    return caPath;
  }

  return undefined;
}

/** Env fragment to merge into child process env when the portless CA is available. */
export function portlessCaEnv() {
  const caPath = resolvePortlessCaCertPath();

  if (!caPath) {
    return {};
  }

  return { NODE_EXTRA_CA_CERTS: caPath };
}
