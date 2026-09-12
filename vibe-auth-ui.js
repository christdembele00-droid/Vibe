import {
  auth,
  firebaseConfigured,
  signInWithGoogle,
  signInWithEmail,
  createEmailAccount,
  signInAsAnonymous,
  startPhoneSignIn,
  confirmPhoneSignIn,
  signInWithGithub,
  getAuthErrorMessage
} from './firebase-client.js';

const $ = id => document.getElementById(id);
const toast = message => {
  const el = $('toast');
  if (!el) return;
  el.value = message;
  el.classList.add('show');
  clearTimeout(window.__vibeAuthToastTimer);
  window.__vibeAuthToastTimer = setTimeout(() => el.classList.remove('show'), 3200);
};

function setBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.style.opacity = busy ? '0.65' : '1';
}

async function run(button, action) {
  setBusy(button, true);
  try {
    await action();
  } catch (error) {
    console.error('[Vibe Auth]', error);
    toast(getAuthErrorMessage(error));
    setBusy(button, false);
  }
}

function initAuthUI() {
  const welcome = $('welcome-screen');
  if (!welcome || $('vibe-auth-panel')) return;

  const google = $('google-login-button');
  if (!google) return;

  const panel = document.createElement('div');
  panel.id = 'vibe-auth-panel';
  panel.style.cssText = 'width:min(440px,92vw);margin:18px auto 0;display:grid;gap:10px;text-align:left;max-height:55vh;overflow:auto;padding:0 4px 8px;';

  const heading = document.createElement('div');
  heading.textContent = 'Autres méthodes';
  heading.style.cssText = 'font-size:13px;color:#667781;text-align:center;margin:2px 0 4px;';

  const email = document.createElement('input');
  email.id = 'vibe-auth-email';
  email.type = 'email';
  email.placeholder = 'E-mail';
  email.autocomplete = 'email';

  const password = document.createElement('input');
  password.id = 'vibe-auth-password';
  password.type = 'password';
  password.placeholder = 'Mot de passe';
  password.autocomplete = 'current-password';

  [email, password].forEach(input => {
    input.style.cssText = 'box-sizing:border-box;width:100%;padding:12px;border:1px solid #d8dde0;border-radius:10px;background:#fff;color:#111b21;font:inherit;';
  });

  const emailRow = document.createElement('div');
  emailRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
  const emailLogin = document.createElement('button');
  emailLogin.type = 'button';
  emailLogin.textContent = 'Connexion e-mail';
  const emailCreate = document.createElement('button');
  emailCreate.type = 'button';
  emailCreate.textContent = 'Créer un compte';
  emailRow.append(emailLogin, emailCreate);

  const phone = document.createElement('input');
  phone.id = 'vibe-auth-phone';
  phone.type = 'tel';
  phone.placeholder = '+225 07 00 00 00 00';
  phone.autocomplete = 'tel';
  phone.style.cssText = 'box-sizing:border-box;width:100%;padding:12px;border:1px solid #d8dde0;border-radius:10px;background:#fff;color:#111b21;font:inherit;';

  const phoneRow = document.createElement('div');
  phoneRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
  const phoneStart = document.createElement('button');
  phoneStart.type = 'button';
  phoneStart.textContent = 'Envoyer le code';
  const phoneConfirm = document.createElement('button');
  phoneConfirm.type = 'button';
  phoneConfirm.textContent = 'Valider le code';
  phoneConfirm.hidden = true;
  phoneRow.append(phoneStart, phoneConfirm);

  const phoneCode = document.createElement('input');
  phoneCode.id = 'vibe-auth-phone-code';
  phoneCode.type = 'text';
  phoneCode.inputMode = 'numeric';
  phoneCode.autocomplete = 'one-time-code';
  phoneCode.placeholder = 'Code reçu par SMS';
  phoneCode.hidden = true;
  phoneCode.style.cssText = 'box-sizing:border-box;width:100%;padding:12px;border:1px solid #d8dde0;border-radius:10px;background:#fff;color:#111b21;font:inherit;';

  const recaptcha = document.createElement('div');
  recaptcha.id = 'vibe-phone-recaptcha';
  recaptcha.style.cssText = 'min-height:1px;';

  const anonymous = document.createElement('button');
  anonymous.type = 'button';
  anonymous.textContent = 'Continuer anonymement';

  const github = document.createElement('button');
  github.type = 'button';
  github.textContent = 'Continuer avec GitHub';
  github.style.background = '#24292f';
  github.style.color = '#fff';

  const allButtons = [emailLogin, emailCreate, phoneStart, phoneConfirm, anonymous, github];
  allButtons.forEach(button => {
    button.style.cssText += 'padding:11px;border:0;border-radius:10px;background:#f0f2f5;color:#111b21;font-weight:600;cursor:pointer;min-height:44px;';
  });
  github.style.background = '#24292f';
  github.style.color = '#fff';

  panel.append(heading, email, password, emailRow, phone, phoneCode, phoneRow, recaptcha, anonymous, github);
  google.insertAdjacentElement('afterend', panel);

  google.addEventListener('click', () => run(google, async () => {
    if (!firebaseConfigured || !auth) throw new Error('Firebase Authentication n’est pas configuré.');
    await signInWithGoogle();
  }));

  emailLogin.addEventListener('click', () => run(emailLogin, async () => {
    if (!email.value.trim() || !password.value) throw new Error('Saisissez votre e-mail et votre mot de passe.');
    await signInWithEmail(email.value, password.value);
  }));

  emailCreate.addEventListener('click', () => run(emailCreate, async () => {
    if (!email.value.trim() || !password.value) throw new Error('Saisissez un e-mail et un mot de passe.');
    await createEmailAccount(email.value, password.value);
  }));

  anonymous.addEventListener('click', () => run(anonymous, async () => {
    await signInAsAnonymous();
  }));

  phoneStart.addEventListener('click', () => run(phoneStart, async () => {
    if (!phone.value.trim()) throw new Error('Numéro de téléphone requis.');
    await startPhoneSignIn(phone.value, 'vibe-phone-recaptcha');
    phoneCode.hidden = false;
    phoneConfirm.hidden = false;
    phoneStart.textContent = 'Code envoyé';
    toast('Code SMS envoyé.');
  }));

  phoneConfirm.addEventListener('click', () => run(phoneConfirm, async () => {
    if (!phoneCode.value.trim()) throw new Error('Code de vérification requis.');
    await confirmPhoneSignIn(phoneCode.value);
  }));

  github.addEventListener('click', () => run(github, async () => {
    await signInWithGithub();
  }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAuthUI, { once: true });
else initAuthUI();
