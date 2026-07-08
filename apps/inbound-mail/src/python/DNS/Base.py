"""
$Id$

This file is part of the py3dns project.
Homepage: https://launchpad.net/py3dns

This code is covered by the standard Python License. See LICENSE for details.

Changes for Python3 port © 2011-14 Scott Kitterman <scott@kitterman.com>

    Base functionality. Request and Response classes, that sort of thing.
"""

import socket, string, types, time, select
import errno
from . import Type,Class,Opcode
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
from . import Lib

defaults= { 'protocol':'udp', 'port':53, 'opcode':Opcode.QUERY,
            'qtype':Type.A, 'rd':1, 'timing':1, 'timeout': 30, 'server_rotate': 0,
            'server': [] }

def ParseResolvConf(resolv_path="/etc/resolv.conf"):
    "parses the /etc/resolv.conf file and sets defaults for name servers"
    try:
        with open(resolv_path, 'r') as stream:
            return ParseResolvConfFromIterable(stream)
    except FileNotFoundError:
        return(defaults['server'].append('127.0.0.1'))


def ParseResolvConfFromIterable(lines):
    "parses a resolv.conf formatted stream and sets defaults for name servers"
    global defaults
    for line in lines:
        line = line.strip()
        if not line or line[0]==';' or line[0]=='#':
            continue
        fields=line.split()
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

def _DiscoverNameServers():
    import sys
    if sys.platform in ('win32', 'nt'):
        from . import win32dns
        defaults['server']=win32dns.RegistryResolve()
    elif sys.platform == 'darwin':
        ParseOSXSysConfig()
    else:
        return ParseResolvConf()

def DiscoverNameServers():
    """Don't call, only here for backward compatability.  We do discovery for
    you automatically.
    """
    pass

