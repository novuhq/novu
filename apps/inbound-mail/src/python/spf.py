#!/usr/bin/python
"""SPF (Sender Policy Framework) implementation.

Copyright (c) 2003 Terence Way <terry@wayforward.net>
Portions Copyright(c) 2004,2005,2006,2007,2008,2011,2012 Stuart Gathman <stuart@bmsi.com>
Portions Copyright(c) 2005,2006,2007,2008,2011,2012,2013 Scott Kitterman <scott@kitterman.com>
Portions Copyright(c) 2013 Stuart Gathman <stuart@gathman.org>

This module is free software, and you may redistribute it and/or modify
it under the same terms as Python itself, so long as this copyright message
and disclaimer are retained in their original form.

IN NO EVENT SHALL THE AUTHOR BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT,
SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OF
THIS CODE, EVEN IF THE AUTHOR HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH
DAMAGE.

THE AUTHOR SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE.  THE CODE PROVIDED HEREUNDER IS ON AN "AS IS" BASIS,
AND THERE IS NO OBLIGATION WHATSOEVER TO PROVIDE MAINTENANCE,
SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.

For more information about SPF, a tool against email forgery, see
    http://www.openspf.net/

For news, bugfixes, etc. visit the home page for this implementation at
    http://cheeseshop.python.org/pypi/pyspf/
    http://sourceforge.net/projects/pymilter/
    http://www.wayforward.net/spf/
"""

# CVS Commits since last release (2.0.7):
# $Log: spf.py,v $
# Revision 1.108.2.109  2013/07/25 01:51:24  customdesigned
# Forgot to convert to bytes in py3dns-3.0.2 workaround.
#
# Revision 1.108.2.108  2013/07/25 01:29:07  customdesigned
# The Final and Ultimate Solution to the String Problem for TXT records.
#
# Revision 1.108.2.107  2013/07/23 18:37:17  customdesigned
# Removed decode from dns_txt again, as it breaks python3, both with py3dns and test framework.
# Need to identify exact situation in which it is needed to put it back.
#
# Revision 1.108.2.106  2013/07/23 06:32:58  kitterma
# Post fix cleanup.
#
# Revision 1.108.2.105  2013/07/23 06:30:13  kitterma
# Fix compatibility with py3dns versions that return type bytes.
#
# Revision 1.108.2.104  2013/07/23 06:20:18  kitterma
# Consolidate code related to UnicodeDecodeError and UnicodeEncodeError into UnicodeError.
#
# Revision 1.108.2.103  2013/07/23 06:07:24  customdesigned
# Test case and fix for allowing non-ascii in non-spf TXT records.
#
# Revision 1.108.2.102  2013/07/23 05:22:54  customdesigned
# Check for non-ascii on explanation.
#
# Revision 1.108.2.101  2013/07/23 04:51:59  customdesigned
# Functional alias for __email__
#
# Revision 1.108.2.100  2013/07/23 04:07:38  customdesigned
# Sort unofficial keywords for consistent ordering.
#
# Revision 1.108.2.99  2013/07/23 02:40:54  customdesigned
# Update __email__ and __author__
#
# Revision 1.108.2.98  2013/07/23 02:35:33  customdesigned
# Release 2.0.8
#
# Revision 1.108.2.97  2013/07/23 02:04:59  customdesigned
# Release 2.0.8
#
# Revision 1.108.2.96  2013/07/22 22:59:58  kitterma
# Give another header test it's own variable names.
#
# Revision 1.108.2.95  2013/07/22 19:29:22  kitterma
# Fix dns_txt to work if DNS data is not pure bytes for python3 compatibility.
#
# Revision 1.108.2.94  2013/07/22 02:44:39  kitterma
# Add tests for cirdmatch.
#
# Revision 1.108.2.93  2013/07/21 23:56:51  kitterma
# Fix cidrmatch to work with both ipaddr and the python3.3 ipadrress versions of the module.
#
# Revision 1.108.2.91  2013/07/03 23:38:39  customdesigned
# Removed two more unused functions.
#
# Revision 1.108.2.90  2013/07/03 22:58:26  customdesigned
# Clean up use of ipaddress module.  make %{i} upper case to match test suite
# (test suite is incorrect requiring uppercase, but one thing at a time).
# Remove no longer used inet_pton substitute.  But what if someone was using it?
#
# Revision 1.108.2.89  2013/05/26 03:32:19  kitterma
# Syntax fix to maintain python2.6 compatibility.
#
# Revision 1.108.2.88  2013/05/26 00:30:12  kitterma
# Bump versions to 2.0.8 and add CHANGELOG entries.
#
# Revision 1.108.2.87  2013/05/26 00:23:52  kitterma
# Move old (pre-2.0.7) spf.py commit messages to pyspf_changelog.txt.
#
# Revision 1.108.2.86  2013/05/25 22:39:19  kitterma
# Use ipaddr/ipaddress instead of custome code.
#
# Revision 1.108.2.85  2013/05/25 00:06:03  kitterma
# Fix return type detection for bytes/string for python3 compatibility in dns_txt.
#
# Revision 1.108.2.84  2013/04/20 20:49:13  customdesigned
# Some dual-cidr doc tests
#
# Revision 1.108.2.83  2013/03/25 22:51:37  customdesigned
# Replace dns_99 method with dns_txt(type='SPF')
# Fix null CNAME in cache bug.
#
# Revision 1.108.2.82  2013/03/14 21:13:06  customdesigned
# Fix Non-ascii exception description.
#
# Revision 1.108.2.81  2013/03/14 21:03:25  customdesigned
# Fix dns_txt and dns_spf - should hopefully still be correct for python3.
#
# Revision 1.108.2.80  2012/06/14 20:09:56  kitterma
# Use the correct exception type to capture unicode in SPF records.
#
# Revision 1.108.2.79  2012/03/10 00:19:44  kitterma
# Add fixes for py3dns DNS return as type bytes - not complete.
#
# Revision 1.108.2.77  2012/02/09 22:13:42  kitterma
# Fix stray character in last commit.
# Start fixing python3 bytes issue - Now works, but fails the non-ASCII exp test.
#
# Revision 1.108.2.76  2012/02/05 05:50:39  kitterma
# Fix a few stray print -> print() changes for python3 compatibility.
#
# See pyspf_changelog.txt for earlier CVS commits.

__author__ = "Terence Way, Stuart Gathman, Scott Kitterman"
__email__ = "pyspf@openspf.org"
__version__ = "2.0.8: Jul 22, 2013"
MODULE = 'spf'

USAGE = """To check an incoming mail request:
    % python spf.py [-v] {ip} {sender} {helo}
    % python spf.py 69.55.226.139 tway@optsw.com mx1.wayforward.net

To test an SPF record:
    % python spf.py [-v] "v=spf1..." {ip} {sender} {helo}
    % python spf.py "v=spf1 +mx +ip4:10.0.0.1 -all" 10.0.0.1 tway@foo.com a

To fetch an SPF record:
    % python spf.py {domain}
    % python spf.py wayforward.net

To test this script (and to output this usage message):
    % python spf.py
"""

import re
import sys
import socket  # for inet_ntoa() and inet_aton()
import struct  # for pack() and unpack()
import time    # for time()
try:
    import urllib.parse as urllibparse # for quote()
except:
    import urllib as urllibparse
import sys     # for version_info()
from functools import reduce
try:
    from email.message import Message
except ImportError:
    from email.Message import Message
try:
    # Python standard library as of python3.3
    import ipaddress
except ImportError:
    try:
        import ipaddr as ipaddress
    except ImportError:
        print('ipaddr module required: http://code.google.com/p/ipaddr-py/')

import DNS    # http://pydns.sourceforge.net
if not hasattr(DNS.Type, 'SPF'):
    # patch in type99 support
    DNS.Type.SPF = 99
    DNS.Type.typemap[99] = 'SPF'
    DNS.Lib.RRunpacker.getSPFdata = DNS.Lib.RRunpacker.getTXTdata

def DNSLookup(name, qtype, strict=True, timeout=30):
    try:
        req = DNS.DnsRequest(name, qtype=qtype, timeout=timeout)
        resp = req.req()
        #resp.show()
        # key k: ('wayforward.net', 'A'), value v
        # FIXME: pydns returns AAAA RR as 16 byte binary string, but
        # A RR as dotted quad.  For consistency, this driver should
        # return both as binary string.
        #
        if resp.header['tc'] == True:
            if strict > 1:
                raise AmbiguityWarning('DNS: Truncated UDP Reply, SPF records should fit in a UDP packet, retrying TCP')
            try:
                req = DNS.DnsRequest(name, qtype=qtype, protocol='tcp', timeout=(timeout))
                resp = req.req()
            except DNS.DNSError as x:
                raise TempError('DNS: TCP Fallback error: ' + str(x))
            if resp.header['rcode'] != 0 and resp.header['rcode'] != 3:
                raise IOError('Error: ' + resp.header['status'] + '  RCODE: ' + str(resp.header['rcode']))
        return [((a['name'], a['typename']), a['data'])
                for a in resp.answers] \
             + [((a['name'], a['typename']), a['data'])
                for a in resp.additional]
    except IOError as x:
        raise TempError('DNS ' + str(x))
    except DNS.DNSError as x:
        raise TempError('DNS ' + str(x))

RE_SPF = re.compile(br'^v=spf1$|^v=spf1 ',re.IGNORECASE)

# Regular expression to look for modifiers
RE_MODIFIER = re.compile(r'^([a-z][a-z0-9_\-\.]*)=', re.IGNORECASE)

# Regular expression to find macro expansions
PAT_CHAR = r'%(%|_|-|(\{[^\}]*\}))'
RE_CHAR = re.compile(PAT_CHAR)

# Regular expression to break up a macro expansion
RE_ARGS = re.compile(r'([0-9]*)(r?)([^0-9a-zA-Z]*)')

RE_DUAL_CIDR = re.compile(r'//(0|[1-9]\d*)$')
RE_CIDR = re.compile(r'/(0|[1-9]\d*)$')

