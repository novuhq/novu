# -*- encoding: utf-8 -*-
"""
 $Id$

 This file is part of the py3dns project.
 Homepage: https://launchpad.net/py3dns

 This code is covered by the standard Python License. See LICENSE for details.

Changes for Python3 port © 2011-13 Scott Kitterman <scott@kitterman.com>

 Library code. Largely this is packers and unpackers for various types.
"""

#
#
# See RFC 1035:
# ------------------------------------------------------------------------
# Network Working Group                                     P. Mockapetris
# Request for Comments: 1035                                           ISI
#                                                            November 1987
# Obsoletes: RFCs 882, 883, 973
#
#             DOMAIN NAMES - IMPLEMENTATION AND SPECIFICATION
# ------------------------------------------------------------------------


import types
import socket

from . import Type
from . import Class
from . import Opcode
from . import Status
import DNS

from .Base import DNSError

try:
    import ipaddress
except ImportError:
    import ipaddr as ipaddress

LABEL_UTF8 = False
LABEL_ENCODING = 'idna'

class UnpackError(DNSError): pass
class PackError(DNSError): pass

# Low-level 16 and 32 bit integer packing and unpacking

from struct import pack as struct_pack
from struct import unpack as struct_unpack
from socket import inet_ntoa, inet_aton, inet_ntop, AF_INET6

def pack16bit(n):
    return struct_pack('!H', n)

def pack32bit(n):
    return struct_pack('!L', n)

def unpack16bit(s):
    return struct_unpack('!H', s)[0]

def unpack32bit(s):
    return struct_unpack('!L', s)[0]

def addr2bin(addr):
    # Updated from pyspf
    """Convert a string IPv4 address into an unsigned integer.

    Examples::
    >>> addr2bin('127.0.0.1')
    2130706433

    >>> addr2bin('127.0.0.1') == socket.INADDR_LOOPBACK
    1

    >>> addr2bin('255.255.255.254')
    4294967294L

    >>> addr2bin('192.168.0.1')
    3232235521L

    Unlike old DNS.addr2bin, the n, n.n, and n.n.n forms for IP addresses
    are handled as well::
    >>> addr2bin('10.65536')
    167837696
    >>> 10 * (2 ** 24) + 65536
    167837696

    >>> addr2bin('10.93.512')
    173867520
    >>> 10 * (2 ** 24) + 93 * (2 ** 16) + 512
    173867520
    """
    return struct_unpack("!L", inet_aton(addr))[0]

def bin2addr(n):
    return inet_ntoa(struct_pack('!L', n))

def bin2addr6(n):
    return inet_ntop(AF_INET6, n)

def bin2long6(str):
    # Also from pyspf
    h, l = struct_unpack("!QQ", str)
    return h << 64 | l

# Packing class

