import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { auth } from './firebase.js';

const googleProvider = new GoogleAuthProvider();

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function needsEmailVerification(user) {
  if (!user?.email) return false;
  if (user.emailVerified) return false;
  return user.providerData.some(p => p.providerId === 'password');
}

export async function signInEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await cred.user.reload();
  return auth.currentUser;
}

export async function signUpEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  await sendEmailVerification(user);
}

export async function refreshAuthUser() {
  const user = auth.currentUser;
  if (!user) return null;
  await user.reload();
  return auth.currentUser;
}

export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signInGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

export function authErrorMessage(err, mode = 'signin') {
  const code = err?.code ?? '';
  if (mode === 'signin') {
    const signInMap = {
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found with this email. Please sign up first.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'No account found or incorrect password. New here? Please sign up first.',
      'auth/too-many-requests': 'Too many attempts. Try again later.',
    };
    if (signInMap[code]) return signInMap[code];
  }

  const map = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/email-already-in-use': 'An account already exists with this email. Please sign in instead.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
  };
  return map[code] ?? err?.message ?? 'Authentication failed.';
}

export function authScreenHtml() {
  return `
    <div class="auth-card">
      <div class="auth-brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 6-10"/></svg>
        </div>
        <div>
          <h1 class="auth-title">TradeVault</h1>
          <p class="auth-subtitle">Sign in to sync your journal across devices</p>
        </div>
      </div>

      <div class="auth-tabs" role="tablist">
        <button type="button" class="auth-tab active" data-auth-tab="signin">Sign In</button>
        <button type="button" class="auth-tab" data-auth-tab="signup">Sign Up</button>
      </div>

      <form id="auth-form" class="auth-form">
        <div class="form-group">
          <label for="auth-email">Email</label>
          <input type="email" id="auth-email" autocomplete="email" required placeholder="you@example.com" />
        </div>
        <div class="form-group auth-password-group">
          <div class="auth-password-label-row">
            <label for="auth-password">Password</label>
            <button type="button" class="auth-forgot-link" id="auth-forgot-link">Forgot password?</button>
          </div>
          <div class="password-field">
            <input type="password" id="auth-password" autocomplete="current-password" required minlength="6" placeholder="Min. 6 characters" />
            <button type="button" class="password-toggle" id="auth-password-toggle" aria-label="Show password">
              <svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg class="icon-eye-off hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <path d="M1 1l22 22"/><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/>
              </svg>
            </button>
          </div>
        </div>
        <p id="auth-error" class="auth-error hidden" role="alert"></p>
        <button type="submit" class="btn btn-primary auth-submit" id="auth-submit">Sign In</button>
      </form>

      <div class="auth-divider"><span>or</span></div>

      <button type="button" class="btn btn-secondary auth-google" id="auth-google">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continue with Google
      </button>
    </div>
  `;
}

export function forgotPasswordHtml() {
  return `
    <div class="auth-card">
      <div class="auth-brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
        </div>
        <div>
          <h1 class="auth-title">Reset password</h1>
          <p class="auth-subtitle">We'll email you a link to choose a new password</p>
        </div>
      </div>

      <form id="forgot-form" class="auth-form">
        <div class="form-group">
          <label for="forgot-email">Email</label>
          <input type="email" id="forgot-email" autocomplete="email" required placeholder="you@example.com" />
        </div>
        <p id="forgot-error" class="auth-error hidden" role="alert"></p>
        <p id="forgot-success" class="auth-success hidden" role="status"></p>
        <button type="submit" class="btn btn-primary auth-submit" id="forgot-submit">Send reset link</button>
      </form>

      <button type="button" class="btn btn-ghost auth-back-link" id="forgot-back">← Back to sign in</button>
    </div>
  `;
}

export function verifyEmailScreenHtml(email) {
  const safe = String(email)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `
    <div class="auth-card">
      <div class="auth-brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <div>
          <h1 class="auth-title">Verify your email</h1>
          <p class="auth-subtitle">We sent a link to <strong>${safe}</strong></p>
        </div>
      </div>

      <p class="auth-verify-text">Open the email and click the verification link. Check your spam folder if you don't see it.</p>
      <p id="verify-error" class="auth-error hidden" role="alert"></p>
      <p id="verify-success" class="auth-success hidden" role="status"></p>

      <div class="auth-verify-actions">
        <button type="button" class="btn btn-primary" id="btn-verify-check">I've verified my email</button>
        <button type="button" class="btn btn-secondary" id="btn-verify-resend">Resend email</button>
        <button type="button" class="btn btn-ghost" id="btn-verify-signout">Sign out</button>
      </div>
    </div>
  `;
}