PAT_IP4 = r'\.'.join([r'(?:\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])']*4)
RE_IP4 = re.compile(PAT_IP4+'$')

RE_TOPLAB = re.compile(
    r'\.(?:[0-9a-z]*[a-z][0-9a-z]*|[0-9a-z]+-[0-9a-z-]*[0-9a-z])\.?$|%s'
        % PAT_CHAR, re.IGNORECASE)

RE_DOT_ATOM = re.compile(r'%(atext)s+([.]%(atext)s+)*$' % {
    'atext': r"[0-9a-z!#$%&'*+/=?^_`{}|~-]" }, re.IGNORECASE)

# Derived from RFC 3986 appendix A
RE_IP6 = re.compile(                 '(?:%(hex4)s:){6}%(ls32)s$'
                   '|::(?:%(hex4)s:){5}%(ls32)s$'
                  '|(?:%(hex4)s)?::(?:%(hex4)s:){4}%(ls32)s$'
    '|(?:(?:%(hex4)s:){0,1}%(hex4)s)?::(?:%(hex4)s:){3}%(ls32)s$'
    '|(?:(?:%(hex4)s:){0,2}%(hex4)s)?::(?:%(hex4)s:){2}%(ls32)s$'
    '|(?:(?:%(hex4)s:){0,3}%(hex4)s)?::%(hex4)s:%(ls32)s$'
    '|(?:(?:%(hex4)s:){0,4}%(hex4)s)?::%(ls32)s$'
    '|(?:(?:%(hex4)s:){0,5}%(hex4)s)?::%(hex4)s$'
    '|(?:(?:%(hex4)s:){0,6}%(hex4)s)?::$'
  % {
    'ls32': r'(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|%s)'%PAT_IP4,
    'hex4': r'[0-9a-f]{1,4}'
    }, re.IGNORECASE)

# Local parts and senders have their delimiters replaced with '.' during
# macro expansion
#
JOINERS = {'l': '.', 's': '.'}

RESULTS = {'+': 'pass', '-': 'fail', '?': 'neutral', '~': 'softfail',
           'pass': 'pass', 'fail': 'fail', 'permerror': 'permerror',
       'error': 'temperror', 'neutral': 'neutral', 'softfail': 'softfail',
       'none': 'none', 'local': 'local', 'trusted': 'trusted',
           'ambiguous': 'ambiguous', 'unknown': 'permerror' }

EXPLANATIONS = {'pass': 'sender SPF authorized',
                'fail': 'SPF fail - not authorized',
                'permerror': 'permanent error in processing',
                'temperror': 'temporary DNS error in processing',
        'softfail': 'domain owner discourages use of this host',
        'neutral': 'access neither permitted nor denied',
        'none': '',
                #Note: The following are not formally SPF results
                'local': 'No SPF result due to local policy',
                'trusted': 'No SPF check - trusted-forwarder.org',
                #Ambiguous only used in harsh mode for SPF validation
                'ambiguous': 'No error, but results may vary'
        }

DELEGATE = None

# standard default SPF record for best_guess
DEFAULT_SPF = 'v=spf1 a/24 mx/24 ptr'

#Whitelisted forwarders here.  Additional locally trusted forwarders can be
#added to this record.
TRUSTED_FORWARDERS = 'v=spf1 ?include:spf.trusted-forwarder.org -all'

# maximum DNS lookups allowed
MAX_LOOKUP = 10 #RFC 4408 Para 10.1
MAX_MX = 10 #RFC 4408 Para 10.1
MAX_PTR = 10 #RFC 4408 Para 10.1
MAX_CNAME = 10 # analogous interpretation to MAX_PTR
MAX_RECURSION = 20
MAX_PER_LOOKUP_TIME = 30 # Long standing pyspf default

ALL_MECHANISMS = ('a', 'mx', 'ptr', 'exists', 'include', 'ip4', 'ip6', 'all')
COMMON_MISTAKES = {
  'prt': 'ptr', 'ip': 'ip4', 'ipv4': 'ip4', 'ipv6': 'ip6', 'all.': 'all'
}

#If harsh processing, for the validator, is invoked, warn if results
#likely deviate from the publishers intention.
class AmbiguityWarning(Exception):
    "SPF Warning - ambiguous results"
    def __init__(self, msg, mech=None, ext=None):
        Exception.__init__(self, msg, mech)
        self.msg = msg
        self.mech = mech
        self.ext = ext
    def __str__(self):
        if self.mech:
            return '%s: %s' %(self.msg, self.mech)
        return self.msg

class TempError(Exception):
    "Temporary SPF error"
    def __init__(self, msg, mech=None, ext=None):
        Exception.__init__(self, msg, mech)
        self.msg = msg
        self.mech = mech
        self.ext = ext
    def __str__(self):
        if self.mech:
            return '%s: %s '%(self.msg, self.mech)
        return self.msg

class PermError(Exception):
    "Permanent SPF error"
    def __init__(self, msg, mech=None, ext=None):
        Exception.__init__(self, msg, mech)
        self.msg = msg
        self.mech = mech
        self.ext = ext
    def __str__(self):
        if self.mech:
            return '%s: %s'%(self.msg, self.mech)
        return self.msg

def check2(i, s, h, local=None, receiver=None, timeout=MAX_PER_LOOKUP_TIME, verbose=False, querytime=0):
    """Test an incoming MAIL FROM:<s>, from a client with ip address i.
    h is the HELO/EHLO domain name.  This is the RFC4408 compliant pySPF2.0
    interface.  The interface returns an SPF result and explanation only.
    SMTP response codes are not returned since RFC 4408 does not specify
    receiver policy.  Applications updated for RFC 4408 should use this
    interface.  The maximum time, in seconds, this function is allowed to run
    before a TempError is returned is controlled by querytime.  When set to 0
    (default) the timeout parameter (default 30 seconds) controls the time
    allowed for each DNS lookup.

    Returns (result, explanation) where result in
    ['pass', 'permerror', 'fail', 'temperror', 'softfail', 'none', 'neutral' ].

    Example:
    #>>> check2(i='61.51.192.42', s='liukebing@bcc.com', h='bmsi.com')

    """
    res,_,exp = query(i=i, s=s, h=h, local=local,
        receiver=receiver,timeout=timeout,verbose=verbose,querytime=querytime).check()
    return res,exp

def check(i, s, h, local=None, receiver=None, verbose=False):
    """Test an incoming MAIL FROM:<s>, from a client with ip address i.
    h is the HELO/EHLO domain name.  This is the pre-RFC SPF Classic interface.
    Applications written for pySPF 1.6/1.7 can use this interface to allow
    pySPF2 to be a drop in replacement for older versions.  With the exception
    of result codes, performance in RFC 4408 compliant.

    Returns (result, code, explanation) where result in
    ['pass', 'unknown', 'fail', 'error', 'softfail', 'none', 'neutral' ].

    Example:
    #>>> check(i='61.51.192.42', s='liukebing@bcc.com', h='bmsi.com')

    """
    res,code,exp = query(i=i, s=s, h=h, local=local, receiver=receiver,
        verbose=verbose).check()
    if res == 'permerror':
        res = 'unknown'
    elif res == 'tempfail':
        res =='error'
    return res, code, exp

