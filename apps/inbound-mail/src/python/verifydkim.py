#!/usr/bin/env python
"""
Given a raw email message on stdin, verify its dkim signature. Exit with code 11
if the signature is not valid.
"""

import dkim
import os
import sys

def main():
    # DKIM operates on the raw message bytes; sys.stdin.read() would decode to
    # str, which the bytes-oriented dkim library rejects with a TypeError.
    msg = sys.stdin.buffer.read()
    res = dkim.verify(msg)

    print('[' + os.path.basename(__file__) + '] isDkimValid = ' + str(res))
    if not res:
        # Invalid signature, exit with code 11.
        sys.exit(11)

if __name__ == '__main__':
    main()