export function bindAuthScreen(root, { onError, onSignUpSuccess, onForgotPassword } = {}) {
  let mode = 'signin';
  const form = root.querySelector('#auth-form');
  const emailInput = root.querySelector('#auth-email');
  const passwordInput = root.querySelector('#auth-password');
  const forgotLink = root.querySelector('#auth-forgot-link');
  const passwordToggle = root.querySelector('#auth-password-toggle');
  const submitBtn = root.querySelector('#auth-submit');
  const errorEl = root.querySelector('#auth-error');
  const googleBtn = root.querySelector('#auth-google');

  const showError = msg => {
    if (!msg) {
      errorEl.classList.add('hidden');
      errorEl.textContent = '';
      return;
    }
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    onError?.(msg);
  };

  const setMode = next => {
    mode = next;
    root.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.authTab === mode);
    });
    submitBtn.textContent = mode === 'signin' ? 'Sign In' : 'Create Account';
    passwordInput.autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    passwordInput.required = true;
    forgotLink?.classList.toggle('hidden', mode !== 'signin');
    showError('');
  };

  root.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.authTab));
  });

  forgotLink?.addEventListener('click', () => {
    const email = emailInput.value.trim();
    onForgotPassword?.(email);
  });

  passwordToggle?.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    passwordToggle.querySelector('.icon-eye')?.classList.toggle('hidden', show);
    passwordToggle.querySelector('.icon-eye-off')?.classList.toggle('hidden', !show);
    passwordToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  const runAuth = async fn => {
    showError('');
    submitBtn.disabled = true;
    googleBtn.disabled = true;
    try {
      const result = await fn();
      if (mode === 'signup') onSignUpSuccess?.();
    } catch (err) {
      showError(authErrorMessage(err, mode));
      if (mode === 'signin' && err?.code === 'auth/user-not-found') {
        setMode('signup');
      }
    } finally {
      submitBtn.disabled = false;
      googleBtn.disabled = false;
    }
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    runAuth(() => (mode === 'signin' ? signInEmail(email, password) : signUpEmail(email, password)));
  });

  googleBtn.addEventListener('click', () => runAuth(() => signInGoogle()));
}

export function bindForgotPasswordScreen(root, { onBack, onSuccess, onError } = {}) {
  const form = root.querySelector('#forgot-form');
  const emailInput = root.querySelector('#forgot-email');
  const submitBtn = root.querySelector('#forgot-submit');
  const backBtn = root.querySelector('#forgot-back');
  const errorEl = root.querySelector('#forgot-error');
  const successEl = root.querySelector('#forgot-success');

  const showError = msg => {
    errorEl.textContent = msg;
    errorEl.classList.toggle('hidden', !msg);
    successEl.classList.add('hidden');
    if (msg) onError?.(msg);
  };

  const showSuccess = msg => {
    successEl.textContent = msg;
    successEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    onSuccess?.(msg);
  };

  backBtn.addEventListener('click', () => onBack?.());

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) {
      showError('Please enter your email address.');
      return;
    }
    submitBtn.disabled = true;
    showError('');
    try {
      await sendPasswordReset(email);
      showSuccess('If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.');
      submitBtn.disabled = true;
    } catch (err) {
      showError(authErrorMessage(err));
      submitBtn.disabled = false;
    }
  });
}

export function bindVerifyScreen(root, { onVerified, onSignOut, onError, onSuccess } = {}) {
  const errorEl = root.querySelector('#verify-error');
  const successEl = root.querySelector('#verify-success');
  const checkBtn = root.querySelector('#btn-verify-check');
  const resendBtn = root.querySelector('#btn-verify-resend');
  const signoutBtn = root.querySelector('#btn-verify-signout');

  const showError = msg => {
    errorEl.textContent = msg;
    errorEl.classList.toggle('hidden', !msg);
    successEl.classList.add('hidden');
    if (msg) onError?.(msg);
  };

  const showSuccess = msg => {
    successEl.textContent = msg;
    successEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    onSuccess?.(msg);
  };

  checkBtn.addEventListener('click', async () => {
    checkBtn.disabled = true;
    resendBtn.disabled = true;
    showError('');
    try {
      const user = await refreshAuthUser();
      if (user?.emailVerified) {
        onVerified?.();
      } else {
        showError('Email not verified yet. Click the link in your inbox, then try again.');
      }
    } catch (err) {
      showError(err.message ?? 'Could not check verification status.');
    } finally {
      checkBtn.disabled = false;
      resendBtn.disabled = false;
    }
  });

  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    checkBtn.disabled = true;
    showError('');
    try {
      await resendVerificationEmail();
      showSuccess('Verification email sent. Check your inbox.');
    } catch (err) {
      showError(authErrorMessage(err));
    } finally {
      resendBtn.disabled = false;
      checkBtn.disabled = false;
    }
  });

  signoutBtn.addEventListener('click', () => onSignOut?.());
}
