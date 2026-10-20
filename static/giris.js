// HEPGO › Firma girişi: firmanın kendi paneline girişi (firma adresiyle; adresini hatırlamayan yönetici kayıt e-postası ve
// şifresiyle bulur, başvuru durumunu görür) ve yeni firma kaydı (paket → firma → yönetici hesabı → başvuru özeti).
// Merkez (yönetim) girişi burada YOKTUR; yalnızca veilox.app alan adındadır. CSP: satır içi stil yok.
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svg = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
const nf = new Intl.NumberFormat('tr-TR');
const LANGS = [['tr', 'Türkçe'], ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'], ['es', 'Español'], ['ar', 'العربية'], ['ru', 'Русский']];
const LANG_CODES = LANGS.map(l => l[0]); const RTL = new Set(['ar']);
let lang = (() => {   // kayıtlı dil → tarayıcı dili (bizim 7 dilden biriyse) → tr; landing ile paylaşılan 'veilox.lang'
  try {
    const s = localStorage.getItem('veilox.lang'); if (s && LANG_CODES.includes(s)) return s;
    for (const n of (navigator.languages || [navigator.language || ''])) { const c = (n || '').slice(0, 2).toLowerCase(); if (LANG_CODES.includes(c)) return c; }
  } catch { /* */ } return 'tr';
})();
let theme = (() => { try { return localStorage.getItem('veilox.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; } })();
let base = 'hepgo.com';

const T = {
  tr: {
    back: 'Tanıtım sayfası', title: 'Firma girişi', tabLogin: 'Panelime gir', tabReg: 'Yeni firma kaydı',
    sideH: 'Firmanızın tamamı tek panelde', sideP: 'Üretimden sahaya, finanstan insan kaynaklarına; ekibiniz kendi rolüyle girer, siz her şeyi tek yerden yönetirsiniz.',
    sideList: ['Firmanıza özel adres ve kullanıcılar', 'Destek ekibimize canlı destek ve ekran paylaşımı', 'Üyelik, ödeme ve sözleşmeleriniz panelinizde', 'Verileriniz yalnızca sizin — merkez göremez'],
    loginH: 'Firmanızın paneline girin', loginP: 'Firma adresinizi yazın; sizi firmanızın giriş ekranına yönlendirelim.',
    addr: 'Firma adresi', addrPh: 'firmaniz', go: 'Devam', recent: 'Son kullandığınız', forgot: 'Firma adresimi hatırlamıyorum',
    findH: 'Firmanızı bulun', findP: 'Firmayı kaydederken kullandığınız yönetici e-postası ve şifresiyle firmanızı ve başvuru durumunuzu görün.',
    email: 'Yönetici e-postası', pass: 'Şifre', find: 'Firmamı bul', toPanel: 'Panele git', noAcc: 'Henüz firmanız yok mu?', regNow: 'Ücretsiz başvurun',
    steps: ['Paket', 'Firma', 'Yönetici', 'Tamam'], pickPkg: 'Paketinizi seçin', pickPkgP: 'Açık beta döneminde tüm paketler ücretsiz; firmanız tüm modüllere erişir. Daha sonra değiştirebilirsiniz.', noPkg: 'Paket seçmeden devam et',
    perMonth: '/ay', free: 'Ücretsiz', beta: 'Açık beta', mods: n => `${n} modül`, cloud: 'Bulut', onprem: 'Kendi sunucunuz', both: 'Bulut / kendi sunucunuz',
    firmH: 'Firma bilgileri', cname: 'Firma adı', cnamePh: 'ör. Örnek Makine A.Ş.', yourAddr: 'Firma adresiniz', city: 'Şehir', tax: 'Vergi no (isteğe bağlı)', phone: 'Telefon',
    addrHint: 'Giriş adresiniz bu olur. Değiştirebilirsiniz; yalnız küçük harf, rakam ve tire.', addrCheck: 'Kontrol ediliyor…', addrOk: 'Uygun ✓',
    countryL: 'Ülke', logoL: 'Logo (isteğe bağlı)', logoHint: 'PNG, JPG, WEBP veya GIF · en fazla 2 MB', logoPick: 'Logo seç', logoChange: 'Logoyu değiştir', logoRemove: 'Kaldır',
    logoTooBig: 'Logo en fazla 2 MB olmalı.', logoBadType: 'PNG, JPG, WEBP veya GIF seçin.', addrNeeded: 'Lütfen uygun bir firma adresi girin.',
    adminH: 'Yönetici hesabı', adminP: 'Bu hesap firmanızın sahibi (master) olur; kullanıcıları ve yetkileri o yönetir.',
    full: 'Ad soyad', mail: 'E-posta', pw: 'Şifre (en az 10 karakter)', pw2: 'Şifre tekrar',
    sendCode: 'Doğrulama kodu gönder', codeSending: 'Gönderiliyor…', codeL: 'E-posta doğrulama kodu', codeHint: 'E-postanıza gönderilen 6 haneli kodu girin.',
    codeSent: e => `${e} adresine kod gönderildi.`, resend: 'Tekrar gönder', codeNeed: 'Lütfen e-posta doğrulama kodunu girin.', badEmail: 'Geçerli bir e-posta girin.',
    verifyH: 'E-postanızı doğrulayın', verifyP: e => `${e} adresine 6 haneli bir kod gönderdik. Aşağıya girin.`, verifyBtn: 'Doğrula',
    expiresIn: 'Kodun süresi', codeExpired: 'Kodun süresi doldu. Yeniden gönderin.', verifying: 'Doğrulanıyor…',
    emailVerified: 'E-posta doğrulandı', changeMail: 'E-postayı değiştir', closeM: 'Kapat', verifyFirst: 'Devam etmek için e-postanızı doğrulayın.',
    loginNow: 'Giriş yap', readyH: 'Firmanız hazır!', readyP: 'Hesabınız oluşturuldu ve firmanız kuruldu. Hemen giriş yapabilirsiniz.',
    accept: 'Başvurumun değerlendirilmesi ve benimle iletişime geçilmesi için bilgilerimin kaydedilmesini kabul ediyorum.',
    next: 'Devam', prev: 'Geri', submit: 'Başvuruyu tamamla', submitting: 'Gönderiliyor…', provisioning: 'Firmanız kuruluyor…',
    okH: 'Başvurunuz alındı', okP: 'Ekibimiz başvurunuzu inceleyip firmanızı kuracak. Kurulum tamamlanınca giriş adresiniz e-postanıza iletilecek.',
    appNo: 'Başvuru no', timeline: ['Başvuru alındı', 'İnceleme', 'Firma kurulumu', 'Giriş bilgileri e-postanıza'],
    pwWeak: 'Zayıf', pwOk: 'Orta', pwStrong: 'Güçlü', mismatch: 'Şifreler aynı değil', required: 'Bu alanı doldurun',
    pending: 'Başvuru inceleniyor', offline: 'Kendi sunucunuzda', unavailable: 'Kullanılamıyor', created: 'Başvuru',
  },
  en: {
    back: 'Home', title: 'Company sign-in', tabLogin: 'Sign in', tabReg: 'Register a company',
    sideH: 'Your whole company on one panel', sideP: 'From production to the field, finance to HR; your team signs in with their own role while you run everything from one place.',
    sideList: ['Your own address and users', 'Live support and screen sharing with our team', 'Membership, payments and contracts in your panel', 'Your data is yours — the console cannot see it'],
    loginH: 'Sign in to your company', loginP: 'Enter your company address and we will take you to its sign-in screen.',
    addr: 'Company address', addrPh: 'yourcompany', go: 'Continue', recent: 'Recently used', forgot: 'I don’t remember my company address',
    findH: 'Find your company', findP: 'Use the admin email and password you registered with to see your company and application status.',
    email: 'Admin email', pass: 'Password', find: 'Find my company', toPanel: 'Go to panel', noAcc: 'No company yet?', regNow: 'Apply for free',
    steps: ['Plan', 'Company', 'Admin', 'Done'], pickPkg: 'Choose your plan', pickPkgP: 'All plans are free during open beta; your company gets every module. You can change it later.', noPkg: 'Continue without a plan',
    perMonth: '/mo', free: 'Free', beta: 'Open beta', mods: n => `${n} modules`, cloud: 'Cloud', onprem: 'On-premise', both: 'Cloud / on-premise',
    firmH: 'Company details', cname: 'Company name', cnamePh: 'e.g. Acme Machinery Ltd.', yourAddr: 'Your company address', city: 'City', tax: 'Tax no (optional)', phone: 'Phone',
    addrHint: 'This becomes your sign-in address. You can change it; lowercase letters, digits and hyphens only.', addrCheck: 'Checking…', addrOk: 'Available ✓',
    countryL: 'Country', logoL: 'Logo (optional)', logoHint: 'PNG, JPG, WEBP or GIF · max 2 MB', logoPick: 'Choose logo', logoChange: 'Change logo', logoRemove: 'Remove',
    logoTooBig: 'Logo must be at most 2 MB.', logoBadType: 'Choose a PNG, JPG, WEBP or GIF.', addrNeeded: 'Please enter an available company address.',
    adminH: 'Admin account', adminP: 'This account becomes your company owner (master) and manages users and permissions.',
    full: 'Full name', mail: 'Email', pw: 'Password (min 10 characters)', pw2: 'Repeat password',
    sendCode: 'Send verification code', codeSending: 'Sending…', codeL: 'Email verification code', codeHint: 'Enter the 6-digit code sent to your email.',
    codeSent: e => `Code sent to ${e}.`, resend: 'Resend', codeNeed: 'Please enter the email verification code.', badEmail: 'Enter a valid email.',
    verifyH: 'Verify your email', verifyP: e => `We sent a 6-digit code to ${e}. Enter it below.`, verifyBtn: 'Verify',
    expiresIn: 'Code expires in', codeExpired: 'Code expired. Resend it.', verifying: 'Verifying…',
    emailVerified: 'Email verified', changeMail: 'Change email', closeM: 'Close', verifyFirst: 'Verify your email to continue.',
    loginNow: 'Sign in', readyH: 'Your company is ready!', readyP: 'Your account was created and your company is set up. You can sign in now.',
    accept: 'I agree that my details are stored to evaluate my application and to contact me.',
    next: 'Continue', prev: 'Back', submit: 'Complete application', submitting: 'Submitting…', provisioning: 'Setting up your company…',
    okH: 'Application received', okP: 'Our team will review your application and set up your company. Your sign-in address will be emailed when ready.',
    appNo: 'Application no', timeline: ['Application received', 'Review', 'Company setup', 'Credentials by email'],
    pwWeak: 'Weak', pwOk: 'Fair', pwStrong: 'Strong', mismatch: 'Passwords do not match', required: 'Please fill this in',
    pending: 'Under review', offline: 'On-premise', unavailable: 'Unavailable', created: 'Applied',
  },
  de: {
    back: 'Startseite', title: 'Firmen-Anmeldung', tabLogin: 'Anmelden', tabReg: 'Firma registrieren',
    sideH: 'Ihre ganze Firma auf einem Panel', sideP: 'Von der Produktion zum Außendienst, von Finanzen zu Personal; Ihr Team meldet sich mit seiner Rolle an, Sie steuern alles von einem Ort.',
    sideList: ['Eigene Adresse und Benutzer', 'Live-Support und Bildschirmfreigabe mit unserem Team', 'Mitgliedschaft, Zahlungen und Verträge in Ihrem Panel', 'Ihre Daten gehören Ihnen — die Zentrale sieht sie nicht'],
    loginH: 'Bei Ihrer Firma anmelden', loginP: 'Geben Sie Ihre Firmenadresse ein, wir leiten Sie zur Anmeldung weiter.',
    addr: 'Firmenadresse', addrPh: 'ihrefirma', go: 'Weiter', recent: 'Zuletzt verwendet', forgot: 'Ich kenne meine Firmenadresse nicht mehr',
    findH: 'Firma finden', findP: 'Mit der bei der Registrierung verwendeten Admin-E-Mail und Passwort sehen Sie Ihre Firma und den Antragsstatus.',
    email: 'Admin-E-Mail', pass: 'Passwort', find: 'Meine Firma finden', toPanel: 'Zum Panel', noAcc: 'Noch keine Firma?', regNow: 'Kostenlos bewerben',
    steps: ['Paket', 'Firma', 'Admin', 'Fertig'], pickPkg: 'Paket wählen', pickPkgP: 'Während der offenen Beta sind alle Pakete kostenlos; Ihre Firma erhält alle Module. Später änderbar.', noPkg: 'Ohne Paket fortfahren',
    perMonth: '/Mon.', free: 'Kostenlos', beta: 'Offene Beta', mods: n => `${n} Module`, cloud: 'Cloud', onprem: 'Eigener Server', both: 'Cloud / eigener Server',
    firmH: 'Firmendaten', cname: 'Firmenname', cnamePh: 'z. B. Beispiel Maschinen GmbH', yourAddr: 'Ihre Firmenadresse', city: 'Stadt', tax: 'Steuernr. (optional)', phone: 'Telefon',
    addrHint: 'Dies wird Ihre Anmeldeadresse. Änderbar; nur Kleinbuchstaben, Ziffern und Bindestriche.', addrCheck: 'Wird geprüft…', addrOk: 'Verfügbar ✓',
    countryL: 'Land', logoL: 'Logo (optional)', logoHint: 'PNG, JPG, WEBP oder GIF · max. 2 MB', logoPick: 'Logo wählen', logoChange: 'Logo ändern', logoRemove: 'Entfernen',
    logoTooBig: 'Logo darf höchstens 2 MB groß sein.', logoBadType: 'Wählen Sie PNG, JPG, WEBP oder GIF.', addrNeeded: 'Bitte geben Sie eine verfügbare Firmenadresse ein.',
    adminH: 'Admin-Konto', adminP: 'Dieses Konto wird Eigentümer (Master) Ihrer Firma und verwaltet Benutzer und Rechte.',
    full: 'Vor- und Nachname', mail: 'E-Mail', pw: 'Passwort (mind. 10 Zeichen)', pw2: 'Passwort wiederholen',
    sendCode: 'Bestätigungscode senden', codeSending: 'Wird gesendet…', codeL: 'E-Mail-Bestätigungscode', codeHint: 'Geben Sie den 6-stelligen Code aus Ihrer E-Mail ein.',
    codeSent: e => `Code an ${e} gesendet.`, resend: 'Erneut senden', codeNeed: 'Bitte geben Sie den Bestätigungscode ein.', badEmail: 'Geben Sie eine gültige E-Mail ein.',
    verifyH: 'E-Mail bestätigen', verifyP: e => `Wir haben einen 6-stelligen Code an ${e} gesendet. Bitte unten eingeben.`, verifyBtn: 'Bestätigen',
    expiresIn: 'Code läuft ab in', codeExpired: 'Code abgelaufen. Erneut senden.', verifying: 'Wird bestätigt…',
    emailVerified: 'E-Mail bestätigt', changeMail: 'E-Mail ändern', closeM: 'Schließen', verifyFirst: 'Bestätigen Sie Ihre E-Mail, um fortzufahren.',
    loginNow: 'Anmelden', readyH: 'Ihre Firma ist bereit!', readyP: 'Ihr Konto wurde erstellt und Ihre Firma eingerichtet. Sie können sich jetzt anmelden.',
    accept: 'Ich stimme zu, dass meine Daten gespeichert werden, um meinen Antrag zu prüfen und mich zu kontaktieren.',
    next: 'Weiter', prev: 'Zurück', submit: 'Antrag abschließen', submitting: 'Wird gesendet…', provisioning: 'Ihre Firma wird eingerichtet…',
    okH: 'Antrag erhalten', okP: 'Unser Team prüft Ihren Antrag und richtet Ihre Firma ein. Ihre Anmeldeadresse wird Ihnen per E-Mail mitgeteilt.',
    appNo: 'Antragsnr.', timeline: ['Antrag erhalten', 'Prüfung', 'Firmeneinrichtung', 'Zugangsdaten per E-Mail'],
    pwWeak: 'Schwach', pwOk: 'Mittel', pwStrong: 'Stark', mismatch: 'Passwörter stimmen nicht überein', required: 'Bitte ausfüllen',
    pending: 'In Prüfung', offline: 'Eigener Server', unavailable: 'Nicht verfügbar', created: 'Beworben',
  },
  fr: {
    back: 'Accueil', title: 'Connexion entreprise', tabLogin: 'Se connecter', tabReg: 'Enregistrer une entreprise',
    sideH: 'Toute votre entreprise sur un seul panneau', sideP: 'De la production au terrain, de la finance aux RH ; votre équipe se connecte avec son rôle, vous gérez tout depuis un seul endroit.',
    sideList: ['Votre propre adresse et vos utilisateurs', 'Support en direct et partage d’écran avec notre équipe', 'Abonnement, paiements et contrats dans votre panneau', 'Vos données vous appartiennent — la console ne les voit pas'],
    loginH: 'Connectez-vous à votre entreprise', loginP: 'Saisissez l’adresse de votre entreprise ; nous vous dirigeons vers son écran de connexion.',
    addr: 'Adresse de l’entreprise', addrPh: 'votreentreprise', go: 'Continuer', recent: 'Récemment utilisé', forgot: 'Je ne me souviens plus de mon adresse',
    findH: 'Trouvez votre entreprise', findP: 'Utilisez l’e-mail admin et le mot de passe d’inscription pour voir votre entreprise et l’état de la demande.',
    email: 'E-mail admin', pass: 'Mot de passe', find: 'Trouver mon entreprise', toPanel: 'Aller au panneau', noAcc: 'Pas encore d’entreprise ?', regNow: 'Postuler gratuitement',
    steps: ['Forfait', 'Entreprise', 'Admin', 'Terminé'], pickPkg: 'Choisissez votre forfait', pickPkgP: 'Tous les forfaits sont gratuits pendant la bêta ouverte ; votre entreprise a tous les modules. Modifiable plus tard.', noPkg: 'Continuer sans forfait',
    perMonth: '/mois', free: 'Gratuit', beta: 'Bêta ouverte', mods: n => `${n} modules`, cloud: 'Cloud', onprem: 'Sur site', both: 'Cloud / sur site',
    firmH: 'Détails de l’entreprise', cname: 'Nom de l’entreprise', cnamePh: 'ex. Exemple Machines SARL', yourAddr: 'Adresse de votre entreprise', city: 'Ville', tax: 'N° TVA (facultatif)', phone: 'Téléphone',
    addrHint: 'Ceci devient votre adresse de connexion. Modifiable ; minuscules, chiffres et tirets uniquement.', addrCheck: 'Vérification…', addrOk: 'Disponible ✓',
    countryL: 'Pays', logoL: 'Logo (facultatif)', logoHint: 'PNG, JPG, WEBP ou GIF · max 2 Mo', logoPick: 'Choisir un logo', logoChange: 'Changer le logo', logoRemove: 'Retirer',
    logoTooBig: 'Le logo doit faire au plus 2 Mo.', logoBadType: 'Choisissez un PNG, JPG, WEBP ou GIF.', addrNeeded: 'Veuillez saisir une adresse d’entreprise disponible.',
    adminH: 'Compte administrateur', adminP: 'Ce compte devient le propriétaire (master) de votre entreprise et gère les utilisateurs et les droits.',
    full: 'Nom complet', mail: 'E-mail', pw: 'Mot de passe (10 caractères min)', pw2: 'Confirmer le mot de passe',
    sendCode: 'Envoyer le code', codeSending: 'Envoi…', codeL: 'Code de vérification e-mail', codeHint: 'Saisissez le code à 6 chiffres envoyé à votre e-mail.',
    codeSent: e => `Code envoyé à ${e}.`, resend: 'Renvoyer', codeNeed: 'Veuillez saisir le code de vérification.', badEmail: 'Saisissez un e-mail valide.',
    verifyH: 'Vérifiez votre e-mail', verifyP: e => `Nous avons envoyé un code à 6 chiffres à ${e}. Saisissez-le ci-dessous.`, verifyBtn: 'Vérifier',
    expiresIn: 'Le code expire dans', codeExpired: 'Code expiré. Renvoyez-le.', verifying: 'Vérification…',
    emailVerified: 'E-mail vérifié', changeMail: 'Changer d’e-mail', closeM: 'Fermer', verifyFirst: 'Vérifiez votre e-mail pour continuer.',
    loginNow: 'Se connecter', readyH: 'Votre entreprise est prête !', readyP: 'Votre compte a été créé et votre entreprise est configurée. Vous pouvez vous connecter.',
    accept: 'J’accepte que mes données soient conservées pour évaluer ma demande et me contacter.',
    next: 'Continuer', prev: 'Retour', submit: 'Terminer la demande', submitting: 'Envoi…', provisioning: 'Configuration de votre entreprise…',
    okH: 'Demande reçue', okP: 'Notre équipe examinera votre demande et configurera votre entreprise. Votre adresse de connexion vous sera envoyée par e-mail.',
    appNo: 'N° de demande', timeline: ['Demande reçue', 'Examen', 'Configuration', 'Identifiants par e-mail'],
    pwWeak: 'Faible', pwOk: 'Moyen', pwStrong: 'Fort', mismatch: 'Les mots de passe ne correspondent pas', required: 'Veuillez remplir ce champ',
    pending: 'En cours d’examen', offline: 'Sur site', unavailable: 'Indisponible', created: 'Demande',
  },
  es: {
    back: 'Inicio', title: 'Acceso de empresa', tabLogin: 'Acceder', tabReg: 'Registrar empresa',
    sideH: 'Toda su empresa en un solo panel', sideP: 'De la producción al campo, de las finanzas a RR. HH.; su equipo entra con su rol y usted lo gestiona todo desde un solo lugar.',
    sideList: ['Su propia dirección y usuarios', 'Soporte en vivo y compartir pantalla con nuestro equipo', 'Suscripción, pagos y contratos en su panel', 'Sus datos son suyos — la consola no los ve'],
    loginH: 'Acceda a su empresa', loginP: 'Escriba la dirección de su empresa y le llevamos a su pantalla de acceso.',
    addr: 'Dirección de la empresa', addrPh: 'suempresa', go: 'Continuar', recent: 'Usado recientemente', forgot: 'No recuerdo la dirección de mi empresa',
    findH: 'Encuentre su empresa', findP: 'Use el correo de administrador y la contraseña de registro para ver su empresa y el estado de la solicitud.',
    email: 'Correo de administrador', pass: 'Contraseña', find: 'Encontrar mi empresa', toPanel: 'Ir al panel', noAcc: '¿Aún sin empresa?', regNow: 'Solicitar gratis',
    steps: ['Plan', 'Empresa', 'Admin', 'Listo'], pickPkg: 'Elija su plan', pickPkgP: 'Todos los planes son gratis durante la beta abierta; su empresa accede a todos los módulos. Puede cambiarlo luego.', noPkg: 'Continuar sin plan',
    perMonth: '/mes', free: 'Gratis', beta: 'Beta abierta', mods: n => `${n} módulos`, cloud: 'Nube', onprem: 'En sus servidores', both: 'Nube / en sus servidores',
    firmH: 'Datos de la empresa', cname: 'Nombre de la empresa', cnamePh: 'ej. Ejemplo Maquinaria S.L.', yourAddr: 'Dirección de su empresa', city: 'Ciudad', tax: 'NIF (opcional)', phone: 'Teléfono',
    addrHint: 'Esta será su dirección de acceso. Puede cambiarla; solo minúsculas, dígitos y guiones.', addrCheck: 'Comprobando…', addrOk: 'Disponible ✓',
    countryL: 'País', logoL: 'Logo (opcional)', logoHint: 'PNG, JPG, WEBP o GIF · máx. 2 MB', logoPick: 'Elegir logo', logoChange: 'Cambiar logo', logoRemove: 'Quitar',
    logoTooBig: 'El logo debe ser como máximo 2 MB.', logoBadType: 'Elija un PNG, JPG, WEBP o GIF.', addrNeeded: 'Introduzca una dirección de empresa disponible.',
    adminH: 'Cuenta de administrador', adminP: 'Esta cuenta será la propietaria (master) de su empresa y gestiona usuarios y permisos.',
    full: 'Nombre completo', mail: 'Correo', pw: 'Contraseña (mín. 10 caracteres)', pw2: 'Repetir contraseña',
    sendCode: 'Enviar código', codeSending: 'Enviando…', codeL: 'Código de verificación', codeHint: 'Introduzca el código de 6 dígitos enviado a su correo.',
    codeSent: e => `Código enviado a ${e}.`, resend: 'Reenviar', codeNeed: 'Introduzca el código de verificación.', badEmail: 'Introduzca un correo válido.',
    verifyH: 'Verifique su correo', verifyP: e => `Enviamos un código de 6 dígitos a ${e}. Introdúzcalo abajo.`, verifyBtn: 'Verificar',
    expiresIn: 'El código caduca en', codeExpired: 'Código caducado. Reenvíelo.', verifying: 'Verificando…',
    emailVerified: 'Correo verificado', changeMail: 'Cambiar correo', closeM: 'Cerrar', verifyFirst: 'Verifique su correo para continuar.',
    loginNow: 'Acceder', readyH: '¡Su empresa está lista!', readyP: 'Su cuenta se creó y su empresa está configurada. Ya puede acceder.',
    accept: 'Acepto que mis datos se almacenen para evaluar mi solicitud y contactarme.',
    next: 'Continuar', prev: 'Atrás', submit: 'Completar solicitud', submitting: 'Enviando…', provisioning: 'Configurando su empresa…',
    okH: 'Solicitud recibida', okP: 'Nuestro equipo revisará su solicitud y configurará su empresa. Su dirección de acceso se enviará por correo.',
    appNo: 'N.º de solicitud', timeline: ['Solicitud recibida', 'Revisión', 'Configuración', 'Credenciales por correo'],
    pwWeak: 'Débil', pwOk: 'Media', pwStrong: 'Fuerte', mismatch: 'Las contraseñas no coinciden', required: 'Rellene este campo',
    pending: 'En revisión', offline: 'En sus servidores', unavailable: 'No disponible', created: 'Solicitado',
  },
  ar: {
    back: 'الصفحة الرئيسية', title: 'دخول الشركة', tabLogin: 'تسجيل الدخول', tabReg: 'تسجيل شركة',
    sideH: 'شركتك كلها في لوحة واحدة', sideP: 'من الإنتاج إلى الميدان، ومن المالية إلى الموارد البشرية؛ يدخل فريقك بدوره، وتدير أنت كل شيء من مكان واحد.',
    sideList: ['عنوان ومستخدمون خاصون بك', 'دعم مباشر ومشاركة شاشة مع فريقنا', 'العضوية والمدفوعات والعقود في لوحتك', 'بياناتك ملك لك — المركز لا يراها'],
    loginH: 'ادخل إلى لوحة شركتك', loginP: 'اكتب عنوان شركتك وسننقلك إلى شاشة الدخول الخاصة بها.',
    addr: 'عنوان الشركة', addrPh: 'sharikatuka', go: 'متابعة', recent: 'المُستخدَم مؤخراً', forgot: 'لا أتذكر عنوان شركتي',
    findH: 'اعثر على شركتك', findP: 'استخدم بريد المدير وكلمة المرور اللذين سجّلت بهما لرؤية شركتك وحالة الطلب.',
    email: 'بريد المدير', pass: 'كلمة المرور', find: 'ابحث عن شركتي', toPanel: 'إلى اللوحة', noAcc: 'لا شركة بعد؟', regNow: 'قدِّم مجاناً',
    steps: ['الباقة', 'الشركة', 'المدير', 'تم'], pickPkg: 'اختر باقتك', pickPkgP: 'جميع الباقات مجانية خلال الإصدار التجريبي المفتوح؛ تحصل شركتك على كل الوحدات. يمكنك التغيير لاحقاً.', noPkg: 'المتابعة دون باقة',
    perMonth: '/شهر', free: 'مجاني', beta: 'نسخة تجريبية', mods: n => `${n} وحدة`, cloud: 'سحابة', onprem: 'خادمك الخاص', both: 'سحابة / خادمك الخاص',
    firmH: 'بيانات الشركة', cname: 'اسم الشركة', cnamePh: 'مثال: شركة نموذج للماكينات', yourAddr: 'عنوان شركتك', city: 'المدينة', tax: 'الرقم الضريبي (اختياري)', phone: 'الهاتف',
    addrHint: 'سيصبح هذا عنوان دخولك. يمكن تغييره؛ أحرف صغيرة وأرقام وشرطات فقط.', addrCheck: 'جارٍ التحقق…', addrOk: 'متاح ✓',
    countryL: 'الدولة', logoL: 'الشعار (اختياري)', logoHint: 'PNG أو JPG أو WEBP أو GIF · بحد أقصى 2 ميغابايت', logoPick: 'اختر شعاراً', logoChange: 'تغيير الشعار', logoRemove: 'إزالة',
    logoTooBig: 'يجب ألا يتجاوز الشعار 2 ميغابايت.', logoBadType: 'اختر PNG أو JPG أو WEBP أو GIF.', addrNeeded: 'يرجى إدخال عنوان شركة متاح.',
    adminH: 'حساب المدير', adminP: 'يصبح هذا الحساب مالك شركتك (master) ويدير المستخدمين والصلاحيات.',
    full: 'الاسم الكامل', mail: 'البريد الإلكتروني', pw: 'كلمة المرور (10 أحرف على الأقل)', pw2: 'تأكيد كلمة المرور',
    sendCode: 'إرسال رمز التحقق', codeSending: 'جارٍ الإرسال…', codeL: 'رمز تحقق البريد', codeHint: 'أدخل الرمز المكوّن من 6 أرقام المُرسَل إلى بريدك.',
    codeSent: e => `أُرسل الرمز إلى ${e}.`, resend: 'إعادة الإرسال', codeNeed: 'يرجى إدخال رمز التحقق.', badEmail: 'أدخل بريداً صحيحاً.',
    verifyH: 'تحقق من بريدك', verifyP: e => `أرسلنا رمزاً من 6 أرقام إلى ${e}. أدخله في الأسفل.`, verifyBtn: 'تحقّق',
    expiresIn: 'تنتهي صلاحية الرمز خلال', codeExpired: 'انتهت صلاحية الرمز. أعد الإرسال.', verifying: 'جارٍ التحقق…',
    emailVerified: 'تم التحقق من البريد', changeMail: 'تغيير البريد', closeM: 'إغلاق', verifyFirst: 'تحقق من بريدك للمتابعة.',
    loginNow: 'تسجيل الدخول', readyH: 'شركتك جاهزة!', readyP: 'تم إنشاء حسابك وتجهيز شركتك. يمكنك تسجيل الدخول الآن.',
    accept: 'أوافق على حفظ بياناتي لتقييم طلبي والتواصل معي.',
    next: 'متابعة', prev: 'رجوع', submit: 'إتمام الطلب', submitting: 'جارٍ الإرسال…', provisioning: 'جارٍ تجهيز شركتك…',
    okH: 'تم استلام طلبك', okP: 'سيراجع فريقنا طلبك ويجهّز شركتك. سيُرسل عنوان الدخول إلى بريدك عند الانتهاء.',
    appNo: 'رقم الطلب', timeline: ['استُلم الطلب', 'المراجعة', 'تجهيز الشركة', 'بيانات الدخول عبر البريد'],
    pwWeak: 'ضعيفة', pwOk: 'متوسطة', pwStrong: 'قوية', mismatch: 'كلمتا المرور غير متطابقتين', required: 'يرجى ملء هذا الحقل',
    pending: 'قيد المراجعة', offline: 'خادمك الخاص', unavailable: 'غير متاح', created: 'تم التقديم',
  },
  ru: {
    back: 'На главную', title: 'Вход компании', tabLogin: 'Войти', tabReg: 'Регистрация компании',
    sideH: 'Вся компания на одной панели', sideP: 'От производства до объекта, от финансов до кадров; команда входит под своей ролью, а вы управляете всем из одного места.',
    sideList: ['Собственный адрес и пользователи', 'Живая поддержка и демонстрация экрана с нашей командой', 'Подписка, платежи и договоры в вашей панели', 'Ваши данные — ваши; центр их не видит'],
    loginH: 'Войдите в свою компанию', loginP: 'Введите адрес компании — мы перенаправим вас на её экран входа.',
    addr: 'Адрес компании', addrPh: 'vashakompaniya', go: 'Продолжить', recent: 'Недавние', forgot: 'Не помню адрес своей компании',
    findH: 'Найдите свою компанию', findP: 'Используйте e-mail администратора и пароль регистрации, чтобы увидеть компанию и статус заявки.',
    email: 'E-mail администратора', pass: 'Пароль', find: 'Найти мою компанию', toPanel: 'В панель', noAcc: 'Ещё нет компании?', regNow: 'Подать бесплатно',
    steps: ['Пакет', 'Компания', 'Админ', 'Готово'], pickPkg: 'Выберите пакет', pickPkgP: 'В период открытой бета-версии все пакеты бесплатны; компания получает все модули. Можно изменить позже.', noPkg: 'Продолжить без пакета',
    perMonth: '/мес', free: 'Бесплатно', beta: 'Открытая бета', mods: n => `${n} модулей`, cloud: 'Облако', onprem: 'Ваш сервер', both: 'Облако / ваш сервер',
    firmH: 'Данные компании', cname: 'Название компании', cnamePh: 'напр. Пример Машинери ООО', yourAddr: 'Адрес вашей компании', city: 'Город', tax: 'ИНН (необязательно)', phone: 'Телефон',
    addrHint: 'Это станет вашим адресом входа. Можно изменить; только строчные буквы, цифры и дефисы.', addrCheck: 'Проверка…', addrOk: 'Доступно ✓',
    countryL: 'Страна', logoL: 'Логотип (необязательно)', logoHint: 'PNG, JPG, WEBP или GIF · до 2 МБ', logoPick: 'Выбрать логотип', logoChange: 'Сменить логотип', logoRemove: 'Убрать',
    logoTooBig: 'Логотип должен быть не более 2 МБ.', logoBadType: 'Выберите PNG, JPG, WEBP или GIF.', addrNeeded: 'Введите доступный адрес компании.',
    adminH: 'Учётная запись администратора', adminP: 'Эта запись становится владельцем (master) компании и управляет пользователями и правами.',
    full: 'Полное имя', mail: 'E-mail', pw: 'Пароль (не менее 10 символов)', pw2: 'Повторите пароль',
    sendCode: 'Отправить код', codeSending: 'Отправка…', codeL: 'Код подтверждения e-mail', codeHint: 'Введите 6-значный код, отправленный на вашу почту.',
    codeSent: e => `Код отправлен на ${e}.`, resend: 'Отправить снова', codeNeed: 'Введите код подтверждения.', badEmail: 'Введите корректный e-mail.',
    verifyH: 'Подтвердите e-mail', verifyP: e => `Мы отправили 6-значный код на ${e}. Введите его ниже.`, verifyBtn: 'Подтвердить',
    expiresIn: 'Код истекает через', codeExpired: 'Срок кода истёк. Отправьте снова.', verifying: 'Проверка…',
    emailVerified: 'E-mail подтверждён', changeMail: 'Сменить e-mail', closeM: 'Закрыть', verifyFirst: 'Подтвердите e-mail, чтобы продолжить.',
    loginNow: 'Войти', readyH: 'Ваша компания готова!', readyP: 'Учётная запись создана, компания настроена. Можете войти сейчас.',
    accept: 'Я согласен на хранение моих данных для рассмотрения заявки и связи со мной.',
    next: 'Продолжить', prev: 'Назад', submit: 'Завершить заявку', submitting: 'Отправка…', provisioning: 'Настройка вашей компании…',
    okH: 'Заявка получена', okP: 'Наша команда рассмотрит заявку и настроит компанию. Адрес входа будет отправлен на e-mail.',
    appNo: '№ заявки', timeline: ['Заявка получена', 'Рассмотрение', 'Настройка компании', 'Доступы по e-mail'],
    pwWeak: 'Слабый', pwOk: 'Средний', pwStrong: 'Сильный', mismatch: 'Пароли не совпадают', required: 'Заполните это поле',
    pending: 'На рассмотрении', offline: 'Ваш сервер', unavailable: 'Недоступно', created: 'Заявка',
  },
};
const t = () => T[lang] || T.en;   // eksik çeviri güvenli şekilde İngilizce'ye düşer
// Yasal sayfa bağlantı metinleri (kayıt onayı altında; sayfalar veilox'ta /gizlilik + /kullanim-sartlari, 7 dilli)
const LEGAL_L = {
  tr: ['Gizlilik Politikası', 'Kullanım Şartları', 'Beta Programı Sözleşmesi'], en: ['Privacy Policy', 'Terms of Use', 'Beta Program Agreement'],
  de: ['Datenschutzerklärung', 'Nutzungsbedingungen', 'Beta-Programm-Vereinbarung'], fr: ['Politique de confidentialité', 'Conditions d’utilisation', 'Accord du programme bêta'],
  es: ['Política de privacidad', 'Condiciones de uso', 'Acuerdo del programa beta'], ar: ['سياسة الخصوصية', 'شروط الاستخدام', 'اتفاقية برنامج بيتا'],
  ru: ['Политика конфиденциальности', 'Условия использования', 'Соглашение о бета-программе'],
};
const legalL = () => LEGAL_L[lang] || LEGAL_L.en;
// Firma tipi + modül seçimi metinleri (7 dil; eksikse İngilizce'ye düşer)
const REG2 = {
  tr: { firmType: 'Firma tipiniz', kobiT: 'KOBİ ve üstü', kobiD: 'İhtiyacınıza göre modülleri seçin', esnafT: 'Esnaf', esnafD: 'Bakkal · Berber · Lokanta', soon: 'Çok yakında', modH: 'Modülleriniz', modP: 'Zorunlu modüller her zaman açıktır. Seçmeli modülleri işaretleyin; sonra Program Ayarları’ndan değiştirebilirsiniz.', modReq: 'Zorunlu', modOpt: 'Seçmeli', pkgH: 'Esnaf paketiniz', pkgP: 'İşinize uygun paketi seçin; modüller otomatik kurulur.', p_bakkalT: 'Bakkal · Market', p_bakkalD: 'Dokunmatik yazarkasa, barkod, stok', p_berberT: 'Berber · Kuaför', p_berberD: 'Bölümler, hizmetler, randevu takvimi', p_lokantaT: 'Lokanta · Fastfood', p_lokantaD: 'Masa düzeni, garson, adisyon', dronT: 'Dron', dronD: 'Dron operasyonları · Canlı uçuş · Rotalar', dronH: 'Dron paketiniz', dronP: 'Dron Yönetimi (envanter, canlı uçuş, rotalar, köprüler), saha görevleri, müşteriler, finans ve evrak otomatik kurulur.' },
  en: { firmType: 'Company type', kobiT: 'SME and up', kobiD: 'Choose the modules you need', esnafT: 'Small business', esnafD: 'Grocery · Barber · Restaurant', soon: 'Coming soon', modH: 'Your modules', modP: 'Required modules are always on. Tick the optional ones; you can change them later in Settings.', modReq: 'Required', modOpt: 'Optional', pkgH: 'Your business package', pkgP: 'Pick the package that fits; modules are set up automatically.', p_bakkalT: 'Grocery · Market', p_bakkalD: 'Touch POS, barcode, stock', p_berberT: 'Barber · Hair salon', p_berberD: 'Sections, services, booking calendar', p_lokantaT: 'Restaurant · Fast food', p_lokantaD: 'Table layout, waiter, checks', dronT: 'Drone', dronD: 'Drone operations · Live flight · Routes', dronH: 'Your drone package', dronP: 'Drone Management (fleet, live flight, routes, bridges), field tasks, customers, finance and documents are set up automatically.' },
  de: { firmType: 'Unternehmenstyp', kobiT: 'KMU und größer', kobiD: 'Wählen Sie die benötigten Module', esnafT: 'Kleingewerbe', esnafD: 'Laden · Friseur · Restaurant', soon: 'Demnächst', modH: 'Ihre Module', modP: 'Pflichtmodule sind immer aktiv. Wählen Sie die optionalen; später in den Einstellungen änderbar.', modReq: 'Pflicht', modOpt: 'Optional', pkgH: 'Ihr Gewerbepaket', pkgP: 'Wählen Sie das passende Paket; Module werden automatisch eingerichtet.', p_bakkalT: 'Laden · Markt', p_bakkalD: 'Touch-Kasse, Barcode, Lager', p_berberT: 'Friseur · Salon', p_berberD: 'Bereiche, Leistungen, Terminkalender', p_lokantaT: 'Restaurant · Fastfood', p_lokantaD: 'Tischplan, Kellner, Rechnungen', dronT: 'Drohne', dronD: 'Drohneneinsätze · Live-Flug · Routen', dronH: 'Ihr Drohnenpaket', dronP: 'Drohnenverwaltung (Bestand, Live-Flug, Routen, Bridges), Außeneinsätze, Kunden, Finanzen und Dokumente werden automatisch eingerichtet.' },
  fr: { firmType: 'Type d’entreprise', kobiT: 'PME et plus', kobiD: 'Choisissez les modules nécessaires', esnafT: 'Artisan / commerçant', esnafD: 'Épicerie · Coiffeur · Restaurant', soon: 'Bientôt', modH: 'Vos modules', modP: 'Les modules obligatoires sont toujours actifs. Cochez les optionnels ; modifiables plus tard dans les réglages.', modReq: 'Obligatoire', modOpt: 'Optionnel', pkgH: 'Votre forfait commerce', pkgP: 'Choisissez le forfait adapté ; les modules sont installés automatiquement.', p_bakkalT: 'Épicerie · Marché', p_bakkalD: 'Caisse tactile, code-barres, stock', p_berberT: 'Coiffeur · Salon', p_berberD: 'Espaces, services, agenda de rendez-vous', p_lokantaT: 'Restaurant · Fast-food', p_lokantaD: 'Plan de tables, serveur, additions', dronT: 'Drone', dronD: 'Opérations drone · Vol en direct · Itinéraires', dronH: 'Votre forfait drone', dronP: 'Gestion des drones (flotte, vol en direct, itinéraires, passerelles), missions terrain, clients, finances et documents sont installés automatiquement.' },
  es: { firmType: 'Tipo de empresa', kobiT: 'Pyme y más', kobiD: 'Elija los módulos que necesita', esnafT: 'Autónomo / comercio', esnafD: 'Tienda · Peluquería · Restaurante', soon: 'Muy pronto', modH: 'Sus módulos', modP: 'Los módulos obligatorios siempre están activos. Marque los opcionales; podrá cambiarlos luego en Ajustes.', modReq: 'Obligatorio', modOpt: 'Opcional', pkgH: 'Su paquete de comercio', pkgP: 'Elija el paquete adecuado; los módulos se instalan automáticamente.', p_bakkalT: 'Tienda · Mercado', p_bakkalD: 'TPV táctil, código de barras, stock', p_berberT: 'Peluquería · Salón', p_berberD: 'Secciones, servicios, agenda de citas', p_lokantaT: 'Restaurante · Comida rápida', p_lokantaD: 'Plano de mesas, camarero, cuentas', dronT: 'Dron', dronD: 'Operaciones con drones · Vuelo en vivo · Rutas', dronH: 'Su paquete de drones', dronP: 'Gestión de drones (flota, vuelo en vivo, rutas, puentes), tareas de campo, clientes, finanzas y documentos se instalan automáticamente.' },
  ar: { firmType: 'نوع الشركة', kobiT: 'المنشآت وما فوق', kobiD: 'اختر الوحدات التي تحتاجها', esnafT: 'الحرفيون', esnafD: 'بقالة · حلاق · مطعم', soon: 'قريباً جداً', modH: 'وحداتك', modP: 'الوحدات الإلزامية مفعّلة دائماً. اختر الاختيارية؛ يمكنك تغييرها لاحقاً من الإعدادات.', modReq: 'إلزامي', modOpt: 'اختياري', pkgH: 'باقة نشاطك', pkgP: 'اختر الباقة المناسبة؛ تُثبَّت الوحدات تلقائياً.', p_bakkalT: 'بقالة · سوق', p_bakkalD: 'نقطة بيع باللمس، باركود، مخزون', p_berberT: 'حلاق · صالون', p_berberD: 'أقسام، خدمات، تقويم مواعيد', p_lokantaT: 'مطعم · وجبات سريعة', p_lokantaD: 'توزيع الطاولات، نادل، فواتير', dronT: 'طائرات مسيّرة', dronD: 'عمليات المسيّرات · طيران مباشر · مسارات', dronH: 'باقة المسيّرات', dronP: 'تُثبَّت تلقائياً إدارة المسيّرات (الأسطول، الطيران المباشر، المسارات، الجسور) ومهام الميدان والعملاء والمالية والمستندات.' },
  ru: { firmType: 'Тип компании', kobiT: 'МСБ и выше', kobiD: 'Выберите нужные модули', esnafT: 'Малый бизнес', esnafD: 'Магазин · Парикмахер · Кафе', soon: 'Скоро', modH: 'Ваши модули', modP: 'Обязательные модули всегда включены. Отметьте необязательные; позже измените в Настройках.', modReq: 'Обязательный', modOpt: 'Необязательный', pkgH: 'Ваш пакет для бизнеса', pkgP: 'Выберите подходящий пакет; модули установятся автоматически.', p_bakkalT: 'Магазин · Маркет', p_bakkalD: 'Сенсорная касса, штрихкод, склад', p_berberT: 'Парикмахер · Салон', p_berberD: 'Зоны, услуги, календарь записи', p_lokantaT: 'Ресторан · Фастфуд', p_lokantaD: 'План столов, официант, счета', dronT: 'Дроны', dronD: 'Операции дронов · Онлайн-полёт · Маршруты', dronH: 'Ваш пакет для дронов', dronP: 'Управление дронами (парк, онлайн-полёт, маршруты, мосты), полевые задачи, клиенты, финансы и документы устанавливаются автоматически.' },
};
const r2 = () => REG2[lang] || REG2.en;
const qs = new URLSearchParams(location.search);
const state = { tab: location.hash === '#kayit' ? 'reg' : 'login', step: 0, pkg: qs.get('paket') || '', pkgs: [], form: { firm_type: 'kobi', modules: [], esnaf_pkg: 'bakkal' }, result: null, emailVerify: false, codeSentOnce: false, openBeta: false, emailVerified: false, submitting: false, mods: [] };
// Açık betada "Paket" adımı yok → ilk adım doğrudan Firma (adım 1). Adım numaraları sabit kalır (1=Firma,2=Yönetici,3=Tamam).
const firstStep = () => state.openBeta ? 1 : 0;
const recent = () => { try { return JSON.parse(localStorage.getItem('hepgo.firms') || '[]'); } catch { return []; } };
const remember = (addr, url) => { try { localStorage.setItem('hepgo.firms', JSON.stringify([{ addr, url }, ...recent().filter(r => r.url !== url)].slice(0, 4))); } catch { /* */ } };
const post = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.detail || 'Hata');
  return d;
};

function shell() {
  const L = t();
  const sun = svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>');
  const moon = svg('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>');
  return `<header class="nav scrolled"><div class="wrap nav-in">
      <a class="brand" href="/"><img src="/static/img/hepgo-mark.png" alt="" class="brand-logo"><span class="brand-txt"><b>HEPGO</b><span>ERP</span></span></a>
      <div class="nav-ctl gx-navctl"><a class="btn btn-ghost" href="/">← ${esc(L.back)}</a>
        <div class="lang-wrap"><button class="icon-btn lang-btn" id="langBtn" title="Dil / Language" aria-haspopup="true">${lang.toUpperCase()}</button>
          <div class="lang-menu" id="langMenu" hidden>${LANGS.map(([c, name]) => `<button class="lang-opt${c === lang ? ' on' : ''}" data-lang="${c}">${esc(name)}</button>`).join('')}</div></div>
        <button class="icon-btn" id="themeBtn" title="Tema">${theme === 'dark' ? sun : moon}</button></div>
    </div></header>
    <main class="gx-main"><div class="wrap gx-grid">
      <aside class="gx-side"><div class="gx-side-in">
        <span class="pill"><i></i> HEPGO ERP</span>
        <h1>${esc(L.sideH)}</h1><p>${esc(L.sideP)}</p>
        <ul class="gx-ticks">${L.sideList.map(x => `<li>${svg('<path d="M5 12l4 4 10-10"/>')}<span>${esc(x)}</span></li>`).join('')}</ul>
        <div class="gx-shot"><img class="shot" src="/static/img/landing/shots/dashboard.webp?v=2" alt=""></div>
      </div></aside>
      <section class="gx-card">
        <div class="gx-tabs" role="tablist">
          <button type="button" data-tab="login" class="${state.tab === 'login' ? 'on' : ''}">${esc(L.tabLogin)}</button>
          <button type="button" data-tab="reg" class="${state.tab === 'reg' ? 'on' : ''}">${esc(L.tabReg)}</button>
        </div>
        <div id="gxBody"></div>
      </section>
    </div></main>
    <footer class="foot"><div class="wrap foot-in"><div class="foot-brand"><img src="/static/img/hepgo-mark.png" alt=""><span>HEPGO</span></div>
      <div class="foot-meta">© ${new Date().getFullYear()} · HEPGO ERP</div></div></footer>`;
}

// ---------------- Panelime gir ----------------
function loginView() {
  const L = t();
  const rec = recent();
  $('#gxBody').innerHTML = `<div class="gx-pane">
    <h2>${esc(L.loginH)}</h2><p class="gx-sub">${esc(L.loginP)}</p>
    <form id="lookForm" class="gx-form" autocomplete="on">
      <label class="vx-field"><span>${esc(L.addr)}</span>
        <div class="gx-addr"><input class="vx-input" name="addr" autocomplete="organization" placeholder="${esc(L.addrPh)}" required autofocus><b>.${esc(base)}</b></div></label>
      <div class="vx-err" id="lookErr"></div>
      <div class="gx-msg" id="lookMsg" hidden></div>
      <button class="btn btn-primary btn-lg gx-full" type="submit">${esc(L.go)} →</button>
    </form>
    ${rec.length ? `<div class="gx-recent"><small>${esc(L.recent)}</small>${rec.map((r, i) => `<a class="gx-rec" href="${esc(r.url)}" data-i="${i}">${svg('<path d="M4 20V5l8-2v17M12 8h8v12M3 20h18"/>')}<span>${esc(r.addr)}</span><i>→</i></a>`).join('')}</div>` : ''}
    <button type="button" class="gx-link" id="forgotBtn">${esc(L.forgot)}</button>
    <form id="findForm" class="gx-form gx-find" hidden>
      <h3>${esc(L.findH)}</h3><p class="gx-sub">${esc(L.findP)}</p>
      <label class="vx-field"><span>${esc(L.email)}</span><input class="vx-input" type="email" name="email" autocomplete="username" required></label>
      <label class="vx-field"><span>${esc(L.pass)}</span><input class="vx-input" type="password" name="pass" autocomplete="current-password" required></label>
      <div class="vx-err" id="findErr"></div>
      <button class="btn btn-ghost gx-full" type="submit">${esc(L.find)}</button>
      <div id="findOut"></div>
    </form>
    <p class="gx-alt">${esc(L.noAcc)} <button type="button" class="gx-link" data-tab="reg">${esc(L.regNow)} →</button></p>
  </div>`;
  const form = $('#lookForm'), err = $('#lookErr'), msg = $('#lookMsg');
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = ''; msg.hidden = true;
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    const addr = form.addr.value.trim();
    try {
      const r = await post('/api/public/firm-lookup', { address: addr });
      if (r.status === 'active') { remember(addr.includes('.') ? addr : `${addr}.${base}`, r.url); location.href = r.url; return; }
      msg.textContent = r.message; msg.className = `gx-msg ${r.status}`; msg.hidden = false;
    } catch (ex) { err.textContent = ex.message; }
    btn.disabled = false;
  });
  $('#forgotBtn').addEventListener('click', () => { const f = $('#findForm'); f.hidden = !f.hidden; if (!f.hidden) f.email.focus(); });
  const find = $('#findForm');
  find.addEventListener('submit', async e => {
    e.preventDefault(); $('#findErr').textContent = '';
    const btn = find.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const r = await post('/api/public/firm-find', { email: find.email.value, password: find.pass.value });
      $('#findOut').innerHTML = `<div class="gx-firms">${r.firms.map(f => `<div class="gx-firm ${f.status}">
        <div><b>${esc(f.name)}</b><small>${esc({ active: f.url?.replace(/^https?:\/\//, '').replace(/\/app$/, ''), pending: L.pending, offline: L.offline, unavailable: L.unavailable }[f.status] || '')} · ${esc(L.created)} ${esc((f.created_at || '').slice(0, 10))}</small>
          ${f.message ? `<p>${esc(f.message)}</p>` : ''}</div>
        ${f.status === 'active' ? `<a class="btn btn-primary" href="${esc(f.url)}">${esc(L.toPanel)} →</a>` : `<span class="gx-badge ${f.status}">${esc(L[f.status] || f.status)}</span>`}</div>`).join('')}</div>`;
    } catch (ex) { $('#findErr').textContent = ex.message; }
    btn.disabled = false;
  });
}

// ---------------- Yeni firma kaydı ----------------
function stepsBar() {
  const L = t();
  // Açık betada Paket adımı gizli → logical adım no'ları korunur (1=Firma…), yalnız görünümden çıkarılır.
  const items = L.steps.map((s, i) => [i, s]).filter(([i]) => !(state.openBeta && i === 0));
  return `<ol class="gx-steps">${items.map(([i, s], k) => `<li class="${i < state.step ? 'done' : i === state.step ? 'on' : ''}"><span>${i < state.step ? '✓' : k + 1}</span>${esc(s)}</li>`).join('')}</ol>`;
}

// Ülkeler (bayrak emoji 2-harf koddan). Türkiye ilk; sonra yaygın ülkeler.
const COUNTRIES = [['TR', 'Türkiye'], ['DE', 'Almanya'], ['US', 'ABD'], ['GB', 'Birleşik Krallık'], ['FR', 'Fransa'], ['NL', 'Hollanda'], ['IT', 'İtalya'], ['ES', 'İspanya'], ['AZ', 'Azerbaycan'], ['SA', 'Suudi Arabistan'], ['AE', 'BAE'], ['QA', 'Katar'], ['RU', 'Rusya'], ['UA', 'Ukrayna'], ['CN', 'Çin'], ['IN', 'Hindistan'], ['JP', 'Japonya'], ['KR', 'Güney Kore'], ['BR', 'Brezilya'], ['CA', 'Kanada'], ['AU', 'Avustralya'], ['EG', 'Mısır'], ['GR', 'Yunanistan'], ['BG', 'Bulgaristan'], ['RO', 'Romanya'], ['PL', 'Polonya'], ['SE', 'İsveç'], ['CH', 'İsviçre'], ['BE', 'Belçika'], ['AT', 'Avusturya']];
const cflag = cc => (cc && cc.length === 2) ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 127397 + c.charCodeAt(0))) : '';

function regView() {
  const L = t();
  const body = $('#gxBody');
  if (state.openBeta && state.step === 0) state.step = 1;   // Paket adımı betada yok
  if (state.step === 0) {
    body.innerHTML = `<div class="gx-pane">${stepsBar()}<h2>${esc(L.pickPkg)}</h2><p class="gx-sub">${esc(L.pickPkgP)}</p>
      <div class="gx-pkgs">${state.pkgs.map(p => `<button type="button" class="gx-pkg ${p.slug === state.pkg ? 'on' : ''}" data-pkg="${esc(p.slug)}">
        <b>${esc(p.name)}</b><span class="gx-fee">${p.open_beta ? esc(L.beta) : (p.monthly_fee ? `${nf.format(p.monthly_fee)} ₺<small>${esc(L.perMonth)}</small>` : esc(L.free))}</span>
        <small>${esc({ online: L.cloud, offline: L.onprem, both: L.both }[p.mode] || '')} · ${esc(L.mods(p.modules.length))}</small>
        ${p.description ? `<p>${esc(p.description)}</p>` : ''}</button>`).join('') || '<p class="gx-sub">…</p>'}</div>
      <div class="gx-acts"><button type="button" class="gx-link" id="noPkg">${esc(L.noPkg)}</button><button type="button" class="btn btn-primary btn-lg" id="next0">${esc(L.next)} →</button></div></div>`;
    body.querySelectorAll('[data-pkg]').forEach(b => b.addEventListener('click', () => { state.pkg = b.dataset.pkg; regView(); }));
    $('#noPkg').addEventListener('click', () => { state.pkg = ''; state.step = 1; regView(); });
    $('#next0').addEventListener('click', () => { state.step = 1; regView(); });
    return;
  }
  if (state.step === 1) {
    const f = state.form;
    const R = r2();
    const ftype = ['esnaf', 'dron'].includes(f.firm_type) ? f.firm_type : 'kobi';
    const kobi = ftype === 'kobi';
    const modCard = (m, locked) => {
      const on = locked || (f.modules || []).includes(m.key);
      return `<button type="button" class="gx-modcard${on ? ' on' : ''}${locked ? ' locked' : ''}" data-mod="${esc(m.key)}"${locked ? ' disabled' : ''}>
        <span class="gx-modcard-t">${esc(m.title)}</span>
        <span class="gx-modcard-s">${locked ? esc(R.modReq) : (on ? '✓ ' + esc(R.modOpt) : esc(R.modOpt))}</span></button>`;
    };
    const req = state.mods.filter(m => m.tier === 'required');
    const opt = state.mods.filter(m => m.tier === 'optional');
    body.innerHTML = `<div class="gx-pane">${stepsBar()}<h2>${esc(L.firmH)}</h2>
      <div class="gx-ftype">
        <button type="button" class="gx-ft${kobi ? ' on' : ''}" data-ft="kobi"><b>${esc(R.kobiT)}</b><small>${esc(R.kobiD)}</small></button>
        <button type="button" class="gx-ft${ftype === 'esnaf' ? ' on' : ''}" data-ft="esnaf"><b>${esc(R.esnafT)}</b><small>${esc(R.esnafD)}</small></button>
        <button type="button" class="gx-ft${ftype === 'dron' ? ' on' : ''}" data-ft="dron"><b>${esc(R.dronT)}</b><small>${esc(R.dronD)}</small></button>
      </div>
      <form id="f1" class="gx-form">
        <label class="vx-field"><span>${esc(L.cname)}</span><input class="vx-input" name="company" value="${esc(f.company || '')}" placeholder="${esc(L.cnamePh)}" required autofocus></label>
        <label class="vx-field"><span>${esc(L.yourAddr)}</span>
          <div class="gx-slug"><input class="vx-input" name="slug" value="${esc(f.slug || '')}" autocapitalize="none" spellcheck="false" placeholder="firmaniz"><span class="gx-slug-suf">.${esc(base)}</span></div>
          <small class="gx-slug-msg muted" id="slugMsg">${esc(L.addrHint)}</small></label>
        <div class="gx-row">
          <label class="vx-field"><span>${esc(L.countryL)}</span>
            <select class="vx-input" name="country">${COUNTRIES.map(([cc, nm]) => `<option value="${cc}"${(f.country || 'TR') === cc ? ' selected' : ''}>${cflag(cc)} ${esc(nm)}</option>`).join('')}</select></label>
          <label class="vx-field"><span>${esc(L.city)}</span><input class="vx-input" name="city" value="${esc(f.city || '')}"></label>
        </div>
        <div class="gx-row">
          <label class="vx-field"><span>${esc(L.phone)}</span><input class="vx-input" type="tel" name="phone" value="${esc(f.phone || '')}" placeholder="05xx xxx xx xx" required></label>
          <label class="vx-field"><span>${esc(L.tax)}</span><input class="vx-input" name="tax" value="${esc(f.tax || '')}" inputmode="numeric"></label>
        </div>
        <div class="vx-field"><span>${esc(L.logoL)}</span>
          <div class="gx-drop${f.logo ? ' has' : ''}" id="logoDrop" tabindex="0" role="button">
            <input type="file" id="logoInput" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
            <div class="gx-drop-prev" id="logoPrev">${f.logo ? `<img src="${f.logo}" alt="">` : ''}</div>
            <div class="gx-drop-cta">
              <span class="gx-drop-ic">${svg('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>')}</span>
              <b id="logoTitle">${f.logo ? esc(L.logoChange) : esc(L.logoPick)}</b>
              <span class="small muted">${esc(L.logoHint)}</span>
            </div>
            <button type="button" class="gx-drop-x" id="logoDel"${f.logo ? '' : ' hidden'} aria-label="${esc(L.logoRemove)}">×</button>
          </div>
        </div>
        <div class="gx-modsel"${kobi ? '' : ' hidden'} id="modSel">
          <div class="gx-modsel-h"><b>${esc(R.modH)}</b><p class="gx-sub">${esc(R.modP)}</p></div>
          ${opt.length ? `<div class="gx-modgrid">${opt.map(m => modCard(m, false)).join('')}</div>` : ''}
          <div class="gx-modsel-h" style="margin-top:14px"><small class="muted">${esc(R.modReq)}</small></div>
          <div class="gx-modgrid">${req.map(m => modCard(m, true)).join('')}</div>
        </div>
        <div class="gx-modsel"${ftype === 'dron' ? '' : ' hidden'} id="dronSel">
          <div class="gx-modsel-h"><b>${esc(R.dronH)}</b><p class="gx-sub">${esc(R.dronP)}</p></div>
        </div>
        <div class="gx-modsel"${ftype === 'esnaf' ? '' : ' hidden'} id="esnafSel">
          <div class="gx-modsel-h"><b>${esc(R.pkgH)}</b><p class="gx-sub">${esc(R.pkgP)}</p></div>
          <div class="gx-ftype gx-pkg3">
            ${['bakkal', 'berber', 'lokanta'].map(pk => `<button type="button" class="gx-ft gx-epkg${(f.esnaf_pkg || 'bakkal') === pk ? ' on' : ''}" data-epkg="${pk}"><b>${esc(R['p_' + pk + 'T'])}</b><small>${esc(R['p_' + pk + 'D'])}</small></button>`).join('')}
          </div>
        </div>
        <div class="vx-err" id="f1err"></div>
        <div class="gx-acts">${state.openBeta ? '<span></span>' : `<button type="button" class="btn btn-ghost" id="prev">← ${esc(L.prev)}</button>`}<button class="btn btn-primary btn-lg" type="submit">${esc(L.next)} →</button></div>
      </form></div>`;
    const form = $('#f1');
    const err = $('#f1err'), slugMsg = $('#slugMsg');
    // Firma tipi seçimi (Esnaf şimdilik devre dışı — Faz 2) + modül kartları (KOBİ)
    body.querySelectorAll('.gx-ft[data-ft]').forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return;
      const ft = b.dataset.ft;
      state.form.firm_type = ft;
      $('#modSel') && ($('#modSel').hidden = ft !== 'kobi');
      $('#esnafSel') && ($('#esnafSel').hidden = ft !== 'esnaf');
      $('#dronSel') && ($('#dronSel').hidden = ft !== 'dron');
      body.querySelectorAll('.gx-ft[data-ft]').forEach(x => x.classList.toggle('on', x === b));
    }));
    // Esnaf paket seçimi (Bakkal / Berber / Lokanta)
    body.querySelectorAll('.gx-epkg[data-epkg]').forEach(b => b.addEventListener('click', () => {
      state.form.esnaf_pkg = b.dataset.epkg;
      body.querySelectorAll('.gx-epkg').forEach(x => x.classList.toggle('on', x === b));
    }));
    body.querySelectorAll('.gx-modcard[data-mod]:not([disabled])').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.mod, arr = state.form.modules || (state.form.modules = []);
      const i = arr.indexOf(k); (i >= 0) ? arr.splice(i, 1) : arr.push(k);
      const on = arr.includes(k);
      b.classList.toggle('on', on);
      b.querySelector('.gx-modcard-s').textContent = on ? '✓ ' + r2().modOpt : r2().modOpt;
    }));
    let slugEdited = !!f.slug, tm;
    // Firma adresi (slug) canlı kontrol
    const checkSlug = () => { clearTimeout(tm); tm = setTimeout(async () => {
      const v = form.slug.value.trim();
      if (!v) { slugMsg.textContent = L.addrHint; slugMsg.className = 'gx-slug-msg muted'; state.form.slug = ''; state.form.slugOk = false; return; }
      slugMsg.textContent = L.addrCheck; slugMsg.className = 'gx-slug-msg muted';
      try {
        const r = await (await fetch(`/api/public/slug-check?slug=${encodeURIComponent(v)}`)).json();
        state.form.slug = r.slug || v; state.form.slugOk = !!r.ok;
        slugMsg.textContent = r.ok ? `${r.domain} · ${L.addrOk}` : (r.reason || '');
        slugMsg.className = r.ok ? 'gx-slug-msg ok' : 'gx-slug-msg err';
      } catch { slugMsg.textContent = ''; }
    }, 300); };
    // Firma adından slug öner (kullanıcı adresi elle değiştirmediyse)
    const fromName = () => { clearTimeout(tm); tm = setTimeout(async () => {
      if (slugEdited) return;
      const n = form.company.value.trim();
      if (!n) { form.slug.value = ''; slugMsg.textContent = L.addrHint; slugMsg.className = 'gx-slug-msg muted'; state.form.slugOk = false; return; }
      try { const r = await (await fetch(`/api/public/slug-preview?name=${encodeURIComponent(n)}`)).json(); form.slug.value = r.slug; checkSlug(); } catch { /* */ }
    }, 300); };
    form.company.addEventListener('input', fromName);
    form.slug.addEventListener('input', () => { slugEdited = true; checkSlug(); });
    if (form.slug.value.trim()) checkSlug(); else if (form.company.value.trim()) fromName();
    // Logo (kurallı, şık dropzone — tıkla ya da sürükle-bırak)
    const drop = $('#logoDrop'), logoInput = $('#logoInput');
    const paintLogo = () => {
      $('#logoPrev').innerHTML = state.form.logo ? `<img src="${state.form.logo}" alt="">` : '';
      $('#logoTitle').textContent = state.form.logo ? L.logoChange : L.logoPick;
      $('#logoDel').hidden = !state.form.logo;
      drop.classList.toggle('has', !!state.form.logo);
    };
    const takeFile = (file) => {
      if (!file) return;
      err.textContent = '';
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { err.textContent = L.logoBadType; return; }
      if (file.size > 2 * 1024 * 1024) { err.textContent = L.logoTooBig; return; }
      const rd = new FileReader();
      rd.onload = () => { state.form.logo = rd.result; paintLogo(); };
      rd.readAsDataURL(file);
    };
    drop.addEventListener('click', e => { if (e.target.id !== 'logoDel') logoInput.click(); });
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); logoInput.click(); } });
    $('#logoDel').addEventListener('click', e => { e.stopPropagation(); state.form.logo = ''; logoInput.value = ''; paintLogo(); });
    logoInput.addEventListener('change', () => { takeFile(logoInput.files[0]); logoInput.value = ''; });
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'dragend', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files[0]) takeFile(e.dataTransfer.files[0]); });
    if ($('#prev')) $('#prev').addEventListener('click', () => { state.step = 0; regView(); });
    form.addEventListener('submit', e => {
      e.preventDefault(); err.textContent = '';
      if (!state.form.slugOk) { err.textContent = L.addrNeeded; form.slug.focus(); return; }
      Object.assign(state.form, { company: form.company.value.trim(), city: form.city.value.trim(), phone: form.phone.value.trim(), tax: form.tax.value.trim(), country: form.country.value });
      state.step = 2; regView();
    });
    return;
  }
  if (state.step === 2) {
    const f = state.form;
    // E-posta doğrulaması gerekli mi, edildi mi? Doğrulanana kadar ŞİFRE alanı görünmez (kullanıcı isteği #3).
    const needV = state.emailVerify && !state.emailVerified;
    body.innerHTML = `<div class="gx-pane">${stepsBar()}<h2>${esc(L.adminH)}</h2><p class="gx-sub">${esc(L.adminP)}</p>
      <form id="f2" class="gx-form">
        <label class="vx-field"><span>${esc(L.full)}</span><input class="vx-input" name="full" value="${esc(f.full || '')}" autocomplete="name" required autofocus></label>
        <label class="vx-field"><span>${esc(L.mail)}</span>
          <div class="gx-inint">
            <input class="vx-input" type="email" name="email" value="${esc(f.email || '')}" autocomplete="email" required${state.emailVerified ? ' disabled' : ''}>
            ${state.emailVerify ? (state.emailVerified
              ? `<span class="gx-inint-ok">${svg('<path d="M5 12l4 4 10-10"/>')}${esc(L.emailVerified)}</span>`
              : `<button type="button" class="gx-inint-btn" id="sendCode">${esc(L.sendCode)}</button>`) : ''}
          </div>
          ${state.emailVerify && state.emailVerified ? `<small class="gx-slug-msg"><button type="button" class="gx-link" id="changeMail">${esc(L.changeMail)}</button></small>` : ''}
        </label>
        <div id="pwSection"${needV ? ' hidden' : ''}>
          <div class="gx-row"><label class="vx-field"><span>${esc(L.pw)}</span><input class="vx-input" type="password" name="pw" minlength="10" autocomplete="new-password"${needV ? '' : ' required'}></label>
            <label class="vx-field"><span>${esc(L.pw2)}</span><input class="vx-input" type="password" name="pw2" minlength="10" autocomplete="new-password"${needV ? '' : ' required'}></label></div>
          <div class="gx-meter"><i id="pwBar"></i><small id="pwTxt"></small></div>
          <label class="gx-check"><input type="checkbox" name="accept"${needV ? '' : ' required'}><span>${esc(L.accept)}</span></label>
          <p class="gx-legal-links"><a href="/gizlilik" target="_blank" rel="noopener">${esc(legalL()[0])}</a> · <a href="/kullanim-sartlari" target="_blank" rel="noopener">${esc(legalL()[1])}</a> · <a href="/beta-sozlesmesi" target="_blank" rel="noopener">${esc(legalL()[2])}</a></p>
        </div>
        <div class="vx-err" id="regErr"></div>
        ${needV ? `<p class="gx-sub gx-verifyhint">${esc(L.verifyFirst)}</p>` : ''}
        <div class="gx-acts"><button type="button" class="btn btn-ghost" id="prev">← ${esc(L.prev)}</button>
          ${needV ? '' : `<button class="btn btn-primary btn-lg" type="submit">${esc(L.submit)}</button>`}</div>
      </form></div>`;
    const form = $('#f2');
    const err = $('#regErr');
    const meter = () => {
      const v = form.pw.value;
      const sc = [v.length >= 10, /[a-zçğıöşü]/.test(v) && /[A-ZÇĞİÖŞÜ]/.test(v), /\d/.test(v), /[^\wçğıöşüÇĞİÖŞÜ]/.test(v), v.length >= 14].filter(Boolean).length;
      const bar = $('#pwBar');
      bar.className = sc <= 2 ? 'weak' : sc <= 3 ? 'ok' : 'strong';
      bar.style.width = `${Math.min(100, sc * 20)}%`;   // CSSOM (CSP'de satır içi stil değil)
      $('#pwTxt').textContent = v ? (sc <= 2 ? L.pwWeak : sc <= 3 ? L.pwOk : L.pwStrong) : '';
    };
    if (form.pw) form.pw.addEventListener('input', meter);
    $('#prev').addEventListener('click', () => { state.form.full = form.full.value; if (form.email && !form.email.disabled) state.form.email = form.email.value; state.step = 1; regView(); });
    // E-postayı değiştir → doğrulamayı sıfırla, tekrar kod iste
    if ($('#changeMail')) $('#changeMail').addEventListener('click', () => { state.emailVerified = false; state.codeSentOnce = false; state.form.full = form.full.value; regView(); });
    // "Doğrulama kodu gönder" (input içinde) → email'i kilitle + modal aç
    if ($('#sendCode')) {
      $('#sendCode').addEventListener('click', async () => {
        const email = form.email.value.trim().toLowerCase();
        if (!/.+@.+\..+/.test(email)) { err.textContent = L.badEmail; form.email.focus(); return; }
        err.textContent = ''; state.form.full = form.full.value; state.form.email = email;
        const btn = $('#sendCode'); btn.disabled = true; btn.textContent = L.codeSending; form.email.disabled = true;
        try {
          const r = await post('/api/register/send-code', { email });
          state.codeSentOnce = true;
          openVerifyModal(email, r.sent_to || email);
        } catch (ex) { err.textContent = ex.message; form.email.disabled = false; }
        btn.disabled = false; btn.textContent = L.sendCode;
      });
    }
    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = '';
      if (state.submitting) return;                       // uçuşta — çift göndermeyi engelle
      if (needV) { err.textContent = L.verifyFirst; return; }
      if (form.pw.value !== form.pw2.value) { err.textContent = L.mismatch; return; }
      const btn = form.querySelector('button[type=submit]');
      Object.assign(state.form, { full: form.full.value.trim() });
      if (form.email && !form.email.disabled) state.form.email = form.email.value.trim();
      // İlerleme: düğme disable + spinner; kurulum uzun sürebildiği için metni "Gönderiliyor…" → "Firmanız kuruluyor…"
      state.submitting = true;
      const orig = btn ? btn.innerHTML : '';
      const setBtn = txt => { if (btn) btn.innerHTML = `<span class="gx-spin"></span>${esc(txt)}`; };
      if (btn) { btn.disabled = true; btn.classList.add('busy'); }
      setBtn(L.submitting);
      $('#prev') && ($('#prev').disabled = true);
      const slowTimer = setTimeout(() => setBtn(L.provisioning), 1500);
      try {
        state.result = await post('/api/register', { company_name: state.form.company, master_username: state.form.email, master_name: state.form.full, password: form.pw.value,
          package_slug: state.pkg, phone: state.form.phone, tax_no: state.form.tax, city: state.form.city, accept: form.accept.checked, email_code: '',
          slug: state.form.slug || '', country: state.form.country || '', logo: state.form.logo || '', lang,
          firm_type: state.form.firm_type || 'kobi', modules: state.form.modules || [], esnaf_pkg: state.form.esnaf_pkg || 'bakkal' });
        clearTimeout(slowTimer); state.submitting = false;
        state.step = 3; regView();
      } catch (ex) {
        clearTimeout(slowTimer); state.submitting = false;
        err.textContent = ex.message;
        if (btn) { btn.disabled = false; btn.classList.remove('busy'); btn.innerHTML = orig; }
        if ($('#prev')) $('#prev').disabled = false;
      }
    });
    return;
  }
  // ---- Adım 3: Sonuç ----
  const r = state.result || {};
  if (r.status === 'active' && r.url) {
    // Açık beta otomatik kurulum: firma hazır → doğrudan giriş düğmesi (onay/başvuru akışı yok)
    body.innerHTML = `<div class="gx-pane gx-done">${stepsBar()}
      <div class="gx-ok">${svg('<path d="M5 12l4 4 10-10"/>')}</div>
      <h2>${esc(L.readyH)}</h2><p class="gx-sub">${esc(L.readyP)}</p>
      <dl class="gx-sum"><dt>${esc(L.yourAddr)}</dt><dd>${esc(r.domain || '—')}</dd><dt>${esc(L.mail)}</dt><dd>${esc(state.form.email || '')}</dd></dl>
      <a class="btn btn-primary btn-lg gx-full" href="${esc(r.url)}">${esc(L.loginNow)} →</a></div>`;
    return;
  }
  body.innerHTML = `<div class="gx-pane gx-done">${stepsBar()}
    <div class="gx-ok">${svg('<path d="M5 12l4 4 10-10"/>')}</div>
    <h2>${esc(L.okH)}</h2><p class="gx-sub">${esc(L.okP)}</p>
    <dl class="gx-sum"><dt>${esc(L.appNo)}</dt><dd>${esc(r.application_no || '—')}</dd><dt>${esc(L.yourAddr)}</dt><dd>${esc(r.domain || '—')}</dd>
      ${r.package ? `<dt>${esc(L.steps[0])}</dt><dd>${esc(r.package)}</dd>` : ''}<dt>${esc(L.mail)}</dt><dd>${esc(state.form.email || '')}</dd></dl>
    <ol class="gx-timeline">${L.timeline.map((x, i) => `<li class="${i === 0 ? 'done' : i === 1 ? 'on' : ''}">${esc(x)}</li>`).join('')}</ol>
    <a class="btn btn-ghost gx-full" href="/">← ${esc(L.back)}</a></div>`;
}

