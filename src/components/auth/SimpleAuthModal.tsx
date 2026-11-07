import React, { useState, useEffect } from 'react';
import type { SimpleUser } from '../../types/hotel';
import { APP_USERS } from '../../data/mockData';
import { Badge, Btn, Field, Sheet, TextInput } from '../ui/kit';

interface SimpleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SimpleUser | null;
  users?: SimpleUser[];
  onSelectUser: (user: SimpleUser) => void;
  onUpdateUser?: (updatedUser: SimpleUser) => void;
  isMandatory?: boolean;
  onLogout?: () => void;
}

export const SimpleAuthModal: React.FC<SimpleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users = APP_USERS,
  onSelectUser,
  onUpdateUser,
  isMandatory = false,
  onLogout,
}) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'WARNING' | 'LOCKED' | 'BLOCKED' | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // Reset form saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPin('');
      setErrorMessage(null);
      setErrorType(null);
    }
  }, [isOpen]);

  // Hitung mundur penangguhan 5 menit
  useEffect(() => {
    if (!isOpen || !username.trim()) return;

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
      setErrorMessage('Akun diblokir sistem. Hubungi Administrator IT untuk membuka izin akses di Manajemen Pengguna.');
    } else {
      setCountdownSeconds(null);
    }
  }, [isOpen, username, users]);

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

  if (!isOpen) return null;

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
      setErrorMessage('Akun ini diblokir permanen karena kegagalan PIN berulang kali. Hubungi Admin di Manajemen Pengguna.');
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

    onSelectUser(activeLoggedInUser);
    onClose();
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const roleTone = currentUser
    ? currentUser.role === 'ADMIN'
      ? 'blue'
      : currentUser.role === 'BACKOFFICE'
        ? 'amber'
        : 'neutral'
    : 'neutral';

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      preventClose={isMandatory}
      title={isMandatory ? 'Login Siaga IT' : 'Autentikasi akun'}
      subtitle={
        isMandatory
          ? 'Masukkan username dan 4-digit PIN akun untuk memulai sesi.'
          : 'Masukkan username dan PIN untuk verifikasi login atau ganti akun.'
      }
      footer={
        <div className="flex gap-2">
          {!isMandatory && (
            <Btn block onClick={onClose}>
              Batal
            </Btn>
          )}
          <Btn
            block
            variant="primary"
            onClick={() => handleLoginSubmit()}
            disabled={countdownSeconds !== null && countdownSeconds > 0}
          >
            {isMandatory ? 'Masuk ke aplikasi' : 'Verifikasi & ganti akun'}
          </Btn>
        </div>
      }
    >
      <form onSubmit={handleLoginSubmit} className="space-y-3">
        {/* Info akun aktif saat ini jika ada */}
        {currentUser ? (
          <div className="rounded-lg border border-border p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Saat ini login:</span>
              <Badge tone={roleTone}>{currentUser.role}</Badge>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-foreground">{currentUser.name}</p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-muted-foreground font-mono">@{currentUser.username || 'user'}</span>
              {onLogout && !isMandatory && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Keluar dari sesi ini
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5 text-[11px] text-blue-800 dark:text-blue-200">
            <p className="font-bold">Sesi belum aktif</p>
            <p className="mt-0.5 text-[10px] leading-snug">
              Akun uji teknisi: username <code className="font-mono font-bold">usertest</code> · PIN <code className="font-mono font-bold">6666</code>
            </p>
          </div>
        )}

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
      </form>
    </Sheet>
  );
};
