#!/usr/bin/env python
"""
Given a the smtp server ip address, the sender email address and the domain
name, check if the smtp server is an authorized sender for the domain.
Usage: python verifyspf.py '180.73.166.174' 'someone@gmail.com' 'gmail.com'
"""


import os
import spf
import sys

def main():
    if len(sys.argv) != 4:
        print('[' + os.path.basename(__file__) + '] invalid number of arguments.')
        sys.exit(64)

    result, explanation = spf.check2(sys.argv[1], sys.argv[2], sys.argv[3])
    print('[' + os.path.basename(__file__) + '] (' + result + ', ' + explanation + ')')

    if result == 'pass':
        sys.exit(0)
    else:
        # Invalid spf, exit with code 11.
        sys.exit(11)

if __name__ == '__main__':
    main()