class query(object):
    """A query object keeps the relevant information about a single SPF
    query:

    i: ip address of SMTP client in dotted notation
    s: sender declared in MAIL FROM:<>
    l: local part of sender s
    d: current domain, initially domain part of sender s
    h: EHLO/HELO domain
    v: 'in-addr' for IPv4 clients and 'ip6' for IPv6 clients
    t: current timestamp
    p: SMTP client domain name
    o: domain part of sender s
    r: receiver
    c: pretty ip address (different from i for IPv6)

    This is also, by design, the same variables used in SPF macro
    expansion.

    Also keeps cache: DNS cache.
    """
    def __init__(self, i, s, h, local=None, receiver=None, strict=True,
                timeout=MAX_PER_LOOKUP_TIME,verbose=False,querytime=0):
        self.s, self.h = s, h
        if not s and h:
            self.s = 'postmaster@' + h
            self.ident = 'helo'
        else:
            self.ident = 'mailfrom'
        self.l, self.o = split_email(s, h)
        self.t = str(int(time.time()))
        self.d = self.o
        self.p = None   # lazy evaluation
        if receiver:
            self.r = receiver
        else:
            self.r = 'unknown'
        # Since the cache does not track Time To Live, it is created
        # fresh for each query.  It is important for efficiently using
        # multiple results provided in DNS answers.
        self.cache = {}
        self.defexps = dict(EXPLANATIONS)
        self.exps = dict(EXPLANATIONS)
        self.libspf_local = local    # local policy
        self.lookups = 0
        # strict can be False, True, or 2 (numeric) for harsh
        self.strict = strict
        self.timeout = timeout
        self.querytime = querytime # Default to not using a global check
                                   # timelimit since this is an RFC 4408 MAY
        if querytime > 0:
            self.timeout = querytime
        self.timer = 0
        if i:
            self.set_ip(i)
        # Document bits of the object model not set up here:
        # self.i = string, expanded dot notation, suitable for PTR lookups
        # self.c = string, human readable form of the connect IP address
        # single letter lowercase variable names (e.g. self.i) are used for SPF macros
        # For IPv4, self.i = self.c, but not in IPv6
        # self.iplist = list of IPv4/6 addresses that would pass, collected
        #               when list or list6 is passed as 'i'
        # self.addr = ipaddr/ipaddress object representing the connect IP
        self.default_modifier = True
        self.verbose = verbose
        self.authserv = None # Only used in A-R header generation tests

    def log(self,mech,d,spf):
        print('%s: %s "%s"'%(mech,d,spf))

    def set_ip(self, i):
        "Set connect ip, and ip6 or ip4 mode."
        self.iplist = False
        if i.lower() == 'list':
            self.iplist = []
            ip6 = False
        elif i.lower() == 'list6':
            self.iplist = []
            ip6 = True
        else:
            try:
                self.ipaddr = ipaddress.ip_address(i)
            except AttributeError:
                self.ipaddr = ipaddress.IPAddress(i)
            if self.ipaddr.version == 6:
                if self.ipaddr.ipv4_mapped:
                    self.ipaddr = ipaddress.IPv4Address(self.ipaddr.ipv4_mapped)
                    ip6 = False
                else:
                    ip6 = True
            else:
                ip6 = False
            self.c = str(self.ipaddr)
        # NOTE: self.A is not lowercase, so isn't a macro.  See query.expand()
        if ip6:
            self.A = 'AAAA'
            self.v = 'ip6'
            self.i = '.'.join(list(self.ipaddr.exploded.replace(':','').upper()))
            self.cidrmax = 128
        else:
            self.A = 'A'
            self.v = 'in-addr'
            self.i = self.ipaddr.exploded
            self.cidrmax = 32

    def set_default_explanation(self, exp):
        exps = self.exps
        defexps = self.defexps
        for i in 'softfail', 'fail', 'permerror':
            exps[i] = exp
            defexps[i] = exp

    def set_explanation(self, exp):
        exps = self.exps
        for i in 'softfail', 'fail', 'permerror':
            exps[i] = exp

    # Compute p macro only if needed
    def getp(self):
        if not self.p:
            p = self.validated_ptrs()
            if not p:
                self.p = "unknown"
            elif self.d in p:
                self.p = self.d
            else:
                sfx = '.' + self.d
                for d in p:
                    if d.endswith(sfx):
                        self.p = d
                        break
                else:
                    self.p = p[0]
        return self.p

    def best_guess(self, spf=DEFAULT_SPF):
        """Return a best guess based on a default SPF record.
    >>> q = query('1.2.3.4','','SUPERVISION1',receiver='example.com')
    >>> q.best_guess()[0]
    'none'
        """
        if RE_TOPLAB.split(self.d)[-1]:
            return ('none', 250, '')
        return self.check(spf)

    def check(self, spf=None):
        """
    Returns (result, mta-status-code, explanation) where result
    in ['fail', 'softfail', 'neutral' 'permerror', 'pass', 'temperror', 'none']

    Examples:
    >>> q = query(s='strong-bad@email.example.com',
    ...           h='mx.example.org', i='192.0.2.3')
    >>> q.check(spf='v=spf1 ?all')
    ('neutral', 250, 'access neither permitted nor denied')

    >>> q.check(spf='v=spf1 redirect=controlledmail.com exp=_exp.controlledmail.com')
    ('fail', 550, 'SPF fail - not authorized')

    >>> q.check(spf='v=spf1 ip4:192.0.0.0/8 ?all moo')
    ('permerror', 550, 'SPF Permanent Error: Unknown mechanism found: moo')

    >>> q.check(spf='v=spf1 =a ?all moo')
    ('permerror', 550, 'SPF Permanent Error: Unknown qualifier, RFC 4408 para 4.6.1, found in: =a')

    >>> q.check(spf='v=spf1 ip4:192.0.0.0/8 ~all')
    ('pass', 250, 'sender SPF authorized')

    >>> q.check(spf='v=spf1 ip4:192.0.0.0/8 -all moo=')
    ('pass', 250, 'sender SPF authorized')

    >>> q.check(spf='v=spf1 ip4:192.0.0.0/8 -all match.sub-domains_9=yes')
    ('pass', 250, 'sender SPF authorized')

    >>> q.strict = False
    >>> q.check(spf='v=spf1 ip4:192.0.0.0/8 -all moo')
    ('permerror', 550, 'SPF Permanent Error: Unknown mechanism found: moo')
    >>> q.perm_error.ext
    ('pass', 250, 'sender SPF authorized')

    >>> q.strict = True
    >>> q.check(spf='v=spf1 ip4:192.1.0.0/16 moo -all')
    ('permerror', 550, 'SPF Permanent Error: Unknown mechanism found: moo')

    >>> q.check(spf='v=spf1 ip4:192.1.0.0/16 ~all')
    ('softfail', 250, 'domain owner discourages use of this host')

    >>> q.check(spf='v=spf1 -ip4:192.1.0.0/6 ~all')
    ('fail', 550, 'SPF fail - not authorized')

    # Assumes DNS available
    >>> q.check()
    ('none', 250, '')

    >>> q.check(spf='v=spf1 ip4:1.2.3.4 -a:example.net -all')
    ('fail', 550, 'SPF fail - not authorized')
    >>> q.libspf_local='ip4:192.0.2.3 a:example.org'
    >>> q.check(spf='v=spf1 ip4:1.2.3.4 -a:example.net -all')
    ('pass', 250, 'sender SPF authorized')

    >>> q.check(spf='v=spf1 ip4:1.2.3.4 -all exp=_exp.controlledmail.com')
    ('fail', 550, 'Controlledmail.com does not send mail from itself.')

    >>> q.check(spf='v=spf1 ip4:1.2.3.4 ?all exp=_exp.controlledmail.com')
    ('neutral', 250, 'access neither permitted nor denied')
        """
        self.mech = []        # unknown mechanisms
        # If not strict, certain PermErrors (misspelled
        # mechanisms, strict processing limits exceeded)
        # will continue processing.  However, the exception
        # that strict processing would raise is saved here
        self.perm_error = None
        self.mechanism = None
        self.options = {}

        try:
            self.lookups = 0
            self.timer = 0
            if not spf:
                spf = self.dns_spf(self.d)
                if self.verbose: self.log("top",self.d,spf)
            if self.libspf_local and spf:
                spf = insert_libspf_local_policy(
                    spf, self.libspf_local)
            rc = self.check1(spf, self.d, 0)
            if self.perm_error:
                # lax processing encountered a permerror, but continued
                self.perm_error.ext = rc
                raise self.perm_error
            return rc

        except TempError as x:
            self.prob = x.msg
            if x.mech:
                self.mech.append(x.mech)
            return ('temperror', 451, 'SPF Temporary Error: ' + str(x))
        except PermError as x:
            if not self.perm_error:
                self.perm_error = x
            self.prob = x.msg
            if x.mech:
                self.mech.append(x.mech)
            # Pre-Lentczner draft treats this as an unknown result
            # and equivalent to no SPF record.
            return ('permerror', 550, 'SPF Permanent Error: ' + str(x))

    def check1(self, spf, domain, recursion):
        # spf rfc: 3.7 Processing Limits
        #
        if recursion > MAX_RECURSION:
            # This should never happen in strict mode
            # because of the other limits we check,
            # so if it does, there is something wrong with
            # our code.  It is not a PermError because there is not
            # necessarily anything wrong with the SPF record.
            if self.strict:
                raise AssertionError('Too many levels of recursion')
            # As an extended result, however, it should be
            # a PermError.
            raise PermError('Too many levels of recursion')
        try:
            try:
                tmp, self.d = self.d, domain
                return self.check0(spf, recursion)
            finally:
                self.d = tmp
        except AmbiguityWarning as x:
            self.prob = x.msg
            if x.mech:
                self.mech.append(x.mech)
            return ('ambiguous', 000, 'SPF Ambiguity Warning: %s' % x)

    def note_error(self, *msg):
        if self.strict:
            raise PermError(*msg)
        # if lax mode, note error and continue
        if not self.perm_error:
            try:
                raise PermError(*msg)
            except PermError as x:
                # FIXME: keep a list of errors for even friendlier diagnostics.
                self.perm_error = x
        return self.perm_error

    def expand_domain(self,arg):
        "validate and expand domain-spec"
        # any trailing dot was removed by expand()
        if RE_TOPLAB.split(arg)[-1]:
            raise PermError('Invalid domain found (use FQDN)', arg)
        return self.expand(arg)

    def validate_mechanism(self, mech):
        """Parse and validate a mechanism.
    Returns mech,m,arg,cidrlength,result

    Examples:
    >>> q = query(s='strong-bad@email.example.com.',
    ...           h='mx.example.org', i='192.0.2.3')
    >>> q.validate_mechanism('A')
    ('A', 'a', 'email.example.com', 32, 'pass')

    >>> q = query(s='strong-bad@email.example.com',
    ...           h='mx.example.org', i='192.0.2.3')
    >>> q.validate_mechanism('A//64')
    ('A//64', 'a', 'email.example.com', 32, 'pass')

    >>> q.validate_mechanism('A/24//64')
    ('A/24//64', 'a', 'email.example.com', 24, 'pass')

    >>> q.validate_mechanism('?mx:%{d}/27')
    ('?mx:%{d}/27', 'mx', 'email.example.com', 27, 'neutral')

    >>> try: q.validate_mechanism('ip4:1.2.3.4/247')
    ... except PermError as x: print(x)
    Invalid IP4 CIDR length: ip4:1.2.3.4/247

    >>> try: q.validate_mechanism('ip4:1.2.3.4/33')
    ... except PermError as x: print(x)
    Invalid IP4 CIDR length: ip4:1.2.3.4/33

    >>> try: q.validate_mechanism('a:example.com:8080')
    ... except PermError as x: print(x)
    Invalid domain found (use FQDN): example.com:8080

    >>> try: q.validate_mechanism('ip4:1.2.3.444/24')
    ... except PermError as x: print(x)
    Invalid IP4 address: ip4:1.2.3.444/24

    >>> try: q.validate_mechanism('ip4:1.2.03.4/24')
    ... except PermError as x: print(x)
    Invalid IP4 address: ip4:1.2.03.4/24

    >>> try: q.validate_mechanism('-all:3030')
    ... except PermError as x: print(x)
    Invalid all mechanism format - only qualifier allowed with all: -all:3030

    >>> q.validate_mechanism('-mx:%%%_/.Clara.de/27')
    ('-mx:%%%_/.Clara.de/27', 'mx', '% /.Clara.de', 27, 'fail')

    >>> q.validate_mechanism('~exists:%{i}.%{s1}.100/86400.rate.%{d}')
    ('~exists:%{i}.%{s1}.100/86400.rate.%{d}', 'exists', '192.0.2.3.com.100/86400.rate.email.example.com', 32, 'softfail')

    >>> q.validate_mechanism('a:mail.example.com.')
    ('a:mail.example.com.', 'a', 'mail.example.com', 32, 'pass')

    >>> try: q.validate_mechanism('a:mail.example.com,')
    ... except PermError as x: print(x)
    Do not separate mechanisms with commas: a:mail.example.com,

    >>> q = query(s='strong-bad@email.example.com',
    ...           h='mx.example.org', i='2001:db8:1234::face:b007')
    >>> q.validate_mechanism('A//64')
    ('A//64', 'a', 'email.example.com', 64, 'pass')

    >>> q.validate_mechanism('A/16')
    ('A/16', 'a', 'email.example.com', 128, 'pass')

    >>> q.validate_mechanism('A/16//48')
    ('A/16//48', 'a', 'email.example.com', 48, 'pass')

    """
        if mech.endswith( "," ):
            self.note_error('Do not separate mechanisms with commas', mech)
            mech = mech[:-1]
        # a mechanism
        m, arg, cidrlength, cidr6length = parse_mechanism(mech, self.d)
        # map '?' '+' or '-' to 'neutral' 'pass' or 'fail'
        if m:
            result = RESULTS.get(m[0])
            if result:
                # eat '?' '+' or '-'
                m = m[1:]
            else:
                # default pass
                result = 'pass'
        if m in COMMON_MISTAKES:
            self.note_error('Unknown mechanism found', mech)
            m = COMMON_MISTAKES[m]

        if m == 'a' and RE_IP4.match(arg):
            x = self.note_error(
              'Use the ip4 mechanism for ip4 addresses', mech)
            m = 'ip4'


        # validate cidr and dual-cidr
        if m in ('a', 'mx'):
            if cidrlength is None:
                cidrlength = 32;
            elif cidrlength > 32:
                raise PermError('Invalid IP4 CIDR length', mech)
            if cidr6length is None:
                cidr6length = 128
            elif cidr6length > 128:
                raise PermError('Invalid IP6 CIDR length', mech)
            if self.v == 'ip6':
                cidrlength = cidr6length
        elif m == 'ip4' or RE_IP4.match(m):
            if m != 'ip4':
              self.note_error( 'Missing IP4' , mech)
              m,arg = 'ip4',m
            if cidr6length is not None:
                raise PermError('Dual CIDR not allowed', mech)
            if cidrlength is None:
                cidrlength = 32;
            elif cidrlength > 32:
                raise PermError('Invalid IP4 CIDR length', mech)
            if not RE_IP4.match(arg):
                raise PermError('Invalid IP4 address', mech)
        elif m == 'ip6':
            if cidr6length is not None:
                raise PermError('Dual CIDR not allowed', mech)
            if cidrlength is None:
                cidrlength = 128
            elif cidrlength > 128:
                raise PermError('Invalid IP6 CIDR length', mech)
            if not RE_IP6.match(arg):
                raise PermError('Invalid IP6 address', mech)
        else:
            if cidrlength is not None or cidr6length is not None:
              if m in ALL_MECHANISMS:
                raise PermError('CIDR not allowed', mech)
            cidrlength = self.cidrmax

        if m in ('a', 'mx', 'ptr', 'exists', 'include'):
            if m == 'exists' and not arg:
                raise PermError('implicit exists not allowed', mech)
            arg = self.expand_domain(arg)
            if not arg:
                raise PermError('empty domain:',mech)
            if m == 'include':
                if arg == self.d:
                    if mech != 'include':
                        raise PermError('include has trivial recursion', mech)
                    raise PermError('include mechanism missing domain', mech)
            return mech, m, arg, cidrlength, result

        # validate 'all' mechanism per RFC 4408 ABNF
        if m == 'all' and mech.count(':'):
            # print '|'+ arg + '|', mech, self.d,
            self.note_error(
            'Invalid all mechanism format - only qualifier allowed with all'
              , mech)
        if m in ALL_MECHANISMS:
            return mech, m, arg, cidrlength, result
        if m[1:] in ALL_MECHANISMS:
            x = self.note_error(
                'Unknown qualifier, RFC 4408 para 4.6.1, found in', mech)
        else:
            x = self.note_error('Unknown mechanism found', mech)
        return mech, m, arg, cidrlength, x

    def check0(self, spf, recursion):
        """Test this query information against SPF text.

        Returns (result, mta-status-code, explanation) where
        result in ['fail', 'unknown', 'pass', 'none']
        """

        if not spf:
            return ('none', 250, EXPLANATIONS['none'])

        # split string by whitespace, drop the 'v=spf1'
        spf = spf.split()
        # Catch case where SPF record has no spaces.
        # Can never happen with conforming dns_spf(), however
        # in the future we might want to give warnings
        # for common mistakes like IN TXT "v=spf1" "mx" "-all"
        # in relaxed mode.
        if spf[0].lower() != 'v=spf1':
            if self.strict > 1:
                raise AmbiguityWarning('Invalid SPF record in', self.d)
            return ('none', 250, EXPLANATIONS['none'])
        spf = spf[1:]

        # copy of explanations to be modified by exp=
        exps = self.exps
        redirect = None

        # no mechanisms at all cause unknown result, unless
        # overridden with 'default=' modifier
        #
        default = 'neutral'
        mechs = []

        modifiers = []
        # Look for modifiers
        #
        for mech in spf:
            m = RE_MODIFIER.split(mech)[1:]
            if len(m) != 2:
                mechs.append(self.validate_mechanism(mech))
                continue

            mod,arg = m
            if mod in modifiers:
                if mod == 'redirect':
                    raise PermError('redirect= MUST appear at most once',mech)
                self.note_error('%s= MUST appear at most once'%mod,mech)
                # just use last one in lax mode
            modifiers.append(mod)
            if mod == 'exp':
                # always fetch explanation to check permerrors
                if not arg:
                    raise PermError('exp has empty domain-spec:',arg)
                arg = self.expand_domain(arg)
                if arg:
                    try:
                        exp = self.get_explanation(arg)
                        if exp and not recursion:
                            # only set explanation in base recursion level
                            self.set_explanation(exp)
                    except: pass
            elif mod == 'redirect':
                self.check_lookups()
                redirect = self.expand_domain(arg)
                if not redirect:
                    raise PermError('redirect has empty domain:',arg)
            elif mod == 'default':
                # default modifier is obsolete
                if self.strict > 1:
                    raise AmbiguityWarning('The default= modifier is obsolete.')
                if not self.strict and self.default_modifier:
                    # might be an old policy, so do it anyway
                    arg = self.expand(arg)
                    # default=- is the same as default=fail
                    default = RESULTS.get(arg, default)
            elif mod == 'op':
                if not recursion:
                    for v in arg.split('.'):
                        if v: self.options[v] = True
            else:
                # spf rfc: 3.6 Unrecognized Mechanisms and Modifiers
                self.expand(m[1])       # syntax error on invalid macro

        # Evaluate mechanisms
        #
        for mech, m, arg, cidrlength, result in mechs:

            if m == 'include':
                self.check_lookups()
                d = self.dns_spf(arg)
                if self.verbose: self.log("include",arg,d)
                res, code, txt = self.check1(d,arg, recursion + 1)
                if res == 'pass':
                    break
                if res == 'none':
                    self.note_error(
                        'No valid SPF record for included domain: %s' %arg,
                      mech)
                res = 'neutral'
                continue
            elif m == 'all':
                break

            elif m == 'exists':
                self.check_lookups()
                try:
                    if len(self.dns_a(arg,'A')) > 0:
                        break
                except AmbiguityWarning:
                    # Exists wants no response sometimes so don't raise
                    # the warning.
                    pass

            elif m == 'a':
                self.check_lookups()
                if self.cidrmatch(self.dns_a(arg,self.A), cidrlength):
                    break

            elif m == 'mx':
                self.check_lookups()
                if self.cidrmatch(self.dns_mx(arg), cidrlength):
                    break

            elif m == 'ip4':
                if self.v == 'in-addr': # match own connection type only
                    try:
                        if self.cidrmatch([arg], cidrlength): break
                    except socket.error:
                        raise PermError('syntax error', mech)

            elif m == 'ip6':
                if self.v == 'ip6': # match own connection type only
                    try:
                        if self.cidrmatch([arg], cidrlength): break
                    except socket.error:
                        raise PermError('syntax error', mech)

            elif m == 'ptr':
                self.check_lookups()
                if domainmatch(self.validated_ptrs(), arg):
                    break

        else:
            # no matches
            if redirect:
                #Catch redirect to a non-existent SPF record.
                redirect_record = self.dns_spf(redirect)
                if not redirect_record:
                    raise PermError('redirect domain has no SPF record',
                        redirect)
                if self.verbose: self.log("redirect",redirect,redirect_record)
                # forget modifiers on redirect
                if not recursion:
                  self.exps = dict(self.defexps)
                  self.options = {}
                return self.check1(redirect_record, redirect, recursion)
            result = default
            mech = None

        if not recursion:       # record matching mechanism at base level
            self.mechanism = mech
        if result == 'fail':
            return (result, 550, exps[result])
        else:
            return (result, 250, exps[result])

    def check_lookups(self):
        self.lookups = self.lookups + 1
        if self.lookups > MAX_LOOKUP*4:
            raise PermError('More than %d DNS lookups'%(MAX_LOOKUP*4))
        if self.lookups > MAX_LOOKUP:
            self.note_error('Too many DNS lookups')

    def get_explanation(self, spec):
        """Expand an explanation."""
        if spec:
            try:
                a = self.dns_txt(spec)
                if len(a) == 1:
                    return str(self.expand(to_ascii(a[0]), stripdot=False))
            except PermError:
                # RFC4408 6.2/4 syntax errors cause exp= to be ignored
                if self.strict > 1:
                    raise	# but report in harsh mode for record checking tools
                pass
        elif self.strict > 1:
            raise PermError('Empty domain-spec on exp=')
        # RFC4408 6.2/4 empty domain spec is ignored
        # (unless you give precedence to the grammar).
        return None

    def expand(self, str, stripdot=True): # macros='slodipvh'
        """Do SPF RFC macro expansion.

        Examples:
        >>> q = query(s='strong-bad@email.example.com',
        ...           h='mx.example.org', i='192.0.2.3')
        >>> q.p = 'mx.example.org'
        >>> q.r = 'example.net'

        >>> q.expand('%{d}')
        'email.example.com'

        >>> q.expand('%{d4}')
        'email.example.com'

        >>> q.expand('%{d3}')
        'email.example.com'

        >>> q.expand('%{d2}')
        'example.com'

        >>> q.expand('%{d1}')
        'com'

        >>> q.expand('%{p}')
        'mx.example.org'

        >>> q.expand('%{p2}')
        'example.org'

        >>> q.expand('%{dr}')
        'com.example.email'

        >>> q.expand('%{d2r}')
        'example.email'

        >>> q.expand('%{l}')
        'strong-bad'

        >>> q.expand('%{l-}')
        'strong.bad'

        >>> q.expand('%{lr}')
        'strong-bad'

        >>> q.expand('%{lr-}')
        'bad.strong'

        >>> q.expand('%{l1r-}')
        'strong'

        >>> q.expand('%{c}',stripdot=False)
        '192.0.2.3'

        >>> q.expand('%{r}',stripdot=False)
        'example.net'

        >>> q.expand('%{ir}.%{v}._spf.%{d2}')
        '3.2.0.192.in-addr._spf.example.com'

        >>> q.expand('%{lr-}.lp._spf.%{d2}')
        'bad.strong.lp._spf.example.com'

        >>> q.expand('%{lr-}.lp.%{ir}.%{v}._spf.%{d2}')
        'bad.strong.lp.3.2.0.192.in-addr._spf.example.com'

        >>> q.expand('%{ir}.%{v}.%{l1r-}.lp._spf.%{d2}')
        '3.2.0.192.in-addr.strong.lp._spf.example.com'

        >>> try: q.expand('%(ir).%{v}.%{l1r-}.lp._spf.%{d2}')
        ... except PermError as x: print(x)
        invalid-macro-char : %(ir)

        >>> q.expand('%{p2}.trusted-domains.example.net')
        'example.org.trusted-domains.example.net'

        >>> q.expand('%{p2}.trusted-domains.example.net.')
        'example.org.trusted-domains.example.net'

        >>> q = query(s='@email.example.com',
        ...           h='mx.example.org', i='192.0.2.3')
        >>> q.p = 'mx.example.org'
        >>> q.expand('%{l}')
        'postmaster'

        """
        macro_delimiters = ['{', '%', '-', '_']
        end = 0
        result = ''
        macro_count = str.count('%')
        if macro_count != 0:
            labels = str.split('.')
            for label in labels:
                is_macro = False
                if len(label) > 1:
                    if label[0] == '%':
                        for delimit in macro_delimiters:
                            if label[1] == delimit:
                                is_macro = True
                        if not is_macro:
                            raise PermError ('invalid-macro-char ', label)
                            break
        for i in RE_CHAR.finditer(str):
            result += str[end:i.start()]
            macro = str[i.start():i.end()]
            if macro == '%%':
                result += '%'
            elif macro == '%_':
                result += ' '
            elif macro == '%-':
                result += '%20'
            else:
                letter = macro[2].lower()
