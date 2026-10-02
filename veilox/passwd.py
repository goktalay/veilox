"""Veilox şifresini değiştirir: yeni şifre sorulur (ekrana yazılmaz), PBKDF2 özeti .env'e yazılır.
Kullanım: cd ~/veilox && python3 -m veilox.passwd   (sonra: systemctl --user restart veilox)
"""
import getpass
import hashlib
import hmac
import os
import secrets
from pathlib import Path

ITERATIONS = 240_000
ENV = Path(__file__).resolve().parent.parent / '.env'


def make_hash(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, ITERATIONS)
    return f'pbkdf2_sha256${ITERATIONS}${salt.hex()}${digest.hex()}'


def verify_password(password, stored):
    try:
        _, iterations, salt, digest = stored.split('$')
        calc = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(calc.hex(), digest)
    except (ValueError, AttributeError):
        return False


def main():
    pw = getpass.getpass('Yeni şifre: ')
    if len(pw) < 12 or getpass.getpass('Tekrar: ') != pw:
        raise SystemExit('Şifre en az 12 karakter olmalı ve iki giriş aynı olmalı')
    lines = [ln for ln in ENV.read_text(encoding='utf-8').splitlines() if not ln.startswith('VEILOX_PASSWORD_HASH=')]
    lines.append(f'VEILOX_PASSWORD_HASH={make_hash(pw)}')
    ENV.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    os.chmod(ENV, 0o600)
    print('Şifre güncellendi. Servisi yeniden başlatın: systemctl --user restart veilox')


if __name__ == '__main__':
    main()
