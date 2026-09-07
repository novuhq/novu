#!/usr/bin/env python
"""
Given a the smtp server ip address, the sender email address and the domain
name, check if the smtp server is an authorized sender for the domain.
Usage: python verifyspf.py '180.73.166.174' 'someone@gmail.com' 'gmail.com'

Exit codes (consumed by mailUtilities.ts — keep in sync):
  0  pass       sender IP is authorized
  11 fail       sender IP is explicitly not authorized (fail/softfail)
  12 no verdict domain publishes no applicable SPF record (none/neutral)
  13 temperror  transient DNS failure while evaluating SPF
  14 permerror  the domain's SPF record is invalid
  64 usage      invalid arguments
"""


import os
import spf
import sys

# RFC 7208 result -> exit code. Anything unexpected is treated as fail (11).
RESULT_EXIT_CODES = {
    'pass': 0,
    'fail': 11,
    'softfail': 11,
    'none': 12,
    'neutral': 12,
    'temperror': 13,
    'permerror': 14,
}

def main():
    if len(sys.argv) != 4:
        print('[' + os.path.basename(__file__) + '] invalid number of arguments.')
        sys.exit(64)

    result, explanation = spf.check2(sys.argv[1], sys.argv[2], sys.argv[3])
    print('[' + os.path.basename(__file__) + '] (' + result + ', ' + explanation + ')')

    sys.exit(RESULT_EXIT_CODES.get(result, 11))

if __name__ == '__main__':
    main()
