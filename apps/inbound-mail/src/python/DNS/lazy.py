# $Id$
#
# This file is part of the pydns project.
# Homepage: http://pydns.sourceforge.net
#
# This code is covered by the standard Python License. See LICENSE for details.
#

# routines for lazy people.
from . import Base
from . Base import ServerError

class NoDataError(IndexError): pass
class StatusError(IndexError): pass

def revlookup(name,timeout=30):
    "convenience routine for doing a reverse lookup of an address"
    if Base.defaults['server'] == []: Base.DiscoverNameServers()
    names = revlookupall(name, timeout)
    if not names: return None
    return names[0]     # return shortest name

def revlookupall(name,timeout=30):
    "convenience routine for doing a reverse lookup of an address"
    # FIXME: check for IPv6
    a = name.split('.')
    a.reverse()
    b = '.'.join(a)+'.in-addr.arpa'
    qtype='ptr'
    names = dnslookup(b, qtype, timeout)
    # this will return all records.
    names.sort(key=str.__len__)
    return names

def dnslookup(name,qtype,timeout=30):
    "convenience routine to return just answer data for any query type"
    if Base.defaults['server'] == []: Base.DiscoverNameServers()
    result = Base.DnsRequest(name=name, qtype=qtype).req(timeout=timeout)
    if result.header['status'] != 'NOERROR':
        raise ServerError("DNS query status: %s" % result.header['status'],
            result.header['rcode'])
    elif len(result.answers) == 0 and Base.defaults['server_rotate']:
        # check with next DNS server
        result = Base.DnsRequest(name=name, qtype=qtype).req(timeout=timeout)
    if result.header['status'] != 'NOERROR':
        raise ServerError("DNS query status: %s" % result.header['status'],
            result.header['rcode'])
    return [x['data'] for x in result.answers]

def mxlookup(name,timeout=30):
    """
    convenience routine for doing an MX lookup of a name. returns a
    sorted list of (preference, mail exchanger) records
    """
    qtype = 'mx'
    l = dnslookup(name, qtype, timeout)
    return l

#
# $Log$
# Revision 1.5.2.1.2.2  2011/03/23 01:42:07  customdesigned
# Changes from 2.3 branch
#
# Revision 1.5.2.1.2.1  2011/02/18 19:35:22  customdesigned
# Python3 updates from Scott Kitterman
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
