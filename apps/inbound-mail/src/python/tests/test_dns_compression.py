#!/usr/bin/env python3
"""
Regression tests for the vendored py3dns name unpacker.

Guards against a DNS compression pointer loop (RFC 1035 4.1.4) causing
unbounded recursion, which a malicious nameserver could use to crash the
inbound-mail SPF/DKIM verifiers (denial of service).

Run: python3 -m pytest tests/test_dns_compression.py
 or: python3 tests/test_dns_compression.py
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import DNS.Lib as Lib


class CompressionPointerLoopTest(unittest.TestCase):
    def test_self_referential_pointer_is_rejected(self):
        # A name that is only a compression pointer to offset 0 (itself).
        with self.assertRaises(Lib.UnpackError):
            Lib.Unpacker(b"\xc0\x00").getname()

    def test_two_pointer_cycle_is_rejected(self):
        # offset 0 -> 2, offset 2 -> 0.
        with self.assertRaises(Lib.UnpackError):
            Lib.Unpacker(b"\xc0\x02\xc0\x00").getname()

    def test_forward_pointer_chain_is_rejected(self):
        # A chain of forward pointers (0 -> 2 -> 4 -> ...) never repeats a
        # target but still recurses unboundedly, so it must be rejected by
        # the strictly-backwards rule rather than crashing.
        buf = bytearray()
        for k in range(400):
            target = (k + 1) * 2
            buf += bytes([0xC0 | (target >> 8), target & 0xFF])
        buf += b"\x00"
        with self.assertRaises(Lib.UnpackError):
            Lib.Unpacker(bytes(buf)).getname()

    def test_legitimate_backward_pointer_still_resolves(self):
        # "isi.arpa" stored at offset 0, then "foo" + a pointer back to it.
        prefix = b"\x03isi\x04arpa\x00"
        buf = prefix + b"\x03foo" + b"\xc0\x00"
        u = Lib.Unpacker(buf)
        u.offset = len(prefix)
        self.assertEqual(u.getname(), "foo.isi.arpa")


if __name__ == "__main__":
    unittest.main()
