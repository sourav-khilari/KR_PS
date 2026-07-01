import { useEffect, useMemo, useState } from 'react';
import { forgotPasswordRequest, resetForgotPassword, verifyForgotPasswordOtp } from '../services/api.js';

const OTP_LENGTH = 6;

export function ForgotPasswordFlow({ onBackToLogin }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCountdown((value) => value - 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const passwordHint = useMemo(() => {
    return 'Use at least 8 characters, one uppercase letter, one number, and one special character.';
  }, []);

  async function handleSendOtp(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await forgotPasswordRequest(email);
      setMessage('If an account exists for this email, an OTP has been sent.');
      setStep('otp');
      setCountdown(30);
    } catch (apiError) {
      setError(apiError.message || 'Unable to process your request.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await verifyForgotPasswordOtp({ email, otp });
      setMessage('OTP verified successfully.');
      setStep('reset');
    } catch (apiError) {
      setError(apiError.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await resetForgotPassword({ email, password, confirmPassword });
      setMessage('Password reset successful. You can now sign in.');
      setStep('success');
    } catch (apiError) {
      setError(apiError.message || 'Unable to reset password.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleResendOtp() {
    if (countdown > 0) return;
    setError('');
    setMessage('');
    setIsLoading(true);
    forgotPasswordRequest(email)
      .then(() => {
        setMessage('A new OTP has been sent.');
        setCountdown(30);
      })
      .catch((apiError) => {
        setError(apiError.message || 'Unable to resend OTP.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  function renderStep() {
    if (step === 'email') {
      return (
        <form onSubmit={handleSendOtp} className="auth-form">
          <label className="field-shell">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your registered email"
              required
            />
          </label>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      );
    }

    if (step === 'otp') {
      return (
        <form onSubmit={handleVerifyOtp} className="auth-form">
          <label className="field-shell">
            <span>Enter OTP</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
              placeholder="Enter 6-digit OTP"
              required
            />
          </label>
          <div className="auth-actions-row">
            <button type="submit" disabled={isLoading || otp.length !== OTP_LENGTH}>
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button type="button" className="secondary" onClick={handleResendOtp} disabled={isLoading || countdown > 0}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      );
    }

    if (step === 'reset') {
      return (
        <form onSubmit={handleResetPassword} className="auth-form">
          <label className="field-shell">
            <span>New password</span>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter new password"
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <label className="field-shell">
            <span>Confirm password</span>
            <div className="password-input-wrap">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((value) => !value)}>
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <p className="muted-copy auth-hint">{passwordHint}</p>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Resetting password...' : 'Reset Password'}
          </button>
        </form>
      );
    }

    return (
      <div className="auth-success-state">
        <h3>Password reset complete</h3>
        <p>{message}</p>
        <button type="button" onClick={onBackToLogin}>Back to login</button>
      </div>
    );
  }

  return (
    <div className="auth-flow-card">
      <div className="auth-flow-header">
        <h2>Forgot Password</h2>
        <p>We’ll guide you through email verification and password reset.</p>
      </div>
      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}
      {renderStep()}
      <button type="button" className="link-button" onClick={onBackToLogin}>
        Back to login
      </button>
    </div>
  );
}