#                print letter
                if letter == 'p':
                    self.getp()
                elif letter in 'crt' and stripdot:
                    raise PermError(
                        'c,r,t macros allowed in exp= text only', macro)
                expansion = getattr(self, letter, self)
                if expansion:
                    if expansion == self:
                        raise PermError('Unknown Macro Encountered', macro)
                    e = expand_one(expansion, macro[3:-1], JOINERS.get(letter))
                    if letter != macro[2]:
                        e = urllibparse.quote(e)
                    result += e

            end = i.end()
        result += str[end:]
        if stripdot and result.endswith('.'):
            result =  result[:-1]
        if result.count('.') != 0:
            if len(result) > 253:
                result = result[(result.index('.')+1):]
        return result

    def dns_spf(self, domain):
        """Get the SPF record recorded in DNS for a specific domain
        name.  Returns None if not found, or if more than one record
        is found.
        """
        # Per RFC 4.3/1, check for malformed domain.  This produces
        # no results as a special case.
        for label in domain.split('.'):
          if not label or len(label) > 63:
            return None
        # for performance, check for most common case of TXT first
        a = [t for t in self.dns_txt(domain) if RE_SPF.match(t)]
        if len(a) > 1:
            raise PermError('Two or more type TXT spf records found.')
        if len(a) == 1 and self.strict < 2:
            return to_ascii(a[0])
        # check official SPF type first when it becomes more popular
        if self.strict > 1:
            #Only check for Type SPF in harsh mode until it is more popular.
            try:
                b = [t for t in self.dns_txt(domain,'SPF') if RE_SPF.match(t)]
            except TempError as x:
                # some braindead DNS servers hang on type 99 query
                if self.strict > 1: raise TempError(x)
                b = []
            if len(b) > 1:
                raise PermError('Two or more type SPF spf records found.')
            if len(b) == 1:
                if self.strict > 1 and len(a) == 1 and a[0] != b[0]:
                #Changed from permerror to warning based on RFC 4408 Auth 48 change
                    raise AmbiguityWarning(
'v=spf1 records of both type TXT and SPF (type 99) present, but not identical')
                return to_ascii(b[0])
        if len(a) == 1:
            return to_ascii(a[0])    # return TXT if SPF wasn't found
        if DELEGATE:    # use local record if neither found
            a = [t
              for t in self.dns_txt(domain+'._spf.'+DELEGATE)
            if RE_SPF.match(t)
            ]
            if len(a) == 1: return to_ascii(a[0])
        return None

    ## Get list of TXT records for a domain name.
    # Any DNS library *must* return bytes (same as str in python2) for TXT
    # or SPF since there is no general decoding to unicode.  Py3dns-3.0.2
    # incorrectly attempts to convert to str using idna encoding by default.
    # We work around this by assuming any UnicodeErrors coming from py3dns
    # are from a non-ascii SPF record (incorrect in general).  Packages
    # should require py3dns != 3.0.2.
    #
    # We cannot check for non-ascii here, because we must ignore non-SPF
    # records - even when they are non-ascii.  So we return bytes.
    # The caller does the ascii check for SPF records and explanations.
    #
    def dns_txt(self, domainname, rr='TXT'):
        "Get a list of TXT records for a domain name."
        if domainname:
          try:
              dns_list = self.dns(domainname, rr)
              if dns_list:
                  # a[0][:0] is '' for py3dns-3.0.2, otherwise b''
                  a = [a[0][:0].join(a) for a in dns_list]
                  # FIXME: workaround for error in py3dns-3.0.2
                  if isinstance(a[0],bytes):
                      return a
                  return [s.encode('utf-8') for s in a]
          # FIXME: workaround for error in py3dns-3.0.2
          except UnicodeError:
              raise PermError('Non-ascii characters found in %s record for %s'
                 %(rr,domainname))
        return []

    def dns_mx(self, domainname):
        """Get a list of IP addresses for all MX exchanges for a
        domain name.
        """
        # RFC 4408 section 5.4 "mx"
        # To prevent DoS attacks, more than 10 MX names MUST NOT be looked up
        mxnames = self.dns(domainname, 'MX')
        if self.strict:
            max = MAX_MX
            if self.strict > 1:
                if len(mxnames) > MAX_MX:
                    raise AmbiguityWarning(
                        'More than %d MX records returned'%MAX_MX)
                if len(mxnames) == 0:
                    raise AmbiguityWarning(
                        'No MX records found for mx mechanism', domainname)
        else:
            max = MAX_MX * 4
        mxnames.sort()
        return [a for mx in mxnames[:max] for a in self.dns_a(mx[1],self.A)]

    def dns_a(self, domainname, A='A'):
        """Get a list of IP addresses for a domainname.
        """
        if not domainname: return []
        if self.strict > 1:
            alist = self.dns(domainname, A)
            if len(alist) == 0:
                raise AmbiguityWarning(
                        'No %s records found for'%A, domainname)
            else:
                return alist
        r = self.dns(domainname, A)
        if A == 'AAAA' and bytes is str:
          # work around pydns inconsistency plus python2 bytes/str ambiguity
          return [ipaddress.Bytes(ip) for ip in r]
        return r

    def validated_ptrs(self):
        """Figure out the validated PTR domain names for the connect IP."""
