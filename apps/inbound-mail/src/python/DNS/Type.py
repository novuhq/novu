# -*- encoding: utf-8 -*-
"""
 $Id$

 This file is part of the py3dns project.
 Homepage: https://launchpad.net/py3dns

 This code is covered by the standard Python License. See LICENSE for details.

 TYPE values (section 3.2.2)
"""

A = 1           # a host address
NS = 2          # an authoritative name server
MD = 3          # a mail destination (Obsolete - use MX)
MF = 4          # a mail forwarder (Obsolete - use MX)
CNAME = 5       # the canonical name for an alias
SOA = 6         # marks the start of a zone of authority
MB = 7          # a mailbox domain name (EXPERIMENTAL)
MG = 8          # a mail group member (EXPERIMENTAL)
MR = 9          # a mail rename domain name (EXPERIMENTAL)
NULL = 10       # a null RR (EXPERIMENTAL)
WKS = 11        # a well known service description
PTR = 12        # a domain name pointer
HINFO = 13      # host information
MINFO = 14      # mailbox or mail list information
MX = 15         # mail exchange
TXT = 16        # text strings
AAAA = 28       # IPv6 AAAA records (RFC 1886)
SRV = 33        # DNS RR for specifying the location of services (RFC 2782)
SPF = 99        # TXT RR for Sender Policy Framework

# Additional TYPE values from host.c source

UNAME = 110
MP = 240

# QTYPE values (section 3.2.3)

AXFR = 252      # A request for a transfer of an entire zone
MAILB = 253     # A request for mailbox-related records (MB, MG or MR)
MAILA = 254     # A request for mail agent RRs (Obsolete - see MX)
ANY = 255       # A request for all records

# Construct reverse mapping dictionary

_names = dir()
typemap = {}
for _name in _names:
    if _name[0] != '_': typemap[eval(_name)] = _name

def typestr(type):
    if type in typemap: return typemap[type]
    else: return repr(type)

