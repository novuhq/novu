"""
$Id: Base.py,v 1.12.2.19 2011/11/23 17:14:11 customdesigned Exp $

This file is part of the pydns project.
Homepage: http://pydns.sourceforge.net

This code is covered by the standard Python License.  See LICENSE for details.

    Base functionality. Request and Response classes, that sort of thing.
"""

import socket, string, types, time, select
import Type,Class,Opcode
import asyncore
#
# This random generator is used for transaction ids and port selection.  This
# is important to prevent spurious results from lost packets, and malicious
# cache poisoning.  This doesn't matter if you are behind a caching nameserver
# or your app is a primary DNS server only. To install your own generator,
# replace DNS.Base.random.  SystemRandom uses /dev/urandom or similar source.  
#
try:
  from random import SystemRandom
  random = SystemRandom()
except:
  import random

class DNSError(Exception): pass
class ArgumentError(DNSError): pass
class SocketError(DNSError): pass
class TimeoutError(DNSError): pass

class ServerError(DNSError):
    def __init__(self, message, rcode):
        DNSError.__init__(self, message, rcode)
        self.message = message
        self.rcode = rcode

class IncompleteReplyError(DNSError): pass

# Lib uses some of the above exception classes, so import after defining.
import Lib

defaults= { 'protocol':'udp', 'port':53, 'opcode':Opcode.QUERY,
            'qtype':Type.A, 'rd':1, 'timing':1, 'timeout': 30,
            'server_rotate': 0 }

defaults['server']=[]

def ParseResolvConf(resolv_path="/etc/resolv.conf"):
    "parses the /etc/resolv.conf file and sets defaults for name servers"
    global defaults
    lines=open(resolv_path).readlines()
    for line in lines:
        line = string.strip(line)
        if not line or line[0]==';' or line[0]=='#':
            continue
        fields=string.split(line)
        if len(fields) < 2: 
            continue
        if fields[0]=='domain' and len(fields) > 1:
            defaults['domain']=fields[1]
        if fields[0]=='search':
            pass
        if fields[0]=='options':
            pass
        if fields[0]=='sortlist':
            pass
        if fields[0]=='nameserver':
            defaults['server'].append(fields[1])

def DiscoverNameServers():
    import sys
    if sys.platform in ('win32', 'nt'):
        import win32dns
        defaults['server']=win32dns.RegistryResolve()
    else:
        return ParseResolvConf()

class DnsRequest:
    """ high level Request object """
    def __init__(self,*name,**args):
        self.donefunc=None
        self.async=None
        self.defaults = {}
        self.argparse(name,args)
        self.defaults = self.args
        self.tid = 0

    def argparse(self,name,args):
        if not name and self.defaults.has_key('name'):
            args['name'] = self.defaults['name']
        if type(name) is types.StringType:
            args['name']=name
        else:
            if len(name) == 1:
                if name[0]:
                    args['name']=name[0]
        if defaults['server_rotate'] and \
                type(defaults['server']) == types.ListType:
            defaults['server'] = defaults['server'][1:]+defaults['server'][:1]
        for i in defaults.keys():
            if not args.has_key(i):
                if self.defaults.has_key(i):
                    args[i]=self.defaults[i]
                else:
                    args[i]=defaults[i]
        if type(args['server']) == types.StringType:
            args['server'] = [args['server']]
        self.args=args

    def socketInit(self,a,b):
        self.s = socket.socket(a,b)

    def processUDPReply(self):
        if self.timeout > 0:
            r,w,e = select.select([self.s],[],[],self.timeout)
            if not len(r):
                raise TimeoutError, 'Timeout'
        (self.reply, self.from_address) = self.s.recvfrom(65535)
        self.time_finish=time.time()
        self.args['server']=self.ns
        return self.processReply()

    def _readall(self,f,count):
      res = f.read(count)
      while len(res) < count:
        if self.timeout > 0:
            # should we restart timeout everytime we get a dribble of data?
            rem = self.time_start + self.timeout - time.time()
            if rem <= 0: raise TimeoutError, 'Timeout'
            self.s.settimeout(rem)
        buf = f.read(count - len(res))
        if not buf:
          raise IncompleteReplyError, 'incomplete reply - %d of %d read' % (len(res),count)
        res += buf
      return res

    def processTCPReply(self):
        if self.timeout > 0:
            self.s.settimeout(self.timeout)
        else:
            self.s.settimeout(None)
        f = self.s.makefile('rb')
        try:
          header = self._readall(f,2)
          count = Lib.unpack16bit(header)
          self.reply = self._readall(f,count)
        finally: f.close()
        self.time_finish=time.time()
        self.args['server']=self.ns
        return self.processReply()

    def processReply(self):
        self.args['elapsed']=(self.time_finish-self.time_start)*1000
        u = Lib.Munpacker(self.reply)
        r=Lib.DnsResult(u,self.args)
        r.args=self.args
        #self.args=None  # mark this DnsRequest object as used.
        return r
        #### TODO TODO TODO ####