// E-posta doğrulama modalı (ping/çağrı ekranı tarzı, geri sayımlı). Doğru pin → /api/register/verify-code → şifre adımı açılır.
function openVerifyModal(email, masked) {
  const L = t();
  document.querySelectorAll('.gx-modal-wrap').forEach(n => n.remove());
  const wrap = document.createElement('div');
  wrap.className = 'gx-modal-wrap';
  wrap.innerHTML = `<div class="gx-modal" role="dialog" aria-modal="true">
    <button type="button" class="gx-modal-x" id="mX" aria-label="${esc(L.closeM)}">×</button>
    <div class="gx-ping"><span class="gx-ping-ring"></span><span class="gx-ping-ring d2"></span>
      <span class="gx-ping-core">${svg('<path d="M4 4h16v16H4z" fill="none"/><path d="M22 6l-10 7L2 6"/><rect x="2" y="4" width="20" height="16" rx="2" fill="none"/>')}</span></div>
    <h3>${esc(L.verifyH)}</h3><p class="gx-sub">${esc(L.verifyP(masked))}</p>
    <input class="vx-input gx-pin" id="mPin" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="______" aria-label="${esc(L.codeL)}">
    <div class="gx-count" id="mCount"></div>
    <div class="vx-err" id="mErr"></div>
    <button class="btn btn-primary btn-lg gx-full" id="mVerify">${esc(L.verifyBtn)}</button>
    <button type="button" class="gx-link gx-resend" id="mResend" disabled>${esc(L.resend)}</button>
  </div>`;
  document.body.appendChild(wrap);
  const pin = $('#mPin', wrap), errEl = $('#mErr', wrap), countEl = $('#mCount', wrap);
  const verifyBtn = $('#mVerify', wrap), resendBtn = $('#mResend', wrap);
  pin.focus();
  let left = 600, resendAt = 60, timer = null;           // kod 10 dk geçerli; 60 sn sonra tekrar gönder
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const render = () => {
    countEl.textContent = left > 0 ? `${L.expiresIn} ${fmt(left)}` : L.codeExpired;
    countEl.className = left > 0 ? 'gx-count' : 'gx-count exp';
    resendBtn.disabled = resendAt > 0;
    resendBtn.textContent = resendAt > 0 ? `${L.resend} (${resendAt})` : L.resend;
  };
  render();
  timer = setInterval(() => { if (left > 0) left--; if (resendAt > 0) resendAt--; render(); if (left <= 0) { clearInterval(timer); } }, 1000);
  const close = () => { if (timer) clearInterval(timer); wrap.remove(); const e = document.querySelector('#f2 input[name=email]'); if (e) e.disabled = false; };
  $('#mX', wrap).addEventListener('click', close);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  document.addEventListener('keydown', function esc0(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc0); } });
  pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); if (pin.value.length === 6) verifyBtn.click(); });
  const doVerify = async () => {
    const code = pin.value.trim();
    if (code.length !== 6) { errEl.textContent = L.codeNeed; return; }
    errEl.textContent = ''; verifyBtn.disabled = true; verifyBtn.textContent = L.verifying; pin.disabled = true;
    try {
      await post('/api/register/verify-code', { email, code });
      if (timer) clearInterval(timer);
      state.emailVerified = true; state.form.email = email;
      wrap.remove();
      regView();   // şifre adımı artık görünür
    } catch (ex) { errEl.textContent = ex.message; verifyBtn.disabled = false; verifyBtn.textContent = L.verifyBtn; pin.disabled = false; pin.focus(); pin.select(); }
  };
  verifyBtn.addEventListener('click', doVerify);
  resendBtn.addEventListener('click', async () => {
    errEl.textContent = ''; resendBtn.disabled = true;
    try { const r = await post('/api/register/send-code', { email }); left = 600; resendAt = 60; render(); countEl.textContent = L.codeSent(r.sent_to || masked); }
    catch (ex) { errEl.textContent = ex.message; resendAt = 0; render(); }
  });
}

