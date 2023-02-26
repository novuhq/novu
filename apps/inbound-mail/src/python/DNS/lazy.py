# $Id: lazy.py,v 1.5.2.7 2011/11/23 17:14:11 customdesigned Exp $
#
# This file is part of the pydns project.
# Homepage: http://pydns.sourceforge.net
#
# This code is covered by the standard Python License. See LICENSE for details.
#

# routines for lazy people.
import Base

from Base import ServerError

def revlookup(name):
    "convenience routine for doing a reverse lookup of an address"
    names = revlookupall(name)
    if not names: return None
    return names[0]     # return shortest name

def revlookupall(name):
    "convenience routine for doing a reverse lookup of an address"
    # FIXME: check for IPv6
    a = name.split('.')
    a.reverse()
    b = '.'.join(a)+'.in-addr.arpa'
    names = dnslookup(b, qtype = 'ptr')
    # this will return all records.
    names.sort(key=str.__len__)
    return names

def dnslookup(name,qtype):
    "convenience routine to return just answer data for any query type"
    if Base.defaults['server'] == []: Base.DiscoverNameServers()
    result = Base.DnsRequest(name=name, qtype=qtype).req()
    if result.header['status'] != 'NOERROR':
        raise ServerError("DNS query status: %s" % result.header['status'],
            result.header['rcode'])
    elif len(result.answers) == 0 and Base.defaults['server_rotate']:
        # check with next DNS server
        result = Base.DnsRequest(name=name, qtype=qtype).req()
    if result.header['status'] != 'NOERROR':
        raise ServerError("DNS query status: %s" % result.header['status'],
            result.header['rcode'])
    return [x['data'] for x in result.answers]

def mxlookup(name):
    """
    convenience routine for doing an MX lookup of a name. returns a
    sorted list of (preference, mail exchanger) records
    """
    l = dnslookup(name, qtype = 'mx')
    l.sort()
    return l

#
# $Log: lazy.py,v $
# Revision 1.5.2.7  2011/11/23 17:14:11  customdesigned
# Apply patch 3388075 from sourceforge: raise subclasses of DNSError.
#
# Revision 1.5.2.6  2011/03/21 21:06:47  customdesigned
# Replace map() with list comprehensions.
#
# Revision 1.5.2.5  2011/03/21 21:03:22  customdesigned
# Get rid of obsolete string module
#
# Revision 1.5.2.4  2011/03/19 22:15:01  customdesigned
# Added rotation of name servers - SF Patch ID: 2795929
#
# Revision 1.5.2.3  2011/03/16 20:06:24  customdesigned
# Expand convenience methods.
#
# Revision 1.5.2.2  2011/03/08 21:06:42  customdesigned
# Address sourceforge patch requests 2981978, 2795932 to add revlookupall
# and raise DNSError instead of IndexError on server fail.
#
# Revision 1.5.2.1  2007/05/22 20:23:38  customdesigned
# Lazy call to DiscoverNameServers
#
# Revision 1.5  2002/05/06 06:14:38  anthonybaxter
# reformat, move import to top of file.
#
# Revision 1.4  2002/03/19 12:41:33  anthonybaxter
# tabnannied and reindented everything. 4 space indent, no tabs.
# yay.
#
# Revision 1.3  2001/08/09 09:08:55  anthonybaxter
# added identifying header to top of each file
#
# Revision 1.2  2001/07/19 06:57:07  anthony
# cvs keywords added
#
#