class DnsRequest:
    """ high level Request object """
    def __init__(self,*name,**args):
        self.donefunc=None
        self.defaults = {}
        self.argparse(name,args)
        self.defaults = self.args
        self.tid = 0
        self.resulttype = ''
        if len(self.defaults['server']) == 0:
            raise DNSError('No working name servers discovered')

    def argparse(self,name,args):
        if not name and 'name' in self.defaults:
            args['name'] = self.defaults['name']
        if type(name) is bytes or type(name) is str:
            args['name']=name
        else:
            if len(name) == 1:
                if name[0]:
                    args['name']=name[0]
        if defaults['server_rotate'] and \
                type(defaults['server']) == types.ListType:
            defaults['server'] = defaults['server'][1:]+defaults['server'][:1]
        for i in list(defaults.keys()):
            if i not in args:
                if i in self.defaults:
                    args[i]=self.defaults[i]
                else:
                    args[i]=defaults[i]
        if type(args['server']) == bytes or type(args['server']) == str:
            args['server'] = [args['server']]
        self.args=args

    def socketInit(self,a,b):
        self.s = socket.socket(a,b)

    def processUDPReply(self):
        if self.timeout > 0:
            r,w,e = select.select([self.s],[],[],self.timeout)
            if not len(r):
                raise TimeoutError('Timeout')
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
            if rem <= 0: raise DNSError('Timeout')
            self.s.settimeout(rem)
        buf = f.read(count - len(res))
        if not buf:
          raise DNSError('incomplete reply - %d of %d read' % (len(res),count))
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
        finally:
            f.close()
        self.time_finish=time.time()
        self.args['server']=self.ns
        return self.processReply()

    def processReply(self):
        self.args['elapsed']=(self.time_finish-self.time_start)*1000
        if not self.resulttype:
            u = Lib.Munpacker(self.reply)
        elif self.resulttype == 'default':
            u = Lib.MunpackerDefault(self.reply)
        elif self.resulttype == 'binary':
            u = Lib.MunpackerBinary(self.reply)
        elif self.resulttype == 'text':
            u = Lib.MunpackerText(self.reply)
        elif self.resulttype == 'integer':
            u = Lib.MunpackerInteger(self.reply)
        else:
            raise SyntaxError('Unknown resulttype: ' + self.resulttype)
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
            except socket.error as msg: 
                # errno.EADDRINUSE, 'Address already in use'
                if msg.errno != errno.EADDRINUSE: raise

    def conn(self):
        self.getSource()
        self.s.connect((self.ns,self.port))

    def qry(self,*name,**args):
        '''
        Request function for the DnsRequest class.  In addition to standard
        DNS args, the special pydns arg 'resulttype' can optionally be passed.
        Valid resulttypes are 'default', 'text', 'decimal', and 'binary'.

        Defaults are configured to be compatible with pydns:
        AAAA: decimal
        Others: text
        '''
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
        if 'resulttype' in self.args:
            self.resulttype = self.args['resulttype']
        else:
            self.resulttype = 'default'
        if type(self.args['qtype']) == bytes or type(self.args['qtype']) == str:
            try:
                qtype = getattr(Type, str(self.args['qtype'].upper()))
            except AttributeError:
                raise ArgumentError('unknown query type')
        else:
            qtype = self.args['qtype']
        if 'name' not in self.args:
            print((self.args))
            raise ArgumentError('nothing to lookup')
        qname = self.args['name']
        if qtype == Type.AXFR and protocol != 'tcp':
            print('Query type AXFR, protocol forced to TCP')
            protocol = 'tcp'
        #print('QTYPE %d(%s)' % (qtype, Type.typestr(qtype)))
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
        except socket.error as reason:
            raise SocketError(reason)
        return self.response

    def req(self,*name,**args):
        " needs a refactoring "
        self.argparse(name,args)
        #if not self.args:
        #    raise ArgumentError, 'reinitialize request before reuse'
        try:
            if self.args['resulttype']:
                raise ArgumentError('Restulttype {0} set with DNS.req, use DNS.qry to specify result type.'.format(self.args['resulttype']))
        except:
            # resulttype isn't set and that's what we want for DNS.req
            pass
        protocol = self.args['protocol']
        self.port = self.args['port']
        self.tid = random.randint(0,65535)
        self.timeout = self.args['timeout'];
        opcode = self.args['opcode']
        rd = self.args['rd']
        server=self.args['server']
        if type(self.args['qtype']) == bytes or type(self.args['qtype']) == str:
            try:
                qtype = getattr(Type, str(self.args['qtype'].upper()))
            except AttributeError:
                raise ArgumentError('unknown query type')
        else:
            qtype = self.args['qtype']
        if 'name' not in self.args:
            print((self.args))
            raise ArgumentError('nothing to lookup')
        qname = self.args['name']
        if qtype == Type.AXFR and protocol != 'tcp':
            print('Query type AXFR, protocol forced to TCP')
            protocol = 'tcp'
        #print('QTYPE %d(%s)' % (qtype, Type.typestr(qtype)))
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
        except socket.error as reason:
            raise SocketError(reason)
        return self.response

    def sendUDPRequest(self, server):
        "refactor me"
        first_socket_error = None
        self.response=None
        for self.ns in server:
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
                    self.s.send(self.request)
                    r=self.processUDPReply()
                    # Since we bind to the source port and connect to the
                    # destination port, we don't need to check that here,
                    # but do make sure it's actually a DNS request that the
                    # packet is in reply to.
                    while (r.header['id'] != self.tid or
                            self.from_address[1] != self.port):
                        r=self.processUDPReply()
                    self.response = r
                finally:
                    self.s.close()
            except socket.error as e:
                # Keep trying more nameservers, but preserve the first error
                # that occurred so it can be reraised in case none of the
                # servers worked:
                first_socket_error = first_socket_error or e
                continue
            except TimeoutError as t:
                first_socket_error = first_socket_error or t
                continue
            if self.response:
                break
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
            except socket.error as e:
                first_socket_error = first_socket_error or e
                continue
            except TimeoutError as t:
                first_socket_error = first_socket_error or t
                continue
            if self.response:
                break
        if not self.response and first_socket_error:
            raise first_socket_error

def ParseOSXSysConfig():
    "Retrieves the current Mac OS X resolver settings using the scutil(8) command."
    import os, re
    scutil = os.popen('/usr/sbin/scutil --dns', 'r')
    res_re = re.compile(r'^\s+nameserver[]0-9[]*\s*\:\s*(\S+)$')
    sets = [ ]
    currentset = None
    while True:
        l = scutil.readline()
        if not l:
            break
        l = l.rstrip()
        if len(l) < 1 or l[0] not in string.whitespace:
            currentset = None
            continue
        m = res_re.match(l)
        if m:
            if currentset is None:
                currentset = [ ]
                sets.append(currentset)
            currentset.append(m.group(1))
    scutil.close()
    # Someday: Figure out if we should do something other than simply concatenate the sets.
    for currentset in sets:
        defaults['server'].extend(currentset)

