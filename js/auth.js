import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
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

export async function signInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

export function authErrorMessage(err) {
  const code = err?.code ?? '';
  const map = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'An account already exists with this email.',
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
        <div class="form-group">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" autocomplete="current-password" required minlength="6" placeholder="Min. 6 characters" />
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

export function bindAuthScreen(root, { onError } = {}) {
  let mode = 'signin';
  const form = root.querySelector('#auth-form');
  const emailInput = root.querySelector('#auth-email');
  const passwordInput = root.querySelector('#auth-password');
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
    showError('');
  };

  root.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.authTab));
  });

  const runAuth = async fn => {
    showError('');
    submitBtn.disabled = true;
    googleBtn.disabled = true;
    try {
      await fn();
    } catch (err) {
      showError(authErrorMessage(err));
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
