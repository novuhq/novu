#!/usr/bin/env python3
"""
Tests for the DKIM check: the key lookup's retry over TCP, and the
per-signature report that verifydkim.py prints.

Run: python3 -m pytest tests/test_verifydkim.py
 or: python3 tests/test_verifydkim.py
"""

import base64
import json
import os
import random
import subprocess
import sys
import unittest
from unittest import mock

PYTHON_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PYTHON_DIR)

import dkim  # noqa: E402
import dkim.dnsplug as dnsplug  # noqa: E402
import verifydkim  # noqa: E402


def _der(tag, body):
    length = len(body)
    if length < 0x80:
        encoded_length = bytes([length])
    else:
        size = (length.bit_length() + 7) // 8
        encoded_length = bytes([0x80 | size]) + length.to_bytes(size, 'big')
    return bytes([tag]) + encoded_length + body


def _der_int(value):
    # One spare byte keeps the leading bit clear, so the number stays positive.
    return _der(0x02, value.to_bytes(value.bit_length() // 8 + 1, 'big'))


def _is_probable_prime(n, rng, rounds=32):
    for small in (3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % small == 0:
            return n == small
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    for _ in range(rounds):
        x = pow(rng.randrange(2, n - 1), d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    return True


def _prime(rng, bits):
    while True:
        # The top two bits make the product of two such primes a full-size key.
        candidate = rng.getrandbits(bits) | (0b11 << (bits - 2)) | 1
        if _is_probable_prime(candidate, rng):
            return candidate


def _test_key():
    """Make a throwaway 1024-bit RSA key: (PEM private key, DKIM TXT record)."""
    rng = random.Random(9222)
    e = 65537
    while True:
        p, q = _prime(rng, 512), _prime(rng, 512)
        try:
            d = pow(e, -1, (p - 1) * (q - 1))
            break
        except ValueError:
            continue
    n = p * q
    private = _der(
        0x30,
        b''.join(_der_int(v) for v in (0, n, e, d, p, q, d % (p - 1), d % (q - 1), pow(q, -1, p))),
    )
    rsa_encryption = _der(0x30, _der(0x06, bytes.fromhex('2a864886f70d010101')) + _der(0x05, b''))
    public = _der(0x30, rsa_encryption + _der(0x03, b'\x00' + _der(0x30, _der_int(n) + _der_int(e))))
    pem = b'-----BEGIN RSA PRIVATE KEY-----\n' + base64.b64encode(private) + b'\n-----END RSA PRIVATE KEY-----\n'
    return pem, b'v=DKIM1; k=rsa; p=' + base64.b64encode(public)


PRIVATE_KEY, PUBLIC_RECORD = _test_key()

MESSAGE = (
    b'From: Ada <ada@example.com>\r\n'
    b'To: agent@agentinbox.md\r\n'
    b'Subject: Hello\r\n'
    b'Message-ID: <1@example.com>\r\n'
    b'\r\n'
    b'Hi there.\r\n'
)


def _sign(message, domain, selector=b'test'):
    return dkim.sign(message, selector, domain, PRIVATE_KEY, include_headers=[b'from', b'to', b'subject']) + message


def _dns(*domains):
    """A DNS lookup that knows the test key under the 'test' selector of each domain."""
    records = {b'test._domainkey.' + domain + b'.': PUBLIC_RECORD for domain in domains}
    return records.get


class VerifySignaturesTest(unittest.TestCase):
    def test_reports_a_valid_signature(self):
        report = verifydkim.verify_signatures(_sign(MESSAGE, b'example.com'), _dns(b'example.com'))

        self.assertEqual(report, {'signatures': [{'domain': 'example.com', 'selector': 'test', 'result': 'pass'}]})

    def test_checks_every_signature_not_only_the_top_one(self):
        # The top signature (an email service's, say) fails; the sender's own one below it still counts.
        message = _sign(_sign(MESSAGE, b'example.com'), b'esp.example.net')

        report = verifydkim.verify_signatures(message, _dns(b'example.com'))

        results = [(s['domain'], s['result']) for s in report['signatures']]
        self.assertEqual(results, [('esp.example.net', 'fail'), ('example.com', 'pass')])
        self.assertIn('missing public key', report['signatures'][0]['reason'])

    def test_says_why_a_signature_failed(self):
        message = _sign(MESSAGE, b'example.com').replace(b'Hi there.', b'Hi there!')

        [signature] = verifydkim.verify_signatures(message, _dns(b'example.com'))['signatures']

        self.assertEqual(signature['result'], 'fail')
        self.assertIn('body hash mismatch', signature['reason'])

    def test_a_dns_error_fails_only_its_own_signature(self):
        message = _sign(_sign(MESSAGE, b'example.com'), b'esp.example.net')
        known = _dns(b'example.com')

        def lookup(name):
            if b'esp.example.net' in name:
                raise OSError('DNS timed out')
            return known(name)

        report = verifydkim.verify_signatures(message, lookup)

        self.assertEqual([s['result'] for s in report['signatures']], ['fail', 'pass'])
        self.assertEqual(report['signatures'][0]['reason'], 'OSError: DNS timed out')

    def test_reports_nothing_for_a_message_without_signatures(self):
        self.assertEqual(verifydkim.verify_signatures(MESSAGE, _dns()), {'signatures': []})

    def test_checks_only_the_first_signatures(self):
        message = MESSAGE
        for _ in range(verifydkim.MAX_SIGNATURES + 2):
            message = _sign(message, b'example.com')

        report = verifydkim.verify_signatures(message, _dns(b'example.com'))

        self.assertEqual(len(report['signatures']), verifydkim.MAX_SIGNATURES)
        self.assertEqual(report['unchecked'], 2)

    def test_reports_a_message_it_cannot_read(self):
        report = verifydkim.verify_signatures(b'Not a header\r\n\r\nbody\r\n', _dns())

        self.assertEqual(report['signatures'], [])
        self.assertIn('Unexpected characters in RFC822 header', report['error'])


class ScriptTest(unittest.TestCase):
    def test_prints_the_report_and_exits_11_when_nothing_verifies(self):
        script = os.path.join(PYTHON_DIR, 'verifydkim.py')

        result = subprocess.run([sys.executable, script], input=MESSAGE, capture_output=True, check=False)

        self.assertEqual(result.returncode, 11)
        self.assertEqual(json.loads(result.stdout), {'signatures': []})


def _response(truncated, answers):
    return mock.Mock(header={'tc': truncated}, answers=answers)


class TxtLookupTest(unittest.TestCase):
    """get_txt_pydns is the lookup production uses (no dnspython in the image)."""

    def _lookup(self, replies):
        requests = []

        class FakeRequest:
            def __init__(self, name, **args):
                self.protocol = args.get('protocol', 'udp')
                requests.append((name, self.protocol))

            def req(self):
                return replies[self.protocol]

        with mock.patch.object(dnsplug, 'DNS', mock.Mock(DnsRequest=FakeRequest), create=True):
            return dnsplug.get_txt_pydns('s1._domainkey.example.com.'), requests

    def test_asks_again_over_tcp_when_the_udp_answer_is_truncated(self):
        key = [{'typename': 'TXT', 'data': [b'v=DKIM1; k=rsa; ', b'p=abc']}]

        txt, requests = self._lookup({'udp': _response(1, []), 'tcp': _response(0, key)})

        self.assertEqual(txt, b'v=DKIM1; k=rsa; p=abc')
        self.assertEqual(requests, [('s1._domainkey.example.com', 'udp'), ('s1._domainkey.example.com', 'tcp')])

    def test_keeps_the_udp_answer_when_it_fits(self):
        key = [{'typename': 'TXT', 'data': [b'v=DKIM1; p=abc']}]

        txt, requests = self._lookup({'udp': _response(0, key)})

        self.assertEqual(txt, b'v=DKIM1; p=abc')
        self.assertEqual(requests, [('s1._domainkey.example.com', 'udp')])


if __name__ == '__main__':
    unittest.main()