# To prevent DoS attacks, more than 10 PTR names MUST NOT be looked up
        if self.strict:
            max = MAX_PTR
            if self.strict > 1:
                #Break out the number of PTR records returned for testing
                try:
                    ptrnames = self.dns_ptr(self.i)
                    if len(ptrnames) > max:
                        warning = 'More than %d PTR records returned' % max
                        raise AmbiguityWarning(warning, self.c)
                    else:
                        if len(ptrnames) == 0:
                            raise AmbiguityWarning(
                                'No PTR records found for ptr mechanism', self.c)
                except:
                    raise AmbiguityWarning(
                      'No PTR records found for ptr mechanism', self.c)
        else:
            max = MAX_PTR * 4
        cidrlength = self.cidrmax
        return [p for p in self.dns_ptr(self.i)[:max]
            if self.cidrmatch(self.dns_a(p,self.A),cidrlength)]

    def dns_ptr(self, i):
        """Get a list of domain names for an IP address."""
        return self.dns('%s.%s.arpa'%(reverse_dots(i),self.v), 'PTR')

    # We have to be careful which additional DNS RRs we cache.  For
    # instance, PTR records are controlled by the connecting IP, and they
    # could poison our local cache with bogus A and MX records.

    SAFE2CACHE = {
      ('MX','A'): None,
      ('MX','MX'): None,
      ('CNAME','A'): None,
      ('A','A'): None,
      ('AAAA','AAAA'): None,
      ('PTR','PTR'): None,
      ('TXT','TXT'): None,
      ('SPF','SPF'): None
    }

    # FIXME: move to dnsplug
    def dns(self, name, qtype, cnames=None):
        """DNS query.

        If the result is in cache, return that.  Otherwise pull the
        result from DNS, and cache ALL answers, so additional info
        is available for further queries later.

        CNAMEs are followed.

        If there is no data, [] is returned.

        pre: qtype in ['A', 'AAAA', 'MX', 'PTR', 'TXT', 'SPF']
        post: isinstance(__return__, types.ListType)
        """
        if name.endswith('.'): name = name[:-1]
        if not reduce(lambda x,y:x and 0 < len(y) < 64, name.split('.'),True):
            return []   # invalid DNS name (too long or empty)
        result = self.cache.get( (name, qtype), [])
        if result: return result
        cnamek = (name,'CNAME')
        cname = self.cache.get( cnamek )

        if cname:
            cname = cname[0]
        else:
            safe2cache = query.SAFE2CACHE
            if self.querytime < 0:
                 raise TempError('DNS Error: exceeded max query lookup time')
            if self.querytime < self.timeout and self.querytime > 0:
                timeout = self.querytime
            else:
                timeout = self.timeout
            timethen = time.time()
            for k, v in DNSLookup(name, qtype, self.strict, timeout):
                if k == cnamek:
                    cname = v
                if k[1] == 'CNAME' or (qtype,k[1]) in safe2cache:
                    self.cache.setdefault(k, []).append(v)
                    #if ans and qtype == k[1]:
                    #    self.cache.setdefault((name,qtype), []).append(v)
            result = self.cache.get( (name, qtype), [])
            if self.querytime > 0:
                self.querytime = self.querytime - (time.time()-timethen)
        if not result and cname:
            if not cnames:
                cnames = {}
            elif len(cnames) >= MAX_CNAME:
                #return result    # if too many == NX_DOMAIN
                raise PermError('Length of CNAME chain exceeds %d' % MAX_CNAME)
            cnames[name] = cname
            if cname in cnames:
                raise PermError('CNAME loop')
            result = self.dns(cname, qtype, cnames=cnames)
            if result:
                self.cache[(name,qtype)] = result
        return result

    def cidrmatch(self, ipaddrs, n):
        """Match connect IP against a CIDR network of other IP addresses.

        Examples:
        >>> c = query(s='strong-bad@email.example.com',
        ...           h='mx.example.org', i='192.0.2.3')
        >>> c.p = 'mx.example.org'
        >>> c.r = 'example.com'

        >>> c.cidrmatch(['192.0.2.3'],32)
        True
        >>> c.cidrmatch(['192.0.2.2'],32)
        False
        >>> c.cidrmatch(['192.0.2.2'],31)
        True

        >>> six = query(s='strong-bad@email.example.com',
        ...           h='mx.example.org', i='2001:0db8:0:0:0:0:0:0001')
        >>> six.p = 'mx.example.org'
        >>> six.r = 'example.com'

        >>> six.cidrmatch(['2001:0DB8::'],127)
        True
        >>> six.cidrmatch(['2001:0DB8::'],128)
        False
        >>> six.cidrmatch(['2001:0DB8:0:0:0:0:0:0001'],128)
        True
        """
        try:
            for netwrk in [ipaddress.ip_network(ip) for ip in ipaddrs]:
                network = netwrk.supernet(new_prefix=n)
                if isinstance(self.iplist, bool):
                    if network.__contains__(self.ipaddr):
                        return True
                else:
                    if n < self.cidrmax:
                        self.iplist.append(network)
                    else:
                        self.iplist.append(network.ip)
        except AttributeError:
            for netwrk in [ipaddress.IPNetwork(ip,strict=False) for ip in ipaddrs]:
                network = netwrk.supernet(new_prefix=n)
                if isinstance(self.iplist, bool):
                    if network.__contains__(self.ipaddr):
                        return True
                else:
                    if n < self.cidrmax:
                        self.iplist.append(network)
                    else:
                        self.iplist.append(network.ip)
        return False

    def parse_header_ar(self, val):
        """Set SPF values from RFC 5451 Authentication Results header.

        Useful when SPF has already been run on a trusted gateway machine.

        Expects the entire header as an input.

        Examples:
        >>> q = query('192.0.2.3','strong-bad@email.example.com','mx.example.org')
        >>> q.mechanism = 'unknown'
        >>> p = q.parse_header_ar('''Authentication-Results: bmsi.com; spf=neutral \\n     (abuse@kitterman.com: 192.0.2.3 is neither permitted nor denied by domain of email.example.com) \\n     smtp.mailfrom=email.example.com \\n    (sender=strong-bad@email.example.com; helo=mx.example.org; client-ip=192.0.2.3; receiver=abuse@kitterman.com; mechanism=?all)''')
        >>> q.get_header(q.result, header_type='authres', aid='bmsi.com')
        'Authentication-Results: bmsi.com; spf=neutral (unknown: 192.0.2.3 is neither permitted nor denied by domain of email.example.com) smtp.mailfrom=email.example.com (sender=email.example.com; helo=mx.example.org; client-ip=192.0.2.3; receiver=unknown; mechanism=unknown)'
        >>> p = q.parse_header_ar('''Authentication-Results: bmsi.com; spf=None (mail.bmsi.com: test; client-ip=163.247.46.150) smtp.mailfrom=admin@squiebras.cl (helo=mail.squiebras.cl; receiver=mail.bmsi.com;\\n mechanism=mx/24)''')
        >>> q.get_header(q.result, header_type='authres', aid='bmsi.com')
        'Authentication-Results: bmsi.com; spf=none (unknown: 192.0.2.3 is neither permitted nor denied by domain of email.example.com) smtp.mailfrom=admin@squiebras.cl (sender=admin@squiebras.cl; helo=mx.example.org; client-ip=192.0.2.3; receiver=unknown; mechanism=unknown)'
        """
        import authres
        # Authres expects unwrapped headers according to docs
        val = ' '.join(s.strip() for s in val.split('\n'))
        arobj = authres.AuthenticationResultsHeader.parse(val)
        # TODO extract and parse comments (not supported by authres)
        for resobj in arobj.results:
            if resobj.method == 'spf':
                self.authserv = arobj.authserv_id
                self.result = resobj.result
                if resobj.properties[0].name == 'mailfrom':
                    self.d = resobj.properties[0].value
                    self.s = resobj.properties[0].value
                if resobj.properties[0].name == 'helo':
                    self.h = resobj.properties[0].value
        return

    def parse_header_spf(self, val):
        """Set SPF values from Received-SPF header.

        Useful when SPF has already been run on a trusted gateway machine.

        Examples:
        >>> q = query('0.0.0.0','','')
        >>> p = q.parse_header_spf('''Pass (test) client-ip=70.98.79.77;
        ... envelope-from="evelyn@subjectsthum.com"; helo=mail.subjectsthum.com;
        ... receiver=mail.bmsi.com; mechanism=a; identity=mailfrom''')
        >>> q.get_header(q.result)
        'Pass (test) client-ip=70.98.79.77; envelope-from="evelyn@subjectsthum.com"; helo=mail.subjectsthum.com; receiver=mail.bmsi.com; mechanism=a; identity=mailfrom'
        >>> o = q.parse_header_spf('''None (mail.bmsi.com: test)
        ... client-ip=163.247.46.150; envelope-from="admin@squiebras.cl";
        ... helo=mail.squiebras.cl; receiver=mail.bmsi.com; mechanism=mx/24;
        ... x-bestguess=pass; x-helo-spf=neutral; identity=mailfrom''')
        >>> q.get_header(q.result,**o)
        'None (mail.bmsi.com: test) client-ip=163.247.46.150; envelope-from="admin@squiebras.cl"; helo=mail.squiebras.cl; receiver=mail.bmsi.com; mechanism=mx/24; x-bestguess=pass; x-helo-spf=neutral; identity=mailfrom'
        >>> o['bestguess']
        'pass'
        """
        a = val.split(None,1)
        self.result = a[0].lower()
        self.mechanism = None
        if len(a) < 2: return 'none'
        val = a[1]
        if val.startswith('('):
          pos = val.find(')')
          if pos < 0: return self.result
          self.comment = val[1:pos]
          val = val[pos+1:]
        msg = Message()
        msg.add_header('Received-SPF','; '+val)
        p = {}
        for k,v in msg.get_params(header='Received-SPF'):
          if k == 'client-ip':
            self.set_ip(v)
          elif k == 'envelope-from': self.s = v
          elif k == 'helo': self.h = v
          elif k == 'receiver': self.r = v
          elif k == 'problem': self.mech = v
          elif k == 'mechanism': self.mechanism = v
          elif k == 'identity': self.ident = v
          elif k.startswith('x-'): p[k[2:]] = v
        self.l, self.o = split_email(self.s, self.h)
        return p

    def parse_header(self, val):
        """Set SPF values from Received-SPF or RFC 5451 Authentication Results header.

        Useful when SPF has already been run on a trusted gateway machine. Auto
        detects the header type and parses it. Use parse_header_spf or parse_header_ar
        for each type if required.

        Examples:
        >>> q = query('0.0.0.0','','')
        >>> p = q.parse_header('''Pass (test) client-ip=70.98.79.77;
        ... envelope-from="evelyn@subjectsthum.com"; helo=mail.subjectsthum.com;
        ... receiver=mail.bmsi.com; mechanism=a; identity=mailfrom''')
        >>> q.get_header(q.result)
        'Pass (test) client-ip=70.98.79.77; envelope-from="evelyn@subjectsthum.com"; helo=mail.subjectsthum.com; receiver=mail.bmsi.com; mechanism=a; identity=mailfrom'
        >>> r = q.parse_header('''None (mail.bmsi.com: test)
        ... client-ip=163.247.46.150; envelope-from="admin@squiebras.cl";
        ... helo=mail.squiebras.cl; receiver=mail.bmsi.com; mechanism=mx/24;
        ... x-bestguess=pass; x-helo-spf=neutral; identity=mailfrom''')
        >>> q.get_header(q.result,**r)
        'None (mail.bmsi.com: test) client-ip=163.247.46.150; envelope-from="admin@squiebras.cl"; helo=mail.squiebras.cl; receiver=mail.bmsi.com; mechanism=mx/24; x-bestguess=pass; x-helo-spf=neutral; identity=mailfrom'
        >>> r['bestguess']
        'pass'
        >>> q = query('192.0.2.3','strong-bad@email.example.com','mx.example.org')
        >>> q.mechanism = 'unknown'
        >>> p = q.parse_header_ar('''Authentication-Results: bmsi.com; spf=neutral \\n     (abuse@kitterman.com: 192.0.2.3 is neither permitted nor denied by domain of email.example.com) \\n     smtp.mailfrom=email.example.com \\n     (sender=strong-bad@email.example.com; helo=mx.example.org; client-ip=192.0.2.3; receiver=abuse@kitterman.com; mechanism=?all)''')
        >>> q.get_header(q.result, header_type='authres', aid='bmsi.com')
        'Authentication-Results: bmsi.com; spf=neutral (unknown: 192.0.2.3 is neither permitted nor denied by domain of email.example.com) smtp.mailfrom=email.example.com (sender=email.example.com; helo=mx.example.org; client-ip=192.0.2.3; receiver=unknown; mechanism=unknown)'
        >>> p = q.parse_header_ar('''Authentication-Results: bmsi.com; spf=None (mail.bmsi.com: test; client-ip=163.247.46.150) smtp.mailfrom=admin@squiebras.cl (helo=mail.squiebras.cl; receiver=mail.bmsi.com; mechanism=mx/24)''')
        >>> q.get_header(q.result, header_type='authres', aid='bmsi.com')
        'Authentication-Results: bmsi.com; spf=none (unknown: 192.0.2.3 is neither permitted nor denied by domain of email.example.com) smtp.mailfrom=admin@squiebras.cl (sender=admin@squiebras.cl; helo=mx.example.org; client-ip=192.0.2.3; receiver=unknown; mechanism=unknown)'
        """

        if val.startswith('Authentication-Results:'):
            return(self.parse_header_ar(val))
        else:
            return(self.parse_header_spf(val))

    def get_header(self, res, receiver=None, header_type='spf', aid=None, **kv):
        """
        Generate Received-SPF or Authentication Results header based on the
         last lookup.

        >>> q = query(s='strong-bad@email.example.com', h='mx.example.org',
        ...           i='192.0.2.3')
        >>> q.r='abuse@kitterman.com'
        >>> q.check(spf='v=spf1 ?all')
        ('neutral', 250, 'access neither permitted nor denied')
        >>> q.get_header('neutral')
        'Neutral (abuse@kitterman.com: 192.0.2.3 is neither permitted nor denied by domain of email.example.com) client-ip=192.0.2.3; envelope-from="strong-bad@email.example.com"; helo=mx.example.org; receiver=abuse@kitterman.com; mechanism=?all; identity=mailfrom'

        >>> q.check(spf='v=spf1 redirect=controlledmail.com exp=_exp.controlledmail.com')
        ('fail', 550, 'SPF fail - not authorized')
        >>> q.get_header('fail')
        'Fail (abuse@kitterman.com: domain of email.example.com does not designate 192.0.2.3 as permitted sender) client-ip=192.0.2.3; envelope-from="strong-bad@email.example.com"; helo=mx.example.org; receiver=abuse@kitterman.com; mechanism=-all; identity=mailfrom'

        >>> q.check(spf='v=spf1 ip4:192.0.0.0/8 ?all moo')
        ('permerror', 550, 'SPF Permanent Error: Unknown mechanism found: moo')
        >>> q.get_header('permerror')
        'PermError (abuse@kitterman.com: permanent error in processing domain of email.example.com: Unknown mechanism found) client-ip=192.0.2.3; envelope-from="strong-bad@email.example.com"; helo=mx.example.org; receiver=abuse@kitterman.com; problem=moo; identity=mailfrom'

        >>> q.check(spf='v=spf1 ip4:192.0.0.0/8 ~all')
        ('pass', 250, 'sender SPF authorized')
        >>> q.get_header('pass')
        'Pass (abuse@kitterman.com: domain of email.example.com designates 192.0.2.3 as permitted sender) client-ip=192.0.2.3; envelope-from="strong-bad@email.example.com"; helo=mx.example.org; receiver=abuse@kitterman.com; mechanism="ip4:192.0.0.0/8"; identity=mailfrom'

        >>> q.check(spf='v=spf1 ?all')
        ('neutral', 250, 'access neither permitted nor denied')
        >>> q.get_header('neutral', header_type = 'authres', aid='bmsi.com')
        'Authentication-Results: bmsi.com; spf=neutral (abuse@kitterman.com: 192.0.2.3 is neither permitted nor denied by domain of email.example.com) smtp.mailfrom=email.example.com (sender=strong-bad@email.example.com; helo=mx.example.org; client-ip=192.0.2.3; receiver=abuse@kitterman.com; mechanism=?all)'

        >>> p = query(s='strong-bad@email.example.com', h='mx.example.org',
        ...           i='192.0.2.3')
        >>> p.r='abuse@kitterman.com'
        >>> p.check(spf='v=spf1 redirect=controlledmail.com exp=_exp.controlledmail.com')
        ('fail', 550, 'SPF fail - not authorized')
        >>> p.ident = 'helo'
        >>> p.get_header('fail', header_type = 'authres', aid='bmsi.com')
        'Authentication-Results: bmsi.com; spf=fail (abuse@kitterman.com: domain of email.example.com does not designate 192.0.2.3 as permitted sender) smtp.helo=mx.example.org (sender=strong-bad@email.example.com; client-ip=192.0.2.3; receiver=abuse@kitterman.com; mechanism=-all)'

        >>> q.check(spf='v=spf1 ?all')
        ('neutral', 250, 'access neither permitted nor denied')
        >>> try: q.get_header('neutral', header_type = 'dkim')
        ... except SyntaxError as x: print(x)
        Unknown results header type: dkim
        """
        # If type is Authentication Results header (spf/authres)
        if header_type == 'authres':
            if not aid:
                raise SyntaxError('authserv-id missing for Authentication Results header type, see RFC5451 2.3')
            import authres

        if not receiver:
            receiver = self.r
        client_ip = self.c
        helo = quote_value(self.h)
        resmap = { 'pass': 'Pass', 'neutral': 'Neutral', 'fail': 'Fail',
                'softfail': 'SoftFail', 'none': 'None',
                'temperror': 'TempError', 'permerror': 'PermError' }
        identity = self.ident
        if identity == 'helo':
            envelope_from = None
        else:
            envelope_from = quote_value(self.s)
        tag = resmap[res]
        if res == 'permerror' and self.mech:
            problem = quote_value(' '.join(self.mech))
        else:
            problem = None
        mechanism = quote_value(self.mechanism)
        if hasattr(self,'comment'):
          comment = self.comment
        else:
          comment = '%s: %s' % (receiver,self.get_header_comment(res))
        res = ['%s (%s)' % (tag,comment)]
        if header_type == 'spf':
            for k in ('client_ip','envelope_from','helo','receiver',
                'problem','mechanism'):
                v = locals()[k]
                if v: res.append('%s=%s;'%(k.replace('_','-'),v))
            for k,v in sorted(list(kv.items())):
                if v: res.append('x-%s=%s;'%(k.replace('_','-'),quote_value(v)))
            # do identity last so we can easily drop the trailing ';'
            res.append('%s=%s'%('identity',identity))
            return ' '.join(res)
        elif header_type == 'authres':
            if envelope_from:
                return str(authres.AuthenticationResultsHeader(authserv_id = aid, \
                    results = [authres.SPFAuthenticationResult(result = tag, \
                    result_comment = comment, smtp_mailfrom = self.d, \
                    smtp_mailfrom_comment = \
                    'sender={0}; helo={1}; client-ip={2}; receiver={3}; mechanism={4}'.format(self.s, \
                    self.h, self.c, self.r, mechanism))]))
            else:
                return str(authres.AuthenticationResultsHeader(authserv_id = aid, \
                    results = [authres.SPFAuthenticationResult(result = tag, \
                    result_comment = comment, smtp_helo = self.h, \
                    smtp_helo_comment = \
                    'sender={0}; client-ip={1}; receiver={2}; mechanism={3}'.format(self.s, \
                    self.c, self.r, mechanism))]))
        else:
            raise SyntaxError('Unknown results header type: {0}'.format(header_type))

    def get_header_comment(self, res):
        """Return comment for Received-SPF header.  """
        sender = self.o
        if res == 'pass':
            return \
                "domain of %s designates %s as permitted sender" \
                % (sender, self.c)
        elif res == 'softfail': return \
      "transitioning domain of %s does not designate %s as permitted sender" \
            % (sender, self.c)
        elif res == 'neutral': return \
            "%s is neither permitted nor denied by domain of %s" \
                % (self.c, sender)
        elif res == 'none': return \
            "%s is neither permitted nor denied by domain of %s" \
                  % (self.c, sender)
            #"%s does not designate permitted sender hosts" % sender
        elif res == 'permerror': return \
            "permanent error in processing domain of %s: %s" \
                  % (sender, self.prob)
        elif res == 'temperror': return \
              "temporary error in processing during lookup of %s" % sender
        elif res == 'fail': return \
              "domain of %s does not designate %s as permitted sender" \
              % (sender, self.c)
        raise ValueError("invalid SPF result for header comment: "+res)