#        if protocol == 'tcp' and qtype == Type.AXFR:
#            while 1:
#                header = f.read(2)
#                if len(header) < 2:
#                    print '========== EOF =========='
#                    break
#                count = Lib.unpack16bit(header)
#                if not count:
#                    print '========== ZERO COUNT =========='
#                    break
#                print '========== NEXT =========='
#                reply = f.read(count)
#                if len(reply) != count:
#                    print '*** Incomplete reply ***'
#                    break
#                u = Lib.Munpacker(reply)
#                Lib.dumpM(u)

    def getSource(self):
        "Pick random source port to avoid DNS cache poisoning attack."
        while True:
            try:
                source_port = random.randint(1024,65535)
                self.s.bind(('', source_port))
                break
            except socket.error, msg: 
                # Error 98, 'Address already in use'
                if msg[0] != 98: raise

    def conn(self):
        self.getSource()
        self.s.connect((self.ns,self.port))

    def req(self,*name,**args):
        " needs a refactoring "
        self.argparse(name,args)
        #if not self.args:
        #    raise ArgumentError, 'reinitialize request before reuse'
        protocol = self.args['protocol']
        self.port = self.args['port']
        self.tid = random.randint(0,65535)
        self.timeout = self.args['timeout'];
        opcode = self.args['opcode']
        rd = self.args['rd']
        server=self.args['server']
        if type(self.args['qtype']) == types.StringType:
            try:
                qtype = getattr(Type, string.upper(self.args['qtype']))
            except AttributeError:
                raise ArgumentError, 'unknown query type'
        else:
            qtype=self.args['qtype']
        if not self.args.has_key('name'):
            print self.args
            raise ArgumentError, 'nothing to lookup'
        qname = self.args['name']
        if qtype == Type.AXFR and protocol != 'tcp':
            print 'Query type AXFR, protocol forced to TCP'
            protocol = 'tcp'
        #print 'QTYPE %d(%s)' % (qtype, Type.typestr(qtype))
        m = Lib.Mpacker()
        # jesus. keywords and default args would be good. TODO.
        m.addHeader(self.tid,
              0, opcode, 0, 0, rd, 0, 0, 0,
              1, 0, 0, 0)
        m.addQuestion(qname, qtype, Class.IN)
        self.request = m.getbuf()
        try:
            if protocol == 'udp':
                self.sendUDPRequest(server)
            else:
                self.sendTCPRequest(server)
        except socket.error, reason:
            raise SocketError, reason
        if self.async:
            return None
        else:
            return self.response

    def sendUDPRequest(self, server):
        "refactor me"
        first_socket_error = None
        self.response=None
        for self.ns in server:
            #print "trying udp",self.ns
            try:
                if self.ns.count(':'):
                    if hasattr(socket,'has_ipv6') and socket.has_ipv6:
                        self.socketInit(socket.AF_INET6, socket.SOCK_DGRAM)
                    else: continue
                else:
                    self.socketInit(socket.AF_INET, socket.SOCK_DGRAM)
                try:
                    # TODO. Handle timeouts &c correctly (RFC)
                    self.time_start=time.time()
                    self.conn()
                    if not self.async:
                        self.s.send(self.request)
                        r=self.processUDPReply()
                        # Since we bind to the source port and connect to the
                        # destination port, we don't need to check that here,
                        # but do make sure it's actually a DNS request that the
                        # packet is in reply to.
                        while r.header['id'] != self.tid        \
                                or self.from_address[1] != self.port:
                            r=self.processUDPReply()
                        self.response = r
                        # FIXME: check waiting async queries
                finally:
                    if not self.async:
                        self.s.close()
            except socket.error, e:
                # Keep trying more nameservers, but preserve the first error
                # that occurred so it can be reraised in case none of the
                # servers worked:
                first_socket_error = first_socket_error or e
                continue
        if not self.response and first_socket_error:
            raise first_socket_error

    def sendTCPRequest(self, server):
        " do the work of sending a TCP request "
        first_socket_error = None
        self.response=None
        for self.ns in server:
            #print "trying tcp",self.ns
            try:
                if self.ns.count(':'):
                    if hasattr(socket,'has_ipv6') and socket.has_ipv6:
                        self.socketInit(socket.AF_INET6, socket.SOCK_STREAM)
                    else: continue
                else:
                    self.socketInit(socket.AF_INET, socket.SOCK_STREAM)
                try:
                    # TODO. Handle timeouts &c correctly (RFC)
                    self.time_start=time.time()
                    self.conn()
                    buf = Lib.pack16bit(len(self.request))+self.request
                    # Keep server from making sendall hang
                    self.s.setblocking(0)
                    # FIXME: throws WOULDBLOCK if request too large to fit in
                    # system buffer
                    self.s.sendall(buf)
                    # SHUT_WR breaks blocking IO with google DNS (8.8.8.8)
                    #self.s.shutdown(socket.SHUT_WR)
                    r=self.processTCPReply()
                    if r.header['id'] == self.tid:
                        self.response = r
                        break
                finally:
                    self.s.close()
            except socket.error, e:
                first_socket_error = first_socket_error or e
                continue
        if not self.response and first_socket_error:
            raise first_socket_error