class Packer:
    " packer base class. supports basic byte/16bit/32bit/addr/string/name "
    def __init__(self):
        if DNS.LABEL_UTF8:
            enc = 'utf8'
        else:
            enc = DNS.LABEL_ENCODING
        self.buf = bytes('', enc)
        self.index = {}
    def getbuf(self):
        return self.buf
    def addbyte(self, c):
        if len(c) != 1: raise TypeError('one character expected')
        if DNS.LABEL_UTF8:
            enc = 'utf8'
        else:
            enc = DNS.LABEL_ENCODING
        self.buf = self.buf + bytes(c,enc)
    def addbytes(self, abytes):
        if DNS.LABEL_UTF8:
            enc = 'utf8'
        else:
            enc = DNS.LABEL_ENCODING
        self.buf = self.buf + bytes(abytes, enc)
    def add16bit(self, n):
        self.buf = self.buf + bytes(pack16bit(n))
    def add32bit(self, n):
        self.buf = self.buf + bytes(pack32bit(n))
    def addaddr(self, addr):
        n = addr2bin(addr)
        self.buf = self.buf + bytes(pack32bit(n))
    def addstring(self, s):
        if len(s) > 255:
            raise ValueError("Can't encode string of length "+ \
                            "%s (> 255)"%(len(s)))
        self.addbyte(chr(len(s)))
        self.addbytes(s)
    def addname(self, name):
        # Domain name packing (section 4.1.4)
        # Add a domain name to the buffer, possibly using pointers.
        # The case of the first occurrence of a name is preserved.
        # Redundant dots are ignored.
        nlist = []
        for label in name.split('.'):
            if not label:
                pass # Passing to ignore redundant dots per comments
            else:
                nlist.append(label)
        keys = []
        for i in range(len(nlist)):
            key = '.'.join(nlist[i:])
            key = key.upper()
            keys.append(key)
            if key in self.index:
                pointer = self.index[key]
                break
        else:
            i = len(nlist)
            pointer = None
        # Do it into temporaries first so exceptions don't
        # mess up self.index and self.buf
        offset = len(self.buf)
        index = []
        if DNS.LABEL_UTF8:
          enc = 'utf8'
        else:
          enc = DNS.LABEL_ENCODING
        buf = bytes('', enc)
        for j in range(i):
            label = nlist[j]
            try:
                label = label.encode(enc)
            except UnicodeEncodeError:
                if not DNS.LABEL_UTF8: raise
                if not label.startswith('\ufeff'):
                    label = '\ufeff'+label
                label = label.encode(enc)
            n = len(label)
            if n > 63:
                raise PackError('label too long')
            if offset + len(buf) < 0x3FFF:
                index.append((keys[j], offset + len(buf)))
            else:
                print('DNS.Lib.Packer.addname:')
                print('warning: pointer too big')
            buf = buf + bytes([n]) + label
        if pointer:
            buf = buf + (pack16bit(pointer | 0xC000))
        else:
            buf = buf + bytes('\0', enc)
        self.buf = self.buf + buf
        for key, value in index:
            self.index[key] = value
    def dump(self):
        keys = list(self.index.keys())
        keys.sort()
        print('-'*40)
        for key in keys:
            print('%20s %3d' % (key, self.index[key]))
        print('-'*40)
        space = 1
        for i in range(0, len(self.buf)+1, 2):
            if self.buf[i:i+2] == '**':
                if not space: print()
                space = 1
                continue
            space = 0
            print('%4d' % i)
            for c in self.buf[i:i+2]:
                if ' ' < c < '\177':
                    print(' %c' % c)
                else:
                    print('%2d' % ord(c))
            print()
        print('-'*40)


# Unpacking class


class Unpacker:
    def __init__(self, buf):
        # buf should be binary in Python3
        self.buf = buf
        self.offset = 0
    def getbyte(self):
        if self.offset >= len(self.buf):
            raise UnpackError("Ran off end of data")
        c = self.buf[self.offset]
        self.offset = self.offset + 1
        return c
    def getbytes(self, n):
        s = (self.buf[self.offset : self.offset + n])
        if len(s) != n: raise UnpackError('not enough data left')
        self.offset = self.offset + n
        return s
    def get16bit(self):
        return unpack16bit(self.getbytes(2))
    def get32bit(self):
        return unpack32bit(self.getbytes(4))
    def getaddr(self):
        if DNS.LABEL_UTF8:
          enc = 'utf8'
        else:
          enc = DNS.LABEL_ENCODING
        return bytes(bin2addr(self.get32bit()),enc)
    def getaddr6(self):
        return (self.getbytes(16))
    def getstring(self):
        return self.getbytes(self.getbyte())
    def getname(self):
        # Domain name unpacking (section 4.1.4)
        i = self.getbyte()
        #i = ord(i)
        if i and i & 0xC0 == 0xC0:
            d = self.getbyte()
            j = d
            pointer = ((i<<8) | j) & ~0xC000
            save_offset = self.offset
            try:
                self.offset = pointer
                domain = self.getname()
            finally:
                self.offset = save_offset
            return domain
        if i == 0:
            return ''
        if DNS.LABEL_UTF8:
          enc = 'utf8'
        else:
          enc = DNS.LABEL_ENCODING
        domain = str(self.getbytes(i), enc)
        remains = self.getname()
        if not remains:
            return domain
        else:
            return domain + '.' + remains

# Test program for packin/unpacking (section 4.1.4)

def testpacker():
    N = 2500
    R = list(range(N))
    import timing
    # See section 4.1.4 of RFC 1035
    timing.start()
    for i in R:
        p = Packer()
        p.addaddr('192.168.0.1')
        p.addbytes('*' * 20)
        p.addname('f.ISI.ARPA')
        p.addbytes('*' * 8)
        p.addname('Foo.F.isi.arpa')
        p.addbytes('*' * 18)
        p.addname('arpa')
        p.addbytes('*' * 26)
        p.addname('')
    timing.finish()
    print(timing.milli(), "ms total for packing")
    print(round(timing.milli()  / i, 4), 'ms per packing')
    #p.dump()
    u = Unpacker(p.buf)
    u.getaddr()
    u.getbytes(20)
    u.getname()
    u.getbytes(8)
    u.getname()
    u.getbytes(18)
    u.getname()
    u.getbytes(26)
    u.getname()
    timing.start()
    for i in R:
        u = Unpacker(p.buf)

        res = (u.getaddr(),
               u.getbytes(20),
               u.getname(),
               u.getbytes(8),
               u.getname(),
               u.getbytes(18),
               u.getname(),
               u.getbytes(26),
               u.getname())
    timing.finish()
    print(timing.milli(), "ms total for unpacking")
    print(round(timing.milli() / i, 4), 'ms per unpacking')
    #for item in res: print item