def split_email(s, h):
    """Given a sender email s and a HELO domain h, create a valid tuple
    (l, d) local-part and domain-part.

    Examples:
    >>> split_email('', 'wayforward.net')
    ('postmaster', 'wayforward.net')

    >>> split_email('foo.com', 'wayforward.net')
    ('postmaster', 'foo.com')

    >>> split_email('terry@wayforward.net', 'optsw.com')
    ('terry', 'wayforward.net')
    """
    if not s:
        return 'postmaster', h
    else:
        parts = s.split('@', 1)
        if parts[0] == '':
            parts[0] = 'postmaster'
        if len(parts) == 2:
            return tuple(parts)
        else:
            return 'postmaster', s

def quote_value(s):
    """Quote the value for a key-value pair in Received-SPF header field
    if needed.  No quoting needed for a dot-atom value.

    Examples:
    >>> quote_value('foo@bar.com')
    '"foo@bar.com"'

    >>> quote_value('mail.example.com')
    'mail.example.com'

    >>> quote_value('A:1.2.3.4')
    '"A:1.2.3.4"'

    >>> quote_value('abc"def')
    '"abc\\\\"def"'

    >>> quote_value(r'abc\def')
    '"abc\\\\\\\\def"'

    >>> quote_value('abc..def')
    '"abc..def"'

    >>> quote_value('')
    '""'

    >>> quote_value(None)
    """
    if s is None or RE_DOT_ATOM.match(s):
      return s
    return '"' + s.replace('\\',r'\\').replace('"',r'\"'
                ).replace('\x00',r'\x00') + '"'

