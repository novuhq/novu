#!/usr/bin/env python
"""
Given a raw email message on stdin, verify its dkim signature. Exit with code 11
if the signature is not valid.
"""

import dkim
import os
import sys

def main():
    msg = sys.stdin.read()
    res = None
    res = dkim.verify(msg)

    print('[' + os.path.basename(__file__) + '] isDkimValid = ' + str(res))
    if not res:
        # Invalid signature, exit with code 11.
        sys.exit(11)

if __name__ == '__main__':
    main()