# Pack/unpack RR toplevel format (section 3.2.1)

class RRpacker(Packer):
    def __init__(self):
        Packer.__init__(self)
        self.rdstart = None
    def addRRheader(self, name, RRtype, klass, ttl, *rest):
        self.addname(name)
        self.add16bit(RRtype)
        self.add16bit(klass)
        self.add32bit(ttl)
        if rest:
            if rest[1:]: raise TypeError('too many args')
            rdlength = rest[0]
        else:
            rdlength = 0
        self.add16bit(rdlength)
        self.rdstart = len(self.buf)
    def patchrdlength(self):
        rdlength = unpack16bit(self.buf[self.rdstart-2:self.rdstart])
        if rdlength == len(self.buf) - self.rdstart:
            return
        rdata = self.buf[self.rdstart:]
        save_buf = self.buf
        ok = 0
        try:
            self.buf = self.buf[:self.rdstart-2]
            self.add16bit(len(rdata))
            self.buf = self.buf + rdata
            ok = 1
        finally:
            if not ok: self.buf = save_buf
    def endRR(self):
        if self.rdstart is not None:
            self.patchrdlength()
        self.rdstart = None
    def getbuf(self):
        if self.rdstart is not None: self.patchrdlength()
        return Packer.getbuf(self)
    # Standard RRs (section 3.3)
    def addCNAME(self, name, klass, ttl, cname):
        self.addRRheader(name, Type.CNAME, klass, ttl)
        self.addname(cname)
        self.endRR()
    def addHINFO(self, name, klass, ttl, cpu, os):
        self.addRRheader(name, Type.HINFO, klass, ttl)
        self.addstring(cpu)
        self.addstring(os)
        self.endRR()
    def addMX(self, name, klass, ttl, preference, exchange):
        self.addRRheader(name, Type.MX, klass, ttl)
        self.add16bit(preference)
        self.addname(exchange)
        self.endRR()
    def addNS(self, name, klass, ttl, nsdname):
        self.addRRheader(name, Type.NS, klass, ttl)
        self.addname(nsdname)
        self.endRR()
    def addPTR(self, name, klass, ttl, ptrdname):
        self.addRRheader(name, Type.PTR, klass, ttl)
        self.addname(ptrdname)
        self.endRR()
    def addSOA(self, name, klass, ttl,
              mname, rname, serial, refresh, retry, expire, minimum):
        self.addRRheader(name, Type.SOA, klass, ttl)
        self.addname(mname)
        self.addname(rname)
        self.add32bit(serial)
        self.add32bit(refresh)
        self.add32bit(retry)
        self.add32bit(expire)
        self.add32bit(minimum)
        self.endRR()
    def addTXT(self, name, klass, ttl, tlist):
        self.addRRheader(name, Type.TXT, klass, ttl)
        if type(tlist) is bytes or type(tlist) is str:
            tlist = [tlist]
        for txtdata in tlist:
            self.addstring(txtdata)
        self.endRR()
    def addSPF(self, name, klass, ttl, tlist):
        self.addRRheader(name, Type.TXT, klass, ttl)
        if type(tlist) is bytes or type(tlist) is str:
            tlist = [tlist]
        for txtdata in tlist:
            self.addstring(txtdata)
        self.endRR()
    # Internet specific RRs (section 3.4) -- class = IN
    def addA(self, name, klass, ttl, address):
        self.addRRheader(name, Type.A, klass, ttl)
        self.addaddr(address)
        self.endRR()
    def addWKS(self, name, ttl, address, protocol, bitmap):
        self.addRRheader(name, Type.WKS, Class.IN, ttl)
        self.addaddr(address)
        self.addbyte(chr(protocol))
        self.addbytes(bitmap)
        self.endRR()
    def addSRV(self):
        raise NotImplementedError