def parse_mechanism(str, d):
    """Breaks A, MX, IP4, and PTR mechanisms into a (name, domain,
    cidr,cidr6) tuple.  The domain portion defaults to d if not present,
    the cidr defaults to 32 if not present.

    Examples:
    >>> parse_mechanism('a', 'foo.com')
    ('a', 'foo.com', None, None)

    >>> parse_mechanism('exists','foo.com')
    ('exists', None, None, None)

    >>> parse_mechanism('a:bar.com', 'foo.com')
    ('a', 'bar.com', None, None)

    >>> parse_mechanism('a/24', 'foo.com')
    ('a', 'foo.com', 24, None)

    >>> parse_mechanism('A:foo:bar.com/16//48', 'foo.com')
    ('a', 'foo:bar.com', 16, 48)

    >>> parse_mechanism('-exists:%{i}.%{s1}.100/86400.rate.%{d}','foo.com')
    ('-exists', '%{i}.%{s1}.100/86400.rate.%{d}', None, None)

    >>> parse_mechanism('mx:%%%_/.Claranet.de/27','foo.com')
    ('mx', '%%%_/.Claranet.de', 27, None)

    >>> parse_mechanism('mx:%{d}//97','foo.com')
    ('mx', '%{d}', None, 97)

    >>> parse_mechanism('iP4:192.0.0.0/8','foo.com')
    ('ip4', '192.0.0.0', 8, None)
    """

    a = RE_DUAL_CIDR.split(str)
    if len(a) == 3:
        str, cidr6 = a[0], int(a[1])
    else:
        cidr6 = None
    a = RE_CIDR.split(str)
    if len(a) == 3:
        str, cidr = a[0], int(a[1])
    else:
        cidr = None

    a = str.split(':', 1)
    if len(a) < 2:
        str = str.lower()
        if str == 'exists': d = None
        return str, d, cidr, cidr6
    return a[0].lower(), a[1], cidr, cidr6

