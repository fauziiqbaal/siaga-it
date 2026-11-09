import React, { useState, useEffect } from 'react';
import type { SimpleUser } from '../../types/hotel';
import { APP_USERS } from '../../data/mockData';
import { Badge, Btn, Card, Field, TextInput } from '../ui/kit';

interface LoginViewProps {
  users?: SimpleUser[];
  onLogin: (user: SimpleUser) => void;
  onUpdateUser?: (updatedUser: SimpleUser) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users = APP_USERS,
  onLogin,
  onUpdateUser,
  isDark = true,
  onToggleTheme,
}) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'WARNING' | 'LOCKED' | 'BLOCKED' | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // Hitung mundur penangguhan 5 menit jika user sedang kena cooldown
  useEffect(() => {
    if (!username.trim()) return;

    const targetUser = users.find((u) => (u.username || '').toLowerCase() === username.trim().toLowerCase());
    if (targetUser?.lockedUntil) {
      const lockExpiry = new Date(targetUser.lockedUntil).getTime();
      const diffSec = Math.ceil((lockExpiry - Date.now()) / 1000);
      if (diffSec > 0) {
        setCountdownSeconds(diffSec);
        setErrorType('LOCKED');
        setErrorMessage('Akun ditangguhkan sementara selama 5 menit karena salah PIN 3x.');
      } else {
        setCountdownSeconds(null);
      }
    } else if (targetUser?.isBlocked) {
      setErrorType('BLOCKED');
      setErrorMessage('Akun diblokir sistem. Hubungi Administrator IT.');
    } else {
      setCountdownSeconds(null);
    }
  }, [username, users]);

  // Interval timer tick
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSeconds]);

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      setErrorMessage('Harap masukkan 4 digit PIN resmi Anda.');
      return;
    }

    // 1. Cari user berdasarkan username
    const foundUser = users.find((u) => (u.username || '').toLowerCase() === cleanUsername);

    if (!foundUser) {
      setErrorType('WARNING');
      setErrorMessage(`Username "@${cleanUsername}" tidak terdaftar. Hubungi Administrator IT.`);
      return;
    }

    // 2. Cek apakah diblokir
    if (foundUser.isBlocked) {
      setErrorType('BLOCKED');
      setErrorMessage('Akun ini diblokir permanen. Hubungi Admin IT.');
      return;
    }

    // 3. Cek cooldown 5 menit
    if (foundUser.lockedUntil) {
      const lockExpiry = new Date(foundUser.lockedUntil).getTime();
      const diffSec = Math.ceil((lockExpiry - Date.now()) / 1000);
      if (diffSec > 0) {
        setCountdownSeconds(diffSec);
        setErrorType('LOCKED');
        setErrorMessage(`Akun ditangguhkan sementara (sisa waktu: ${Math.floor(diffSec / 60)}m ${diffSec % 60}s).`);
        return;
      }
    }

    // 4. Verifikasi PIN
    if (foundUser.pin !== cleanPin) {
      const newAttempts = (foundUser.failedAttempts || 0) + 1;
      const remainingTries = 3 - newAttempts;

      if (newAttempts >= 3) {
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
        setErrorMessage('Salah memasukkan PIN sebanyak 3 kali. Akun ditangguhkan selama 5 menit.');
      } else {
        const updatedUserWithFailed: SimpleUser = {
          ...foundUser,
          failedAttempts: newAttempts,
        };

        if (onUpdateUser) {
          onUpdateUser(updatedUserWithFailed);
        }

        setErrorType('WARNING');
        setErrorMessage(`PIN salah. Sisa percobaan: ${remainingTries} kali lagi.`);
      }
      return;
    }

    // 5. Berhasil login
    const activeLoggedInUser: SimpleUser = {
      ...foundUser,
      failedAttempts: 0,
      lockedUntil: null,
      isBlocked: false,
    };

    if (onUpdateUser) {
      onUpdateUser(activeLoggedInUser);
    }

    onLogin(activeLoggedInUser);
  };

  const handleUseTestAccount = () => {
    setUsername('usertest');
    setPin('6666');
    setErrorMessage(null);
    setErrorType(null);
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-background text-foreground px-4 py-6 sm:py-10">
      {/* Top Bar: Brand & Theme Toggle */}
      <header className="mx-auto w-full max-w-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight text-foreground">Siaga IT</span>
          <Badge tone="blue">Operasional Coliving</Badge>
        </div>
        {onToggleTheme && (
          <Btn variant="ghost" onClick={onToggleTheme} className="min-h-[32px] px-2.5 text-[11px]">
            {isDark ? 'Mode Terang' : 'Mode Gelap'}
          </Btn>
        )}
      </header>

      {/* Main Login Card */}
      <main className="mx-auto w-full max-w-md my-auto pt-4 pb-8">
        <Card className="p-4 sm:p-6 border border-border shadow-sm space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-base font-bold text-foreground">Masuk ke Sistem</h1>
              <Badge tone="neutral">Sesi Wajib</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Sesi belum aktif. Masukkan username dan 4-digit PIN akun untuk memulai inspeksi atau manajemen properti.
            </p>
          </div>

          {/* Lockout alert */}
          {countdownSeconds !== null && countdownSeconds > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-200">
              <p className="font-bold">Akun ditangguhkan sementara</p>
              <p className="mt-0.5">
                Coba lagi dalam <span className="font-mono font-bold">{formatCountdown(countdownSeconds)}</span>
              </p>
            </div>
          )}

          {/* Blocked alert */}
          {errorType === 'BLOCKED' && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 text-[11px] text-rose-800 dark:text-rose-200">
              <p className="font-bold">Akun terblokir</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          )}

          {/* Warning alert */}
          {errorType === 'WARNING' && errorMessage && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 text-[11px] text-rose-800 dark:text-rose-200">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <Field label="Username">
              <TextInput
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMessage(null);
                  setErrorType(null);
                }}
                placeholder="usertest / budi.backoffice"
                autoFocus
              />
            </Field>

            <Field label="4-Digit PIN">
              <TextInput
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setErrorMessage(null);
                  setErrorType(null);
                }}
                placeholder="••••"
              />
            </Field>

            <Btn
              type="submit"
              variant="primary"
              block
              disabled={countdownSeconds !== null && countdownSeconds > 0}
              className="min-h-[42px] mt-2 font-semibold text-sm"
            >
              Masuk ke aplikasi
            </Btn>
          </form>
        </Card>
      </main>

      {/* Footer Info */}
      <footer className="mx-auto w-full max-w-md text-center text-[10px] text-muted-foreground">
        Siaga IT · Offline-first &amp; verifikasi data tersimpan di perangkat lokal
      </footer>
    </div>
  );
};

