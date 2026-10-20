"""Transactional e-posta gönderimi (kayıt doğrulama kodu). Zoho Mail SMTP.

.env ayarları:
  VEILOX_SMTP_HOST   (vars. smtp.zoho.com)
  VEILOX_SMTP_PORT   (vars. 465 = SSL; 587 = STARTTLS)
  VEILOX_SMTP_USER   (ör. register@hepgo.com)
  VEILOX_SMTP_PASS   (Zoho uygulama parolası — 2FA açıksa app-specific password)
  VEILOX_MAIL_FROM   (vars. VEILOX_SMTP_USER)
  VEILOX_MAIL_FROM_NAME (vars. HEPGO)

USER ve PASS tanımlı değilse gönderim devre dışıdır (enabled()=False) ve kayıt doğrulaması atlanır.
"""
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from . import settings

settings.load()

HOST = os.environ.get('VEILOX_SMTP_HOST', 'smtp.zoho.com').strip() or 'smtp.zoho.com'
PORT = int(os.environ.get('VEILOX_SMTP_PORT', '465') or 465)
USER = os.environ.get('VEILOX_SMTP_USER', '').strip()
PASS = os.environ.get('VEILOX_SMTP_PASS', '')
FROM = os.environ.get('VEILOX_MAIL_FROM', '').strip() or USER or 'register@hepgo.com'
FROM_NAME = os.environ.get('VEILOX_MAIL_FROM_NAME', 'HEPGO').strip() or 'HEPGO'


def enabled():
    """SMTP yapılandırıldı mı? (kullanıcı adı + parola varsa)."""
    return bool(USER and PASS)


def send(to, subject, text, html=None):
    """Tek alıcıya e-posta gönderir. Yapılandırma yoksa RuntimeError('mail-disabled')."""
    if not enabled():
        raise RuntimeError('mail-disabled')
    msg = EmailMessage()
    msg['From'] = formataddr((FROM_NAME, FROM))
    msg['To'] = to
    msg['Subject'] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype='html')
    ctx = ssl.create_default_context()
    if PORT == 465:
        with smtplib.SMTP_SSL(HOST, PORT, context=ctx, timeout=25) as s:
            s.login(USER, PASS)
            s.send_message(msg)
    else:
        with smtplib.SMTP(HOST, PORT, timeout=25) as s:
            s.ehlo()
            s.starttls(context=ctx)
            s.login(USER, PASS)
            s.send_message(msg)


def send_code(to, code):
    """Kayıt e-posta doğrulama kodunu gönderir."""
    subject = f'HEPGO doğrulama kodunuz: {code}'
    text = (f'HEPGO firma kaydınız için e-posta doğrulama kodunuz: {code}\n\n'
            f'Bu kodu kayıt ekranına girin. Kod 10 dakika geçerlidir.\n'
            f'Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.\n\n— HEPGO')
    html = f"""<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;color:#0f1d3d">
      <h2 style="margin:0 0 8px">HEPGO e-posta doğrulama</h2>
      <p style="color:#555">Firma kaydınızı tamamlamak için aşağıdaki kodu kayıt ekranına girin:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f1f5fb;border-radius:12px;
                  padding:18px;text-align:center;margin:16px 0">{code}</div>
      <p style="color:#888;font-size:13px">Kod 10 dakika geçerlidir. Bu isteği siz yapmadıysanız yok sayın.</p>
      <p style="color:#aaa;font-size:12px">— HEPGO</p>
    </div>"""
    send(to, subject, text, html)