def reverse_dots(name):
    """Reverse dotted IP addresses or domain names.

    Example:
    >>> reverse_dots('192.168.0.145')
    '145.0.168.192'

    >>> reverse_dots('email.example.com')
    'com.example.email'
    """
    a = name.split('.')
    a.reverse()
    return '.'.join(a)

def domainmatch(ptrs, domainsuffix):
    """grep for a given domain suffix against a list of validated PTR
    domain names.

    Examples:
    >>> domainmatch(['FOO.COM'], 'foo.com')
    1

    >>> domainmatch(['moo.foo.com'], 'FOO.COM')
    1

    >>> domainmatch(['moo.bar.com'], 'foo.com')
    0

    """
    domainsuffix = domainsuffix.lower()
    for ptr in ptrs:
        ptr = ptr.lower()
        if ptr == domainsuffix or ptr.endswith('.' + domainsuffix):
            return True

    return False

def expand_one(expansion, str, joiner):
    if not str:
        return expansion
    ln, reverse, delimiters = RE_ARGS.split(str)[1:4]
    if not delimiters:
        delimiters = '.'
    expansion = split(expansion, delimiters, joiner)
    if reverse: expansion.reverse()
    if ln: expansion = expansion[-int(ln)*2+1:]
    return ''.join(expansion)

def split(str, delimiters, joiner=None):
    """Split a string into pieces by a set of delimiter characters.  The
    resulting list is delimited by joiner, or the original delimiter if
    joiner is not specified.

    Examples:
    >>> split('192.168.0.45', '.')
    ['192', '.', '168', '.', '0', '.', '45']

    >>> split('terry@wayforward.net', '@.')
    ['terry', '@', 'wayforward', '.', 'net']

    >>> split('terry@wayforward.net', '@.', '.')
    ['terry', '.', 'wayforward', '.', 'net']
    """
    result, element = [], ''
    for c in str:
        if c in delimiters:
            result.append(element)
            element = ''
            if joiner:
                result.append(joiner)
            else:
                result.append(c)
        else:
            element += c
    result.append(element)
    return result

def insert_libspf_local_policy(spftxt, local=None):
    """Returns spftxt with local inserted just before last non-fail
    mechanism.  This is how the libspf{2} libraries handle "local-policy".

    Examples:
    >>> insert_libspf_local_policy('v=spf1 -all')
    'v=spf1 -all'
    >>> insert_libspf_local_policy('v=spf1 -all','mx')
    'v=spf1 -all'
    >>> insert_libspf_local_policy('v=spf1','a mx ptr')
    'v=spf1 a mx ptr'
    >>> insert_libspf_local_policy('v=spf1 mx -all','a ptr')
    'v=spf1 mx a ptr -all'
    >>> insert_libspf_local_policy('v=spf1 mx -include:foo.co +all','a ptr')
    'v=spf1 mx a ptr -include:foo.co +all'

    # FIXME: is this right?  If so, "last non-fail" is a bogus description.
    >>> insert_libspf_local_policy('v=spf1 mx ?include:foo.co +all','a ptr')
    'v=spf1 mx a ptr ?include:foo.co +all'
    >>> spf='v=spf1 ip4:1.2.3.4 -a:example.net -all'
    >>> local='ip4:192.0.2.3 a:example.org'
    >>> insert_libspf_local_policy(spf,local)
    'v=spf1 ip4:1.2.3.4 ip4:192.0.2.3 a:example.org -a:example.net -all'
    """
    # look to find the all (if any) and then put local
    # just after last non-fail mechanism.  This is how
    # libspf2 handles "local policy", and some people
    # apparently find it useful (don't ask me why).
    if not local: return spftxt
    spf = spftxt.split()[1:]
    if spf:
        # local policy is SPF mechanisms/modifiers with no
        # 'v=spf1' at the start
        spf.reverse() #find the last non-fail mechanism
        for mech in spf:
        # map '?' '+' or '-' to 'neutral' 'pass'
        # or 'fail'
            if not RESULTS.get(mech[0]):
                # actually finds last mech with default result
                where = spf.index(mech)
                spf[where:where] = [local]
                spf.reverse()
                local = ' '.join(spf)
                break
        else:
            return spftxt # No local policy adds for v=spf1 -all
    # Processing limits not applied to local policy.  Suggest
    # inserting 'local' mechanism to handle this properly
    #MAX_LOOKUP = 100
    return 'v=spf1 '+local

if sys.version_info[0] == 2:
  def to_ascii(s):
      "Raise PermError if arg is not 7-bit ascii."
      try:
        return s.encode('ascii')
      except UnicodeError:
        raise PermError('Non-ascii characters found',repr(s))
else:
  def to_ascii(s):
      "Raise PermError if arg is not 7-bit ascii."
      try:
        return s.decode('ascii')
      except UnicodeError:
        raise PermError('Non-ascii characters found',repr(s))

def _test():
    import doctest, spf
    return doctest.testmod(spf)

DNS.DiscoverNameServers() # Fails on Mac OS X? Add domain to /etc/resolv.conf

if __name__ == '__main__':
    import getopt
    try:
       opts,argv = getopt.getopt(sys.argv[1:],"hv",["help","verbose"])
    except getopt.GetoptError as err:
       print(str(err))
       print(USAGE)
       sys.exit(2)
    verbose = False
    for o,a in opts:
        if o in ('-v','--verbose'):
           verbose = True
        elif o in ('-h','--help'):
           print(USAGE)
    if len(argv) == 0:
        print(USAGE)
        _test()
    elif len(argv) == 1:
        try:
            q = query(i='127.0.0.1', s='localhost', h='unknown',
                receiver=socket.gethostname())
            print(q.dns_spf(argv[0]))
        except TempError as x:
            print("Temporary DNS error: ", x)
        except PermError as x:
            print("PermError: ", x)
    elif len(argv) == 3:
        i, s, h = argv
        q = query(i=i, s=s, h=h,receiver=socket.gethostname(),verbose=verbose)
        print(q.check(),q.mechanism)
        if q.perm_error and q.perm_error.ext:
            print(q.perm_error.ext)
        if q.iplist:
            for ip in q.iplist:
                print(ip)
    elif len(argv) == 4:
        i, s, h = argv[1:]
        q = query(i=i, s=s, h=h, receiver=socket.gethostname(),
            strict=False, verbose=verbose)
        print(q.check(argv[0]),q.mechanism)
        if q.perm_error and q.perm_error.ext:
            print(q.perm_error.ext)
    else:
        print(USAGE)
