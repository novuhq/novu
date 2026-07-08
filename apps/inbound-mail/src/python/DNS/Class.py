"""
$Id$

 This file is part of the py3dns project.
 Homepage: https://launchpad.net/py3dns

 This code is covered by the standard Python License. See LICENSE for details.

 CLASS values (section 3.2.4)
"""


IN = 1          # the Internet
CS = 2          # the CSNET class (Obsolete - used only for examples in
                # some obsolete RFCs)
CH = 3          # the CHAOS class. When someone shows me python running on
                # a Symbolics Lisp machine, I'll look at implementing this.
HS = 4          # Hesiod [Dyer 87]

# QCLASS values (section 3.2.5)

ANY = 255       # any class


# Construct reverse mapping dictionary

_names = dir()
classmap = {}
for _name in _names:
    if _name[0] != '_': classmap[eval(_name)] = _name

def classstr(klass):
    if klass in classmap: return classmap[klass]
    else: return repr(klass)