def prettyTime(seconds):
    if seconds<60:
        return seconds,"%d seconds"%(seconds)
    if seconds<3600:
        return seconds,"%d minutes"%(seconds/60)
    if seconds<86400:
        return seconds,"%d hours"%(seconds/3600)
    if seconds<604800:
        return seconds,"%d days"%(seconds/86400)
    else:
        return seconds,"%d weeks"%(seconds/604800)

class RRunpacker(Unpacker):
    def __init__(self, buf):
        Unpacker.__init__(self, buf)
        self.rdend = None
    def getRRheader(self):
        name = self.getname()
        rrtype = self.get16bit()
        klass = self.get16bit()
        ttl = self.get32bit()
        rdlength = self.get16bit()
        self.rdend = self.offset + rdlength
        return (name, rrtype, klass, ttl, rdlength)
    def endRR(self):
        if self.offset != self.rdend:
            raise UnpackError('end of RR not reached')
    def getCNAMEdata(self):
        return self.getname()
    def getHINFOdata(self):
        if DNS.LABEL_UTF8:
            enc = 'utf8'
        else:
            enc = DNS.LABEL_ENCODING
        return str(self.getstring(), enc), str(self.getstring(),enc)
    def getMXdata(self):
        return self.get16bit(), self.getname()
    def getNSdata(self):
        return self.getname()
    def getPTRdata(self):
        return self.getname()
    def getSOAdata(self):
        return self.getname(), \
               self.getname(), \
               ('serial',)+(self.get32bit(),), \
               ('refresh ',)+prettyTime(self.get32bit()), \
               ('retry',)+prettyTime(self.get32bit()), \
               ('expire',)+prettyTime(self.get32bit()), \
               ('minimum',)+prettyTime(self.get32bit())
    def getTXTdata(self):
        tlist = []
        while self.offset != self.rdend:
            tlist.append(bytes(self.getstring()))
        return tlist
    getSPFdata = getTXTdata
    def getAdata(self):
        if DNS.LABEL_UTF8:
            enc = 'utf8'
        else:
            enc = DNS.LABEL_ENCODING
        return self.getaddr().decode(enc)
    def getWKSdata(self):
        address = self.getaddr()
        protocol = ord(self.getbyte())
        bitmap = self.getbytes(self.rdend - self.offset)
        return address, protocol, bitmap
    def getSRVdata(self):
        """
        _Service._Proto.Name TTL Class SRV Priority Weight Port Target
        """
        priority = self.get16bit()
        weight = self.get16bit()
        port = self.get16bit()
        target = self.getname()
        #print '***priority, weight, port, target', priority, weight, port, target
        return priority, weight, port, target

class RRunpackerDefault(RRunpacker):
    # Default for DNS.qry
    def __init__(self, buf):
        RRunpacker.__init__(self, buf)
        self.rdend = None
    def getAdata(self):
        if DNS.LABEL_UTF8:
            enc = 'utf8'
        else:
            enc = DNS.LABEL_ENCODING
        x = socket.inet_aton(self.getaddr().decode(enc))
        return ipaddress.IPv4Address(struct_unpack("!I", x)[0])
    def getAAAAdata(self):
        return ipaddress.IPv6Address(bin2addr6(self.getaddr6()))

class RRunpackerText(RRunpackerDefault):
    def __init__(self, buf):
        RRunpackerDefault.__init__(self, buf)
    def getAdata(self):
        if DNS.LABEL_UTF8:
            enc = 'utf8'
        else:
            enc = DNS.LABEL_ENCODING
        return self.getaddr().decode(enc)
    def getAAAAdata(self):
        return bin2addr6(self.getaddr6())
    def getTXTdata(self):
        if DNS.LABEL_UTF8:
            enc = 'utf8'
        else:
            enc = DNS.LABEL_ENCODING
        tlist = []
        while self.offset != self.rdend:
            tlist.append(str(self.getstring(), enc))
        return tlist

class RRunpackerInteger(RRunpackerDefault):
    def __init__(self, buf):
        RRunpackerDefault.__init__(self, buf)
    def getAdata(self):
        if DNS.LABEL_UTF8:
            enc = 'utf8'
        else:
            enc = DNS.LABEL_ENCODING
        x = socket.inet_aton(self.getaddr().decode(enc))
        return struct_unpack("!I", x)[0]
    def getAAAAdata(self):
        return bin2long6(self.getaddr6())
 
