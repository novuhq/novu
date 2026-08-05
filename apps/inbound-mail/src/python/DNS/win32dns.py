"""
 $Id$

 Extract a list of TCP/IP name servers from the registry 0.1
    0.1 Strobl 2001-07-19
 Usage:
    RegistryResolve() returns a list of ip numbers (dotted quads), by
    scouring the registry for addresses of name servers

 Tested on Windows NT4 Server SP6a, Windows 2000 Pro SP2 and
 Whistler Pro (XP) Build 2462 and Windows ME
 ... all having a different registry layout wrt name servers :-/

 Todo:

   Program doesn't check whether an interface is up or down

 (c) 2001 Copyright by Wolfgang Strobl ws@mystrobl.de,
          License analog to the current Python license

 WARNING: Python3 port completely untested on Windows.
"""

import re
import winreg

def binipdisplay(s):
    "convert a binary array of ip adresses to a python list"
    if len(s)%4!= 0:
        raise EnvironmentError # well ...
    ol=[]
    for i in range(len(s)/4):
        s1=s[:4]
        s=s[4:]
        ip=[]
        for j in s1:
            ip.append(str(ord(j)))
        ol.append('.'.join(ip))
    return ol

def stringdisplay(s):
    '''convert "d.d.d.d,d.d.d.d" to ["d.d.d.d","d.d.d.d"].
       also handle u'd.d.d.d d.d.d.d', as reporting on SF 
    '''
    import re
    return list(map(str, re.split("[ ,]",s)))

def RegistryResolve():
    nameservers=[]
    x=winreg.ConnectRegistry(None,winreg.HKEY_LOCAL_MACHINE)
    try:
        y= winreg.OpenKey(x,
         r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters")
    except EnvironmentError: # so it isn't NT/2000/XP
        # windows ME, perhaps?
        try: # for Windows ME
            y= winreg.OpenKey(x,
                 r"SYSTEM\CurrentControlSet\Services\VxD\MSTCP")
            nameserver,dummytype=winreg.QueryValueEx(y,'NameServer')
            if nameserver and not (nameserver in nameservers):
                nameservers.extend(stringdisplay(nameserver))
        except EnvironmentError:
            pass
        return nameservers # no idea
    try:
        nameserver = winreg.QueryValueEx(y, "DhcpNameServer")[0].split()
    except:
        nameserver = winreg.QueryValueEx(y, "NameServer")[0].split()
    if nameserver:
        nameservers=nameserver
    nameserver = winreg.QueryValueEx(y,"NameServer")[0]
    winreg.CloseKey(y)
    try: # for win2000
        y= winreg.OpenKey(x,
         r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\DNSRegisteredAdapters")
        for i in range(1000):
            try:
                n=winreg.EnumKey(y,i)
                z=winreg.OpenKey(y,n)
                dnscount,dnscounttype=winreg.QueryValueEx(z,
                                            'DNSServerAddressCount')
                dnsvalues,dnsvaluestype=winreg.QueryValueEx(z,
                                            'DNSServerAddresses')
                nameservers.extend(binipdisplay(dnsvalues))
                winreg.CloseKey(z)
            except EnvironmentError:
                break
        winreg.CloseKey(y)
    except EnvironmentError:
        pass
#
    try: # for whistler
        y= winreg.OpenKey(x,
         r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces")
        for i in range(1000):
            try:
                n=winreg.EnumKey(y,i)
                z=winreg.OpenKey(y,n)
                try:
                    nameserver,dummytype=winreg.QueryValueEx(z,'NameServer')
                    if nameserver and not (nameserver in nameservers):
                        nameservers.extend(stringdisplay(nameserver))
                except EnvironmentError:
                    pass
                winreg.CloseKey(z)
            except EnvironmentError:
                break
        winreg.CloseKey(y)
    except EnvironmentError:
        #print "Key Interfaces not found, just do nothing"
        pass
#
    winreg.CloseKey(x)
    return nameservers

if __name__=="__main__":
    print("Name servers:",RegistryResolve())