#class DnsAsyncRequest(DnsRequest):
class DnsAsyncRequest(DnsRequest,asyncore.dispatcher_with_send):
    " an asynchronous request object. out of date, probably broken "
    def __init__(self,*name,**args):
        DnsRequest.__init__(self, *name, **args)
        # XXX todo
        if args.has_key('done') and args['done']:
            self.donefunc=args['done']
        else:
            self.donefunc=self.showResult
        #self.realinit(name,args) # XXX todo
        self.async=1
    def conn(self):
        self.getSource()
        self.connect((self.ns,self.port))
        self.time_start=time.time()
        if self.args.has_key('start') and self.args['start']:
            asyncore.dispatcher.go(self)
    def socketInit(self,a,b):
        self.create_socket(a,b)
        asyncore.dispatcher.__init__(self)
        self.s=self
    def handle_read(self):
        if self.args['protocol'] == 'udp':
            self.response=self.processUDPReply()
            if self.donefunc:
                apply(self.donefunc,(self,))
    def handle_connect(self):
        self.send(self.request)
    def handle_write(self):
        pass
    def showResult(self,*s):
        self.response.show()

#
# $Log: Base.py,v $
# Revision 1.12.2.19  2011/11/23 17:14:11  customdesigned
# Apply patch 3388075 from sourceforge: raise subclasses of DNSError.
#
# Revision 1.12.2.18  2011/05/02 16:02:36  customdesigned
# Don't complain about protocol for AXFR unless it needs changing.
# Reported by Ewoud Kohl van Wijngaarden.
#
# Revision 1.12.2.17  2011/03/21 13:01:24  customdesigned
# Close file for processTCPReply
#
# Revision 1.12.2.16  2011/03/21 12:54:52  customdesigned
# Reply is binary.
#
# Revision 1.12.2.15  2011/03/19 22:15:01  customdesigned
# Added rotation of name servers - SF Patch ID: 2795929
#
# Revision 1.12.2.14  2011/03/17 03:46:03  customdesigned
# Simple test for google DNS with tcp
#
# Revision 1.12.2.13  2011/03/17 03:08:03  customdesigned
# Use blocking IO with timeout for TCP replies.
#
# Revision 1.12.2.12  2011/03/16 17:50:00  customdesigned
# Fix non-blocking TCP replies.  (untested)
#
# Revision 1.12.2.11  2010/01/02 16:31:23  customdesigned
# Handle large TCP replies (untested).
#
# Revision 1.12.2.10  2008/08/01 03:58:03  customdesigned
# Don't try to close socket when never opened.
#
# Revision 1.12.2.9  2008/08/01 03:48:31  customdesigned
# Fix more breakage from port randomization patch.  Support Ipv6 queries.
#
# Revision 1.12.2.8  2008/07/31 18:22:59  customdesigned
# Wait until tcp response at least starts coming in.
#
# Revision 1.12.2.7  2008/07/28 01:27:00  customdesigned
# Check configured port.
#
# Revision 1.12.2.6  2008/07/28 00:17:10  customdesigned
# Randomize source ports.
#
# Revision 1.12.2.5  2008/07/24 20:10:55  customdesigned
# Randomize tid in requests, and check in response.
#
# Revision 1.12.2.4  2007/05/22 20:28:31  customdesigned
# Missing import Lib
#
# Revision 1.12.2.3  2007/05/22 20:25:52  customdesigned
# Use socket.inetntoa,inetaton.
#
# Revision 1.12.2.2  2007/05/22 20:21:46  customdesigned
# Trap socket error
#
# Revision 1.12.2.1  2007/05/22 20:19:35  customdesigned
# Skip bogus but non-empty lines in resolv.conf
#
# Revision 1.12  2002/04/23 06:04:27  anthonybaxter
# attempt to refactor the DNSRequest.req method a little. after doing a bit
# of this, I've decided to bite the bullet and just rewrite the puppy. will
# be checkin in some design notes, then unit tests and then writing the sod.
#
# Revision 1.11  2002/03/19 13:05:02  anthonybaxter
# converted to class based exceptions (there goes the python1.4 compatibility :)
#
# removed a quite gross use of 'eval()'.
#
# Revision 1.10  2002/03/19 12:41:33  anthonybaxter
# tabnannied and reindented everything. 4 space indent, no tabs.
# yay.
#
# Revision 1.9  2002/03/19 12:26:13  anthonybaxter
# death to leading tabs.
#
# Revision 1.8  2002/03/19 10:30:33  anthonybaxter
# first round of major bits and pieces. The major stuff here (summarised
# from my local, off-net CVS server :/ this will cause some oddities with
# the
#
# tests/testPackers.py:
#   a large slab of unit tests for the packer and unpacker code in DNS.Lib
#
# DNS/Lib.py:
#   placeholder for addSRV.
#   added 'klass' to addA, make it the same as the other A* records.
#   made addTXT check for being passed a string, turn it into a length 1 list.
#   explicitly check for adding a string of length > 255 (prohibited).
#   a bunch of cleanups from a first pass with pychecker
#   new code for pack/unpack. the bitwise stuff uses struct, for a smallish
#     (disappointly small, actually) improvement, while addr2bin is much
#     much faster now.
#
# DNS/Base.py:
#   added DiscoverNameServers. This automatically does the right thing
#     on unix/ win32. No idea how MacOS handles this.  *sigh*
#     Incompatible change: Don't use ParseResolvConf on non-unix, use this
#     function, instead!
#   a bunch of cleanups from a first pass with pychecker
#
# Revision 1.5  2001/08/09 09:22:28  anthonybaxter
# added what I hope is win32 resolver lookup support. I'll need to try
# and figure out how to get the CVS checkout onto my windows machine to
# make sure it works (wow, doing something other than games on the
# windows machine :)
#
# Code from Wolfgang.Strobl@gmd.de
# win32dns.py from
# http://aspn.activestate.com/ASPN/Cookbook/Python/Recipe/66260
#
# Really, ParseResolvConf() should be renamed "FindNameServers" or
# some such.
#
# Revision 1.4  2001/08/09 09:08:55  anthonybaxter
# added identifying header to top of each file
#
# Revision 1.3  2001/07/19 07:20:12  anthony
# Handle blank resolv.conf lines.
# Patch from Bastian Kleineidam
#
# Revision 1.2  2001/07/19 06:57:07  anthony
# cvs keywords added
#
#
