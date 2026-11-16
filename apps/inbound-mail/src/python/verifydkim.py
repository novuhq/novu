#!/usr/bin/env python
"""
Given a raw email message on stdin, verify its DKIM signatures and print one
JSON line with the result of each, top signature first. For example:

  {"signatures": [{"domain": "proton.me", "selector": "protonmail", "result": "pass"}]}

A signature that fails also carries a "reason". "unchecked" counts the
signatures past MAX_SIGNATURES, and "error" says why a message could not be
read at all.

Exit with code 11 when no signature verifies, including when there is none.

mailUtilities.ts reads both the line and the exit code: keep them in sync.
"""

import json
import sys

import dkim

# The sender decides how many signatures a message carries, and each one costs
# a DNS lookup, so only the first few are checked.
MAX_SIGNATURES = 5
MAX_REASON_LENGTH = 300


def _text(value):
    if value is None:
        return None
    if isinstance(value, bytes):
        value = value.decode('ascii', 'replace')
    return value.strip()


def _domain(value):
    text = _text(value)
    return text.lower().rstrip('.') if text else text


def _reason(err):
    return ('%s: %s' % (type(err).__name__, err))[:MAX_REASON_LENGTH]


def verify_signatures(message, dnsfunc=dkim.get_txt):
    """Verify each DKIM-Signature header of a raw message and report the results."""
    try:
        verifier = dkim.DKIM(message)
    except Exception as err:
        return {'signatures': [], 'error': _reason(err)}

    count = sum(1 for name, _ in verifier.headers if name.lower() == b'dkim-signature')
    signatures = []
    for idx in range(min(count, MAX_SIGNATURES)):
        # verify() sets these only once the signature's tags parse, so clear
        # them to keep the previous signature's values out of this result.
        verifier.domain = None
        verifier.selector = None
        try:
            passed = verifier.verify(idx=idx, dnsfunc=dnsfunc)
            reason = None if passed else 'signature does not match the signed headers'
        except Exception as err:
            # Includes DNS errors: one bad signature must not hide the others.
            passed = False
            reason = _reason(err)

        signature = {
            'domain': _domain(verifier.domain),
            'selector': _text(verifier.selector),
            'result': 'pass' if passed else 'fail',
        }
        if reason:
            signature['reason'] = reason
        signatures.append(signature)

    report = {'signatures': signatures}
    if count > MAX_SIGNATURES:
        report['unchecked'] = count - MAX_SIGNATURES
    return report


def main():
    # DKIM operates on the raw message bytes; sys.stdin.read() would decode to
    # str, which the bytes-oriented dkim library rejects with a TypeError.
    report = verify_signatures(sys.stdin.buffer.read())
    print(json.dumps(report))

    if not any(signature['result'] == 'pass' for signature in report['signatures']):
        sys.exit(11)


if __name__ == '__main__':
    main()