class RRunpackerBinary(Unpacker):
    def __init__(self, buf):
        Unpacker.__init__(self, buf)
        self.rdend = None
    def getRRheader(self):
        name = self.getname()
        rrtype = self.get16bit()
        klass = self.get16bit()
        ttl = self.get32bit()
        rdlength = self.get16bit()
        self.rdlength = rdlength
        self.rdend = self.offset + rdlength
        return (name, rrtype, klass, ttl, rdlength)
    def endRR(self):
        if self.offset != self.rdend:
            raise UnpackError('end of RR not reached')
    def getTXTdata(self):
        tlist = []
        while self.offset != self.rdend:
            tlist.append(self.getbytes(self.rdlength))
        return tlist
    getSPFdata = getTXTdata

# Pack/unpack Message Header (section 4.1)

class Hpacker(Packer):
    def addHeader(self, id, qr, opcode, aa, tc, rd, ra, z, rcode,
              qdcount, ancount, nscount, arcount):
        self.add16bit(id)
        self.add16bit((qr&1)<<15 | (opcode&0xF)<<11 | (aa&1)<<10
                  | (tc&1)<<9 | (rd&1)<<8 | (ra&1)<<7
                  | (z&7)<<4 | (rcode&0xF))
        self.add16bit(qdcount)
        self.add16bit(ancount)
        self.add16bit(nscount)
        self.add16bit(arcount)

class Hunpacker(Unpacker):
    def getHeader(self):
        id = self.get16bit()
        flags = self.get16bit()
        qr, opcode, aa, tc, rd, ra, z, rcode = (
                  (flags>>15)&1,
                  (flags>>11)&0xF,
                  (flags>>10)&1,
                  (flags>>9)&1,
                  (flags>>8)&1,
                  (flags>>7)&1,
                  (flags>>4)&7,
                  (flags>>0)&0xF)
        qdcount = self.get16bit()
        ancount = self.get16bit()
        nscount = self.get16bit()
        arcount = self.get16bit()
        return (id, qr, opcode, aa, tc, rd, ra, z, rcode,
                  qdcount, ancount, nscount, arcount)


# Pack/unpack Question (section 4.1.2)

class Qpacker(Packer):
    def addQuestion(self, qname, qtype, qclass):
        self.addname(qname)
        self.add16bit(qtype)
        self.add16bit(qclass)

class Qunpacker(Unpacker):
    def getQuestion(self):
        return self.getname(), self.get16bit(), self.get16bit()


# Pack/unpack Message(section 4)
# NB the order of the base classes is important for __init__()!

class Mpacker(RRpacker, Qpacker, Hpacker):
    pass

class Munpacker(RRunpacker, Qunpacker, Hunpacker):
    # Default results for DNS.req
    pass

class MunpackerDefault(RRunpackerDefault, Qunpacker, Hunpacker):
    # Default results for DNS.qry
    pass

class MunpackerText(RRunpackerText, Qunpacker, Hunpacker):
    pass

class MunpackerBinary(RRunpackerBinary, Qunpacker, Hunpacker):
    pass

class MunpackerInteger(RRunpackerInteger, Qunpacker, Hunpacker):
    pass
 
# Routines to print an unpacker to stdout, for debugging.
# These affect the unpacker's current position!

def dumpM(u):
    print('HEADER:')
    (id, qr, opcode, aa, tc, rd, ra, z, rcode,
              qdcount, ancount, nscount, arcount) = u.getHeader()
    print('id=%d,' % id)
    print('qr=%d, opcode=%d, aa=%d, tc=%d, rd=%d, ra=%d, z=%d, rcode=%d,' \
              % (qr, opcode, aa, tc, rd, ra, z, rcode))
    if tc: print('*** response truncated! ***')
    if rcode: print('*** nonzero error code! (%d) ***' % rcode)
    print('  qdcount=%d, ancount=%d, nscount=%d, arcount=%d' \
              % (qdcount, ancount, nscount, arcount))
    for i in range(qdcount):
        print('QUESTION %d:' % i)
        dumpQ(u)
    for i in range(ancount):
        print('ANSWER %d:' % i)
        dumpRR(u)
    for i in range(nscount):
        print('AUTHORITY RECORD %d:' % i)
        dumpRR(u)
    for i in range(arcount):
        print('ADDITIONAL RECORD %d:' % i)
        dumpRR(u)

