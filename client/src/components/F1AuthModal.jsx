import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Key,
  Mail,
  ShieldAlert,
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  Flag,
  Hash
} from 'lucide-react';
import { F1_TEAMS, TEAM_LIST, soundEngine } from '../theme/f1Constants';

export default function F1AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [regStep, setRegStep] = useState(1); // 1: Details, 2: OTP, 3: Constructor Induction

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state (Step 1)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP state (Step 2)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [devOtpHint, setDevOtpHint] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const otpInputRefs = useRef([]);

  // Induction state (Step 3)
  const [inductionCallsign, setInductionCallsign] = useState('');
  const [inductionNumber, setInductionNumber] = useState(44);
  const [selectedTeam, setSelectedTeam] = useState('ferrari');
  const [tempAuthToken, setTempAuthToken] = useState('');

  // General state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP Countdown Timer
  useEffect(() => {
    let timer;
    if (regStep === 2 && otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [regStep, otpCountdown]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Reset errors when switching modes
  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setRegStep(1);
  };

  // -------------------------------------------------------------
  // 1. DRIVER LOGIN HANDLER
  // -------------------------------------------------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        identifier: loginIdentifier.trim(),
        password: loginPassword
      });

      const { user, token, requiresInduction } = res.data;
      localStorage.setItem('keysprint_token', token);

      if (requiresInduction) {
        // User logged in but needs to complete induction
        setTempAuthToken(token);
        setInductionCallsign(user.username || '');
        setInductionNumber(user.driverNumber || Math.floor(2 + Math.random() * 97));
        setSelectedTeam(user.avatar || 'ferrari');
        setMode('register');
        setRegStep(3);
      } else {
        try { soundEngine.playKeyClick(); } catch (err) {}
        onAuthSuccess(user, token);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. STEP 1: TRANSMIT OTP REGISTRATION HANDLER
  // -------------------------------------------------------------
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your PIN.');
      return;
    }

    if (password.length < 6) {
      setError('Telemetry Access PIN must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/send-otp', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword
      });

      if (res.data.devOtp) {
        setDevOtpHint(res.data.devOtp);
      }

      setRegStep(2);
      setOtpCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to transmit telemetry code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 3. STEP 2: OTP INPUT & VERIFICATION HANDLER
  // -------------------------------------------------------------
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      if (otpInputRefs.current[5]) otpInputRefs.current[5].focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the full 6-digit telemetry verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: fullOtp
      });

      const { user, token } = res.data;
      localStorage.setItem('keysprint_token', token);
      setTempAuthToken(token);

      // Pre-fill Step 3 induction
      setInductionCallsign(user.username || username.trim());
      setInductionNumber(user.driverNumber || Math.floor(2 + Math.random() * 97));
      setSelectedTeam(user.avatar || 'ferrari');

      setRegStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/send-otp', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword
      });

      if (res.data.devOtp) {
        setDevOtpHint(res.data.devOtp);
      }
      setOtpCountdown(60);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend telemetry code.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 4. STEP 3: CONSTRUCTOR INDUCTION & NUMBER CUSTOMIZATION
  // -------------------------------------------------------------
  const handleCompleteInduction = async (e) => {
    e.preventDefault();
    setError('');

    const parsedNum = parseInt(inductionNumber, 10);
    if (isNaN(parsedNum) || parsedNum < 1 || parsedNum > 99) {
      setError('Driver Car Racing Number must be between 1 and 99.');
      return;
    }

    if (!inductionCallsign || inductionCallsign.trim().length < 2) {
      setError('Driver Callsign must be at least 2 characters long.');
      return;
    }

    setLoading(true);

    try {
      const tokenToUse = tempAuthToken || localStorage.getItem('keysprint_token');
      const res = await axios.post(
        'http://localhost:5000/api/auth/complete-induction',
        {
          callsign: inductionCallsign.trim(),
          driverNumber: parsedNum,
          teamId: selectedTeam
        },
        { headers: { Authorization: `Bearer ${tokenToUse}` } }
      );

      const { user, token } = res.data;
      localStorage.setItem('keysprint_token', token);
      try { soundEngine.playKeyClick(); } catch (err) {}

      onAuthSuccess(user, token);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete constructor induction.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 5. GOOGLE AUTHENTICATION HANDLER
  // -------------------------------------------------------------
  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      // In web development / testing, generate a realistic verified Google Driver payload
      const mockGoogle = {
        name: 'Carlos Sainz',
        given_name: 'Carlos',
        family_name: 'Sainz',
        email: `driver_${Date.now().toString().slice(-4)}@gmail.com`,
        sub: `google_uid_${Date.now()}`
      };

      const res = await axios.post('http://localhost:5000/api/auth/google', {
        mockProfile: mockGoogle
      });

      const { user, token, requiresInduction } = res.data;
      localStorage.setItem('keysprint_token', token);

      if (requiresInduction) {
        // Direct jump to Step 3: Constructor Induction with pre-filled callsign
        setTempAuthToken(token);
        setInductionCallsign(user.username || 'CarlosSainz');
        setInductionNumber(user.driverNumber || Math.floor(2 + Math.random() * 97));
        setSelectedTeam(user.avatar || 'ferrari');
        setMode('register');
        setRegStep(3);
      } else {
        try { soundEngine.playKeyClick(); } catch (err) {}
        onAuthSuccess(user, token);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md cursor-pointer"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[#303248] bg-[#0c0d16] p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] cursor-default"
      >
        {/* Top Livery Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#e10600] via-[#00d2be] to-[#e10600]" />

        {/* Circular Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[#2d2f44] bg-[#181928] text-zinc-400 hover:border-[#e10600] hover:bg-[#e10600] hover:text-white transition-all cursor-pointer shadow-md z-30"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="bg-[#e10600] px-2.5 py-1 font-f1 text-lg text-white skew-f1 shadow-[0_0_15px_rgba(225,6,0,0.5)]">
            <span className="unskew-f1">FIA</span>
          </div>
          <div>
            <h2 className="font-f1 text-xl tracking-wider text-white">
              {mode === 'login'
                ? 'OFFICIAL DRIVER LOGIN'
                : regStep === 1
                ? 'DRIVER SUPERLICENCE REGISTRATION'
                : regStep === 2
                ? 'PIT WALL TELEMETRY VERIFICATION'
                : 'CONSTRUCTOR INDUCTION & LIVERY'}
            </h2>
            <p className="font-telemetry text-xs text-zinc-400">
              {mode === 'login'
                ? 'Sign in to access your championship telemetry & garage'
                : regStep === 1
                ? 'Step 1 of 3: Enter your official driver credentials'
                : regStep === 2
                ? 'Step 2 of 3: Verify 6-digit pit wall telemetry PIN'
                : 'Step 3 of 3: Choose your 2026 constructor & racing number'}
            </p>
          </div>
        </div>

        {/* Main Tab Switcher (Only visible when not on Step 2 or 3) */}
        {regStep === 1 && (
          <div className="mb-5 flex rounded-xl border border-[#252638] bg-[#12131f] p-1">
            <button
              type="button"
              onClick={() => handleSwitchMode('login')}
              className={`flex-1 rounded-lg py-2 font-f1 text-xs tracking-wider transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#e10600] text-white shadow-[0_0_12px_rgba(225,6,0,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              DRIVER LOGIN
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('register')}
              className={`flex-1 rounded-lg py-2 font-f1 text-xs tracking-wider transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#e10600] text-white shadow-[0_0_12px_rgba(225,6,0,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              APPLY FOR SUPERLICENCE
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#e10600] bg-[#e10600]/10 p-3 font-telemetry text-xs text-[#ff6b6b]">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE: OFFICIAL DRIVER LOGIN                                              */}
        {/* ========================================================================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            {/* Callsign or Email */}
            <div className="flex flex-col gap-1">
              <label className="font-telemetry text-[11px] font-bold text-zinc-400">
                DRIVER CALLSIGN OR PIT WALL EMAIL
              </label>
              <div className="flex items-center rounded-xl border border-[#252638] bg-[#141524] px-3.5 py-2.5 focus-within:border-[#00d2be]">
                <User className="mr-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. Verstappen or driver@keysprint.f1"
                  className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="font-telemetry text-[11px] font-bold text-zinc-400">
                TELEMETRY ACCESS PIN (PASSWORD)
              </label>
              <div className="flex items-center rounded-xl border border-[#252638] bg-[#141524] px-3.5 py-2.5 focus-within:border-[#00d2be]">
                <Key className="mr-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your access PIN"
                  className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#e10600] py-3 font-f1 text-sm tracking-wider text-white shadow-[0_0_20px_rgba(225,6,0,0.5)] transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE & ENTER PADDOCK'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="h-px flex-1 bg-[#202130]" />
              <span className="font-telemetry text-[10px] text-zinc-500">OR CONTINUE WITH</span>
              <div className="h-px flex-1 bg-[#202130]" />
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="flex items-center justify-center gap-3 rounded-xl border border-[#2e3048] bg-[#141626] py-2.5 font-telemetry text-xs font-bold text-zinc-200 transition-colors hover:border-[#00d2be] hover:bg-[#1a1c30] cursor-pointer disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>SIGN IN WITH GOOGLE</span>
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* REGISTER STEP 1: DRIVER CREDENTIALS FORM                                 */}
        {/* ========================================================================= */}
        {mode === 'register' && regStep === 1 && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-3.5">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-telemetry text-[11px] font-bold text-zinc-400">FIRST NAME</label>
                <div className="flex items-center rounded-xl border border-[#252638] bg-[#141524] px-3 py-2 focus-within:border-[#00d2be]">
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Max"
                    className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-telemetry text-[11px] font-bold text-zinc-400">LAST NAME</label>
                <div className="flex items-center rounded-xl border border-[#252638] bg-[#141524] px-3 py-2 focus-within:border-[#00d2be]">
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Verstappen"
                    className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Callsign (Username) */}
            <div className="flex flex-col gap-1">
              <label className="font-telemetry text-[11px] font-bold text-zinc-400">
                DRIVER CALLSIGN (RACING USERNAME)
              </label>
              <div className="flex items-center rounded-xl border border-[#252638] bg-[#141524] px-3 py-2 focus-within:border-[#00d2be]">
                <User className="mr-2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. SuperMax33"
                  className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="font-telemetry text-[11px] font-bold text-zinc-400">
                PIT WALL EMAIL (FOR OTP VERIFICATION)
              </label>
              <div className="flex items-center rounded-xl border border-[#252638] bg-[#141524] px-3 py-2 focus-within:border-[#00d2be]">
                <Mail className="mr-2 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@keysprint.f1"
                  className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-telemetry text-[11px] font-bold text-zinc-400">ACCESS PIN</label>
                <div className="flex items-center rounded-xl border border-[#252638] bg-[#141524] px-3 py-2 focus-within:border-[#00d2be]">
                  <Key className="mr-2 h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-telemetry text-[11px] font-bold text-zinc-400">CONFIRM PIN</label>
                <div className="flex items-center rounded-xl border border-[#252638] bg-[#141524] px-3 py-2 focus-within:border-[#00d2be]">
                  <Key className="mr-2 h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type PIN"
                    className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Transmit OTP Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#e10600] py-3 font-f1 text-sm tracking-wider text-white shadow-[0_0_20px_rgba(225,6,0,0.5)] transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'TRANSMITTING CODE...' : 'TRANSMIT FIA TELEMETRY CODE'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Google Sign-up Option */}
            <div className="flex items-center gap-3 my-0.5">
              <div className="h-px flex-1 bg-[#202130]" />
              <span className="font-telemetry text-[10px] text-zinc-500">OR REGISTER WITH</span>
              <div className="h-px flex-1 bg-[#202130]" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="flex items-center justify-center gap-3 rounded-xl border border-[#2e3048] bg-[#141626] py-2.5 font-telemetry text-xs font-bold text-zinc-200 transition-colors hover:border-[#00d2be] hover:bg-[#1a1c30] cursor-pointer disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>SIGN UP WITH GOOGLE (1-CLICK)</span>
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* REGISTER STEP 2: 6-DIGIT OTP VERIFICATION                                */}
        {/* ========================================================================= */}
        {mode === 'register' && regStep === 2 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="rounded-xl border border-[#202235] bg-[#121320] p-3 text-center">
              <p className="font-telemetry text-xs text-zinc-300">
                A 6-digit telemetry access PIN has been sent to:
              </p>
              <p className="mt-0.5 font-telemetry text-sm font-bold text-[#00d2be]">{email}</p>
            </div>

            {/* Dev helper code */}
            {devOtpHint && (
              <div className="flex items-center justify-between rounded-lg border border-[#00d2be]/40 bg-[#00d2be]/10 px-3 py-2 font-telemetry text-xs text-[#00d2be]">
                <span>🧪 Dev Test PIN: <strong>{devOtpHint}</strong></span>
                <button
                  type="button"
                  onClick={() => setOtpDigits(devOtpHint.split(''))}
                  className="rounded bg-[#00d2be] px-2 py-0.5 font-bold text-black hover:bg-white cursor-pointer"
                >
                  AUTO-FILL
                </button>
              </div>
            )}

            {/* 6 Segmented OTP Boxes */}
            <div className="flex justify-center gap-2.5 my-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={idx === 0 ? handleOtpPaste : undefined}
                  className="h-13 w-12 rounded-xl border border-[#303248] bg-[#141524] text-center font-f1 text-2xl font-bold text-white focus:border-[#00d2be] focus:shadow-[0_0_15px_rgba(0,210,190,0.3)] outline-none"
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#00d2be] py-3 font-f1 text-sm tracking-wider text-black font-bold shadow-[0_0_20px_rgba(0,210,190,0.4)] transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'VERIFYING CODE...' : 'VERIFY CODE & CHOOSE CONSTRUCTOR'}</span>
              <Check className="h-4 w-4" />
            </button>

            {/* Resend & Back options */}
            <div className="flex items-center justify-between font-telemetry text-xs text-zinc-400">
              <button
                type="button"
                onClick={() => setRegStep(1)}
                className="hover:text-white cursor-pointer"
              >
                ← Edit Driver Details
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpCountdown > 0 || loading}
                className="flex items-center gap-1 font-bold text-[#00d2be] hover:underline disabled:text-zinc-600 cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-3 w-3" />
                <span>
                  {otpCountdown > 0 ? `Resend Code in ${otpCountdown}s` : 'Resend Telemetry Code'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* REGISTER STEP 3: CONSTRUCTOR INDUCTION, RACING NUMBER & CALLSIGN          */}
        {/* ========================================================================= */}
        {mode === 'register' && regStep === 3 && (
          <form onSubmit={handleCompleteInduction} className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Callsign Customization */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="font-telemetry text-[11px] font-bold text-zinc-400">
                  CONFIRM RACING CALLSIGN
                </label>
                <div className="flex items-center rounded-xl border border-[#252638] bg-[#141524] px-3 py-2 focus-within:border-[#00d2be]">
                  <User className="mr-2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={inductionCallsign}
                    onChange={(e) => setInductionCallsign(e.target.value)}
                    placeholder="e.g. Verstappen"
                    className="w-full bg-transparent font-telemetry text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Permanent F1 Racing Number */}
              <div className="flex flex-col gap-1">
                <label className="font-telemetry text-[11px] font-bold text-zinc-400">
                  CAR # (2-99)
                </label>
                <div className="flex items-center rounded-xl border border-[#252638] bg-[#141524] px-3 py-2 focus-within:border-[#00d2be]">
                  <Hash className="mr-1.5 h-4 w-4 text-[#ffd700]" />
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={inductionNumber}
                    onChange={(e) => setInductionNumber(e.target.value)}
                    placeholder="44"
                    className="w-full bg-transparent font-f1 text-base font-bold text-white outline-none text-center"
                  />
                </div>
              </div>
            </div>

            {/* 11 2026 Constructor Grid Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="font-telemetry text-[11px] font-bold text-zinc-400">
                CHOOSE YOUR 2026 STARTING CONSTRUCTOR TEAM
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                {TEAM_LIST.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeam(team.id)}
                    className={`group relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      selectedTeam === team.id
                        ? 'border-[#00d2be] bg-[#181a2e] shadow-[0_0_15px_rgba(0,210,190,0.3)]'
                        : 'border-[#202130] bg-[#12131d] hover:border-[#383a54] hover:bg-[#151622]'
                    }`}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-f1 text-xs font-black text-white shadow-md"
                      style={{ backgroundColor: team.primaryColor }}
                    >
                      {team.code}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="truncate font-f1 text-xs text-white group-hover:text-[#00d2be]">
                        {team.name}
                      </span>
                      <span className="font-telemetry text-[9px] text-zinc-400">
                        {team.shortName}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm & Issue Superlicence Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#e10600] py-3 font-f1 text-sm tracking-wider text-white shadow-[0_0_25px_rgba(225,6,0,0.5)] transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {loading
                  ? 'ISSUING SUPERLICENCE...'
                  : `SIGN AS #${inductionNumber} & ENTER PADDOCK`}
              </span>
            </button>
          </form>
        )}

      </motion.div>
    </div>
  );
}
