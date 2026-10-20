import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, RotateCcw, X, Lock, ShieldCheck } from 'lucide-react';

interface SimpleOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onVerified: () => void;
}

export const SimpleOtpModal: React.FC<SimpleOtpModalProps> = ({
  isOpen,
  onClose,
  email,
  onVerified,
}) => {
  const [otp, setOtp] = useState(['5', '8', '2', '0', '', '']);
  const [cooldown, setCooldown] = useState(55);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (cooldown > 0 && isOpen) {
      const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown, isOpen]);

  if (!isOpen) return null;

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const copy = [...otp];
    copy[index] = value;
    setOtp(copy);

    if (value && index < 5) {
      document.getElementById(`simple-otp-${index + 1}`)?.focus();
    }
  };

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onVerified();
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-card border border-border shadow-lg p-5">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center mx-auto mb-2">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Verifikasi OTP Anti-Spam
          </h3>
          <p className="text-xs text-muted-foreground">
            Kode 6-digit dikirimkan ke <strong>{email || 'budi.it@hotel.com'}</strong>
          </p>
        </div>

        {/* Anti-spam feature highlight */}
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 mb-4 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Garansi Lolos Folder Spam (Inbox Placement 99%)</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Menggunakan protokol <strong>DKIM 2048-bit</strong>, <strong>SPF</strong>, dan <strong>DMARC</strong> aktif sesuai standar terbaru Google & Yahoo Mail.
          </p>
        </div>

        {/* 6 Digit Inputs */}
        <div className="flex justify-center gap-2 mb-4">
          {otp.map((d, i) => (
            <input
              key={i}
              id={`simple-otp-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              className="w-10 h-12 text-center text-lg font-bold font-mono rounded-lg border border-border bg-background focus:border-blue-500 outline-none"
            />
          ))}
        </div>

        {/* Cooldown */}
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
          <span>Kirim ulang kode?</span>
          {cooldown > 0 ? (
            <span className="font-mono text-amber-400">Tunggu {cooldown} detik</span>
          ) : (
            <button
              onClick={() => { setCooldown(60); setOtp(['', '', '', '', '', '']); }}
              className="text-blue-500 font-semibold hover:underline"
            >
              Kirim Ulang Sekarang
            </button>
          )}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              Memverifikasi...
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              Verifikasi & Masuk
            </>
          )}
        </button>

      </div>
    </div>
  );
};
