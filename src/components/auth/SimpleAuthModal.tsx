import React, { useState, useEffect } from 'react';
import { SimpleUser } from '../../types/hotel';
import { APP_USERS } from '../../data/mockData';
import { 
  X, 
  Lock, 
  KeyRound, 
  User, 
  ShieldAlert, 
  Clock, 
  ShieldCheck, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';

interface SimpleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SimpleUser;
  users?: SimpleUser[];
  onSelectUser: (user: SimpleUser) => void;
  onUpdateUser?: (updatedUser: SimpleUser) => void;
}

export const SimpleAuthModal: React.FC<SimpleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users = APP_USERS,
  onSelectUser,
  onUpdateUser,
}) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'WARNING' | 'LOCKED' | 'BLOCKED' | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPin('');
      setShowPin(false);
      setErrorMessage(null);
      setErrorType(null);
    }
  }, [isOpen]);

  // Live countdown timer for 5-minute lockout
  useEffect(() => {
    if (!isOpen || !username.trim()) return;

    const targetUser = users.find(u => (u.username || '').toLowerCase() === username.trim().toLowerCase());
    if (targetUser?.lockedUntil) {
      const lockExpiry = new Date(targetUser.lockedUntil).getTime();
      const diffSec = Math.ceil((lockExpiry - Date.now()) / 1000);
      if (diffSec > 0) {
        setCountdownSeconds(diffSec);
        setErrorType('LOCKED');
        setErrorMessage(`Akun ditangguhkan sementara selama 5 menit karena salah PIN 3x.`);
      } else {
        setCountdownSeconds(null);
      }
    } else if (targetUser?.isBlocked) {
      setErrorType('BLOCKED');
      setErrorMessage(`Akun DIBLOKIR TOTAL oleh sistem. Hubungi Administrator IT untuk membuka izin akses di Manajemen Pengguna.`);
    } else {
      setCountdownSeconds(null);
    }
  }, [isOpen, username, users]);

  // Interval timer tick
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSeconds]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorType(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanUsername) {
      setErrorType('WARNING');
      setErrorMessage('Harap masukkan username Anda.');
      return;
    }

    if (!cleanPin || cleanPin.length !== 4) {
      setErrorType('WARNING');
      setErrorMessage('Harap masukkan 4-digit PIN resmi Anda.');
      return;
    }

    // 1. Find user by username
    const foundUser = users.find(u => (u.username || '').toLowerCase() === cleanUsername);

    if (!foundUser) {
      setErrorType('WARNING');
      setErrorMessage(`Username "@${cleanUsername}" tidak terdaftar. Hubungi Administrator IT.`);
      return;
    }

    // 2. Check if user is blocked by Admin
    if (foundUser.isBlocked) {
      setErrorType('BLOCKED');
      setErrorMessage('⛔ AKUN DIBLOKIR: Akun ini telah diblokir permanen karena kegagalan PIN berulang kali. Silakan hubungi tim Admin untuk membuka izin akses (Permit / Unblock) di menu Manajemen Pengguna.');
      return;
    }

    // 3. Check if user is currently locked (5 min cooldown)
    if (foundUser.lockedUntil) {
      const lockExpiry = new Date(foundUser.lockedUntil).getTime();
      const diffSec = Math.ceil((lockExpiry - Date.now()) / 1000);
      if (diffSec > 0) {
        setCountdownSeconds(diffSec);
        setErrorType('LOCKED');
        setErrorMessage(`Akun sedang dalam masa penangguhan (sisa waktu: ${Math.floor(diffSec / 60)}m ${diffSec % 60}s). Harap tunggu hingga timer selesai.`);
        return;
      }
    }

    // 4. Verify PIN
    if (foundUser.pin !== cleanPin) {
      const newAttempts = (foundUser.failedAttempts || 0) + 1;
      const remainingTries = 3 - newAttempts;

      if (newAttempts >= 3) {
        // Block / Lock Account
        const lockUntilIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const updatedLockedUser: SimpleUser = {
          ...foundUser,
          failedAttempts: 3,
          lockedUntil: lockUntilIso,
        };

        if (onUpdateUser) {
          onUpdateUser(updatedLockedUser);
        }

        setCountdownSeconds(300);
        setErrorType('LOCKED');
        setErrorMessage('⚠️ AKUN DITANGGUHKAN: Anda telah salah memasukkan PIN sebanyak 3 kali. Akun ditangguhkan selama 5 menit.');
      } else {
        // Warning with remaining attempts
        const updatedUserWithFailed: SimpleUser = {
          ...foundUser,
          failedAttempts: newAttempts,
        };

        if (onUpdateUser) {
          onUpdateUser(updatedUserWithFailed);
        }

        setErrorType('WARNING');
        setErrorMessage(`PIN yang Anda masukkan salah! Sisa percobaan: ${remainingTries} kali lagi sebelum akun ditangguhkan 5 menit.`);
      }
      return;
    }

    // 5. SUCCESSFUL LOGIN: Reset failed attempts & clear lockout
    const activeLoggedInUser: SimpleUser = {
      ...foundUser,
      failedAttempts: 0,
      lockedUntil: null,
      isBlocked: false,
    };

    if (onUpdateUser) {
      onUpdateUser(activeLoggedInUser);
    }

    onSelectUser(activeLoggedInUser);
    onClose();
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-5 sm:p-6 my-auto overflow-hidden">
        
        {/* Header Modal */}
        <div className="flex items-start justify-between pb-3.5 border-b border-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight">
                Autentikasi Akun Siaga IT
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Masukkan Username dan PIN untuk verifikasi
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="p-2.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-2 text-xs mb-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg ${currentUser.avatarColor || 'bg-blue-600'} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground block">Saat Ini Login:</span>
              <span className="font-bold text-foreground text-xs truncate block">{currentUser.name}</span>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
            currentUser.role === 'ADMIN'
              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
              : currentUser.role === 'BACKOFFICE' 
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30' 
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
          }`}>
            {currentUser.role}
          </span>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
          
          {/* Lockout Countdown Timer Alert */}
          {countdownSeconds !== null && countdownSeconds > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center gap-2.5 animate-pulse">
              <Clock className="w-5 h-5 shrink-0" />
              <div>
                <strong className="block text-xs">Akun Ditangguhkan Sementara</strong>
                <span className="text-[11px]">
                  Coba lagi dalam <span className="font-mono font-bold">{formatCountdown(countdownSeconds)}</span>
                </span>
              </div>
            </div>
          )}

          {/* Blocked by Admin Alert */}
          {errorType === 'BLOCKED' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="block text-xs">Akun Terblokir</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Warning Wrong PIN Alert */}
          {errorType === 'WARNING' && errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-[11px] font-medium leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Username Input */}
          <div>
            <label className="text-muted-foreground block mb-1 font-medium">
              Username *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMessage(null);
                  setErrorType(null);
                }}
                placeholder="Contoh: admin / budi.backoffice"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:border-blue-500 outline-none transition-colors font-medium"
                autoFocus
              />
            </div>
          </div>

          {/* 4-Digit PIN Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-muted-foreground font-medium">
                4-Digit PIN *
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPin ? 'Sembunyikan' : 'Lihat'}</span>
              </button>
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={4}
                required
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPin(val);
                  setErrorMessage(null);
                  setErrorType(null);
                }}
                placeholder="••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-xs font-mono font-bold tracking-widest text-foreground focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={countdownSeconds !== null && countdownSeconds > 0}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 ${
              countdownSeconds !== null && countdownSeconds > 0
                ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <span>Verifikasi & Masuk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
