# Security Vulnerability Resolution: dset Package

## Vulnerability Details

**Package:** dset (npm)  
**Affected Versions:** < 3.1.4  
**Patched Version:** 3.1.4  
**Vulnerability Type:** Prototype Pollution

**Description:** Versions of the package dset before 3.1.4 are vulnerable to Prototype Pollution via the dset function due improper user input sanitization. This vulnerability allows the attacker to inject malicious object property using the built-in Object property proto, which is recursively assigned to all the objects in the program.

## Resolution Actions Taken

### 1. Identified Vulnerable Dependencies

The following packages were using the vulnerable `dset@3.1.2`:

- `@segment/analytics-next@1.51.3`
- `@segment/analytics-next@1.59.0`
- `react-scanner@1.1.0`

### 2. Updated Only Necessary Dependencies (Minimal Approach)

Updated the following package.json files with only the minimal changes needed:

**apps/web/package.json:**

- Updated `@segment/analytics-next` from `^1.48.0` to `^1.81.0`

**apps/dashboard/package.json:**

- Updated `@segment/analytics-next` from `^1.77.0` to `^1.81.0`

**libs/design-system/package.json:**

- Updated `@segment/analytics-next` from `1.59.0` to `^1.81.0`

**libs/novui/package.json:**

- Updated `react-scanner` from `^1.1.0` to `^1.2.0`

**Note:** All other dependencies were kept at their original versions to maintain scope and avoid unnecessary changes.

### 3. Verification

After running `pnpm install`, confirmed that:

- ✅ No instances of vulnerable `dset@3.1.2` remain in the lockfile
- ✅ All `dset` dependencies now use the patched version `3.1.4`
- ✅ Only the necessary packages were updated to fix the vulnerability
- ✅ No unrelated package changes were made

## Current Status

✅ **RESOLVED** - The dset Prototype Pollution vulnerability has been fixed with minimal, targeted dependency updates.

## Packages Now Using Secure Versions

- `@segment/analytics-next@1.81.0` (uses `dset@3.1.4`)
- `react-scanner@1.2.0` (uses `dset@3.1.4`)

## Approach

This fix followed a **minimal change principle** - only updating the specific packages that contained the vulnerable dependency, avoiding unnecessary modifications to unrelated packages and maintaining the scope of the security fix.