class DnsResult:

    def __init__(self,u,args):
        self.header={}
        self.questions=[]
        self.answers=[]
        self.authority=[]
        self.additional=[]
        self.args=args
        self.storeM(u)

    def show(self):
        import time
        print('; <<>> PDG.py 1.0 <<>> %s %s'%(self.args['name'],
            self.args['qtype']))
        opt=""
        if self.args['rd']:
            opt=opt+'recurs '
        h=self.header
        print(';; options: '+opt)
        print(';; got answer:')
        print(';; ->>HEADER<<- opcode %s, status %s, id %d'%(
            h['opcode'],h['status'],h['id']))
        flags=list(filter(lambda x,h=h:h[x],('qr','aa','rd','ra','tc')))
        print(';; flags: %s; Ques: %d, Ans: %d, Auth: %d, Addit: %d'%(
            ' '.join(flags),h['qdcount'],h['ancount'],h['nscount'],
            h['arcount']))
        print(';; QUESTIONS:')
        for q in self.questions:
            print(';;      %s, type = %s, class = %s'%(q['qname'],q['qtypestr'],
                q['qclassstr']))
        print()
        print(';; ANSWERS:')
        for a in self.answers:
            print('%-20s    %-6s  %-6s  %s'%(a['name'],repr(a['ttl']),a['typename'],
                a['data']))
        print()
        print(';; AUTHORITY RECORDS:')
        for a in self.authority:
            print('%-20s    %-6s  %-6s  %s'%(a['name'],repr(a['ttl']),a['typename'],
                a['data']))
        print()
        print(';; ADDITIONAL RECORDS:')
        for a in self.additional:
            print('%-20s    %-6s  %-6s  %s'%(a['name'],repr(a['ttl']),a['typename'],
                a['data']))
        print()
        if 'elapsed' in self.args:
            print(';; Total query time: %d msec'%self.args['elapsed'])
        print(';; To SERVER: %s'%(self.args['server']))
        print(';; WHEN: %s'%time.ctime(time.time()))

    def storeM(self,u):
        (self.header['id'], self.header['qr'], self.header['opcode'],
          self.header['aa'], self.header['tc'], self.header['rd'],
          self.header['ra'], self.header['z'], self.header['rcode'],
          self.header['qdcount'], self.header['ancount'],
          self.header['nscount'], self.header['arcount']) = u.getHeader()
        self.header['opcodestr']=Opcode.opcodestr(self.header['opcode'])
        self.header['status']=Status.statusstr(self.header['rcode'])
        for i in range(self.header['qdcount']):
            #print 'QUESTION %d:' % i,
            self.questions.append(self.storeQ(u))
        for i in range(self.header['ancount']):
            #print 'ANSWER %d:' % i,
            self.answers.append(self.storeRR(u))
        for i in range(self.header['nscount']):
            #print 'AUTHORITY RECORD %d:' % i,
            self.authority.append(self.storeRR(u))
        for i in range(self.header['arcount']):
            #print 'ADDITIONAL RECORD %d:' % i,
            self.additional.append(self.storeRR(u))

    def storeQ(self,u):
        q={}
        q['qname'], q['qtype'], q['qclass'] = u.getQuestion()
        q['qtypestr']=Type.typestr(q['qtype'])
        q['qclassstr']=Class.classstr(q['qclass'])
        return q

    def storeRR(self,u):
        r={}
        r['name'],r['type'],r['class'],r['ttl'],r['rdlength'] = u.getRRheader()
        r['typename'] = Type.typestr(r['type'])
        r['classstr'] = Class.classstr(r['class'])
        #print 'name=%s, type=%d(%s), class=%d(%s), ttl=%d' \
        #      % (name,
        #        type, typename,
        #        klass, Class.classstr(class),
        #        ttl)
        mname = 'get%sdata' % r['typename']
        if hasattr(u, mname):
            r['data']=getattr(u, mname)()
        else:
            r['data']=u.getbytes(r['rdlength'])
        return r

def dumpQ(u):
    qname, qtype, qclass = u.getQuestion()
    print('qname=%s, qtype=%d(%s), qclass=%d(%s)' \
              % (qname,
                 qtype, Type.typestr(qtype),
                 qclass, Class.classstr(qclass)))

def dumpRR(u):
    name, type, klass, ttl, rdlength = u.getRRheader()
    typename = Type.typestr(type)
    print('name=%s, type=%d(%s), class=%d(%s), ttl=%d' \
              % (name,
                 type, typename,
                 klass, Class.classstr(klass),
                 ttl))
    mname = 'get%sdata' % typename
    if hasattr(u, mname):
        print('  formatted rdata:', getattr(u, mname)())
    else:
        print('  binary rdata:', u.getbytes(rdlength))

if __name__ == "__main__":
    testpacker()