function draw() {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr';   // Arapça sağdan sola
  document.documentElement.dataset.theme = theme;
  $('#app').innerHTML = shell();
  document.querySelectorAll('.gx-tabs [data-tab]').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; history.replaceState(null, '', state.tab === 'reg' ? '#kayit' : '#'); draw(); }));
  const lb = $('#langBtn'); const lm = $('#langMenu');
  lb.addEventListener('click', e => { e.stopPropagation(); lm.hidden = !lm.hidden; });
  lm.querySelectorAll('.lang-opt').forEach(b => b.addEventListener('click', () => {
    const c = b.dataset.lang; if (!LANG_CODES.includes(c) || c === lang) { lm.hidden = true; return; }
    lang = c; try { localStorage.setItem('veilox.lang', lang); } catch { /* */ } draw();
  }));
  document.addEventListener('click', () => { if (lm && !lm.hidden) lm.hidden = true; }, { once: true });
  $('#themeBtn').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('veilox.theme', theme); } catch { /* */ } draw(); });
  if (state.tab === 'reg') regView(); else loginView();
  document.querySelectorAll('#gxBody [data-tab]').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; history.replaceState(null, '', '#kayit'); draw(); }));
}

(async () => {
  try { const s = await (await fetch('/api/public/site')).json(); base = s.firm_base || base; state.emailVerify = !!s.email_verify; state.openBeta = !!s.open_beta; } catch { /* */ }
  try { state.mods = (await (await fetch('/api/modules')).json()).filter(m => m.tier !== 'central'); } catch { state.mods = []; }   // KOBİ modül seçimi: merkez modülleri hariç
  if (state.openBeta && state.step === 0) state.step = firstStep();   // Paket adımı betada yok
  draw();
  if (!state.openBeta) {
    try { state.pkgs = await (await fetch('/api/public/packages')).json(); } catch { state.pkgs = []; }
    if (state.tab === 'reg' && state.step === 0) regView();
  }
})();
