"""
 $Id: Status.py,v 1.7.2.1 2011/03/16 20:06:39 customdesigned Exp $

 This file is part of the pydns project.
 Homepage: http://pydns.sourceforge.net

 This code is covered by the standard Python License. See LICENSE for details.

 Status values in message header
"""

NOERROR   = 0 #   No Error                           [RFC 1035]
FORMERR   = 1 #   Format Error                       [RFC 1035]
SERVFAIL  = 2 #   Server Failure                     [RFC 1035]
NXDOMAIN  = 3 #   Non-Existent Domain                [RFC 1035]
NOTIMP    = 4 #   Not Implemented                    [RFC 1035]
REFUSED   = 5 #   Query Refused                      [RFC 1035]
YXDOMAIN  = 6 #   Name Exists when it should not     [RFC 2136]
YXRRSET   = 7 #   RR Set Exists when it should not   [RFC 2136]
NXRRSET   = 8 #   RR Set that should exist does not  [RFC 2136]
NOTAUTH   = 9 #   Server Not Authoritative for zone  [RFC 2136]
NOTZONE   = 10 #  Name not contained in zone         [RFC 2136]
BADVERS   = 16 #  Bad OPT Version                    [RFC 2671]
BADSIG    = 16 #  TSIG Signature Failure             [RFC 2845]
BADKEY    = 17 #  Key not recognized                 [RFC 2845]
BADTIME   = 18 #  Signature out of time window       [RFC 2845]
BADMODE   = 19 #  Bad TKEY Mode                      [RFC 2930]
BADNAME   = 20 #  Duplicate key name                 [RFC 2930]
BADALG    = 21 #  Algorithm not supported            [RFC 2930]

# Construct reverse mapping dictionary

_names = dir()
statusmap = {}
for _name in _names:
    if _name[0] != '_': statusmap[eval(_name)] = _name

def statusstr(status):
    if statusmap.has_key(status): return statusmap[status]
    else: return `status`

#
# $Log: Status.py,v $
# Revision 1.7.2.1  2011/03/16 20:06:39  customdesigned
# Refer to explicit LICENSE file.
#
# Revision 1.7  2002/04/23 12:52:19  anthonybaxter
# cleanup whitespace.
#
# Revision 1.6  2002/04/23 10:57:57  anthonybaxter
# update to complete the list of response codes.
#
# Revision 1.5  2002/03/19 12:41:33  anthonybaxter
# tabnannied and reindented everything. 4 space indent, no tabs.
# yay.
#
# Revision 1.4  2002/03/19 12:26:13  anthonybaxter
# death to leading tabs.
#
# Revision 1.3  2001/08/09 09:08:55  anthonybaxter
# added identifying header to top of each file
#
# Revision 1.2  2001/07/19 06:57:07  anthony
# cvs keywords added
#
#
