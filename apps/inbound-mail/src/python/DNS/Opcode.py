"""
 $Id$

 This file is part of the py3dns project.
 Homepage: https://launchpad.net/py3dns

 This code is covered by the standard Python License. See LICENSE for details.

 Opcode values in message header. RFC 1035, 1996, 2136.
"""



QUERY = 0
IQUERY = 1
STATUS = 2
NOTIFY = 4
UPDATE = 5

# Construct reverse mapping dictionary

_names = dir()
opcodemap = {}
for _name in _names:
    if _name[0] != '_': opcodemap[eval(_name)] = _name

def opcodestr(opcode):
    if opcode in opcodemap: return opcodemap[opcode]
    else: return repr(opcode)

