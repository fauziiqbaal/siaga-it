import React, { useState } from 'react';
import { SimpleUser, UserRole, AppModuleId } from '../../types/hotel';
import { APP_MODULES, getDefaultPermissionsForRole } from '../../data/mockData';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Wrench,
  Check,
  CheckSquare,
  Square,
  Search,
  Filter,
  Edit2,
  Trash2,
  Lock,
  Mail,
  Phone,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  X,
  Layers,
  Building2,
  LayoutDashboard,
  Calendar,
  Video,
  Server,
  AlertCircle,
  Award,
  Camera,
  UserCog,
  CheckCircle2,
  ArrowRightLeft,
  ShieldAlert,
  Clock,
  Unlock
} from 'lucide-react';

interface UserManagementViewProps {
  users: SimpleUser[];
  currentUser: SimpleUser;
  onSelectUser: (user: SimpleUser) => void;
  onAddUser: (newUser: SimpleUser) => void;
  onUpdateUser: (updatedUser: SimpleUser) => void;
  onDeleteUser: (userId: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenAuth?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  onSelectUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onNavigateTab,
  onOpenAuth,
}) => {
  // Check if current user is allowed to access User Management
  const hasAccess = currentUser.role === 'ADMIN' || (currentUser.role === 'BACKOFFICE' && currentUser.permissions.includes('user_management'));

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State (Add or Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    username: string;
    name: string;
    role: UserRole;
    roleTitle: string;
    email: string;
    phone: string;
    pin: string;
    isActive: boolean;
    permissions: AppModuleId[];
    avatarColor: string;
  }>({
    username: '',
    name: '',
    role: 'TEKNISI',
    roleTitle: '',
    email: '',
    phone: '',
    pin: '',
    isActive: true,
    permissions: getDefaultPermissionsForRole('TEKNISI'),
    avatarColor: 'bg-emerald-600',
  });

  // Switch role template helper
  const applyRoleTemplate = (role: UserRole) => {
    const defaultPerms = getDefaultPermissionsForRole(role);
    setFormData(prev => ({
      ...prev,
      role,
      roleTitle: prev.roleTitle || (role === 'ADMIN' ? 'Super Administrator' : role === 'BACKOFFICE' ? 'IT Ops Backoffice' : 'Field Technician'),
      permissions: defaultPerms,
      avatarColor: role === 'ADMIN' ? 'bg-indigo-600' : role === 'BACKOFFICE' ? 'bg-blue-600' : 'bg-emerald-600',
    }));
  };

  // Unblock / Permit user access (Reset failed attempts and lockout)
  const handlePermitUser = (user: SimpleUser) => {
    const unblocked: SimpleUser = {
      ...user,
      isBlocked: false,
      lockedUntil: null,
      failedAttempts: 0,
    };
    onUpdateUser(unblocked);
    if (currentUser.id === user.id) {
      onSelectUser(unblocked);
    }
    alert(`✅ Akses untuk ${user.name} (@${user.username}) berhasil diizinkan kembali (Permit). Percobaan PIN direset menjadi 0.`);
  };

  // Toggle single permission checkbox
  const handleTogglePermission = (modId: AppModuleId) => {
    // Enforcement rule: Teknisi CANNOT have user_management permission
    if (formData.role === 'TEKNISI' && modId === 'user_management') {
      alert('Peran Teknisi tidak diizinkan mengakses modul Manajemen Pengguna. Ganti peran ke Backoffice jika diperlukan.');
      return;
    }

    setFormData(prev => {
      const exists = prev.permissions.includes(modId);
      if (exists) {
        return {
          ...prev,
          permissions: prev.permissions.filter(p => p !== modId),
        };
      } else {
        return {
          ...prev,
          permissions: [...prev.permissions, modId],
        };
      }
    });
  };

  // Select all or clear all permissions
  const handleSelectAllPermissions = () => {
    if (formData.role === 'TEKNISI') {
      // All modules EXCEPT user_management
      const allExceptUserMgmt = APP_MODULES.filter(m => m.id !== 'user_management').map(m => m.id);
      setFormData(prev => ({ ...prev, permissions: allExceptUserMgmt }));
    } else {
      setFormData(prev => ({ ...prev, permissions: APP_MODULES.map(m => m.id) }));
    }
  };

  const handleClearPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
  };

  // Open modal for new user
  const handleOpenAddModal = () => {
    setEditingUserId(null);
    setFormData({
      username: '',
      name: '',
      role: 'TEKNISI',
      roleTitle: 'Teknisi Onboarding & QC',
      email: '',
      phone: '',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      isActive: true,
      permissions: getDefaultPermissionsForRole('TEKNISI'),
      avatarColor: 'bg-emerald-600',
    });
    setIsModalOpen(true);
  };

  // Open modal for editing user
  const handleOpenEditModal = (user: SimpleUser) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username || user.name.toLowerCase().replace(/\s+/g, '.'),
      name: user.name,
      role: user.role,
      roleTitle: user.roleTitle || (user.role === 'ADMIN' ? 'Super Administrator' : user.role === 'BACKOFFICE' ? 'Backoffice IT Lead' : 'Field Technician'),
      email: user.email || '',
      phone: user.phone || '',
      pin: user.pin,
      isActive: user.isActive,
      permissions: [...user.permissions],
      avatarColor: user.avatarColor || (user.role === 'ADMIN' ? 'bg-indigo-600' : user.role === 'BACKOFFICE' ? 'bg-blue-600' : 'bg-emerald-600'),
    });
    setIsModalOpen(true);
  };

  // Save user (create or update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama pengguna wajib diisi!');
      return;
    }
    if (!formData.username.trim()) {
      alert('Username wajib diisi untuk login akun!');
      return;
    }
    
    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '');
    const duplicate = users.find(u => (u.username || '').toLowerCase() === cleanUsername && u.id !== editingUserId);
    if (duplicate) {
      alert(`Username "@${cleanUsername}" sudah digunakan oleh ${duplicate.name}. Harap gunakan username yang berbeda.`);
      return;
    }

    if (!formData.pin.trim() || formData.pin.length !== 4) {
      alert('PIN harus terdiri dari 4 digit angka!');
      return;
    }

    if (editingUserId) {
      // Update existing
      const existing = users.find(u => u.id === editingUserId);
      const isMasterAdmin = existing?.username === 'admin';
      const finalRole = isMasterAdmin ? 'ADMIN' : formData.role;
      const finalPermissions = isMasterAdmin
        ? APP_MODULES.map(m => m.id)
        : (formData.role === 'TEKNISI' 
            ? formData.permissions.filter(p => p !== 'user_management')
            : formData.permissions);

      const updated: SimpleUser = {
        id: editingUserId,
        username: cleanUsername,
        name: formData.name.trim(),
        role: finalRole,
        roleTitle: formData.roleTitle.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        pin: formData.pin.trim(),
        isActive: isMasterAdmin ? true : formData.isActive,
        permissions: finalPermissions,
        avatarColor: formData.avatarColor,
        failedAttempts: existing?.failedAttempts || 0,
        lockedUntil: existing?.lockedUntil || null,
        isBlocked: isMasterAdmin ? false : (existing?.isBlocked || false),
      };
      onUpdateUser(updated);

      // If updating currently logged in user, refresh context
      if (currentUser.id === editingUserId) {
        onSelectUser(updated);
      }
    } else {
      // Create new
      const finalPermissions = formData.role === 'TEKNISI' 
        ? formData.permissions.filter(p => p !== 'user_management')
        : formData.permissions;

      const newUser: SimpleUser = {
        id: `u-${Date.now()}`,
        username: cleanUsername,
        name: formData.name.trim(),
        role: formData.role,
        roleTitle: formData.roleTitle.trim() || (formData.role === 'ADMIN' ? 'Super Administrator' : formData.role === 'BACKOFFICE' ? 'Backoffice IT Lead' : 'Field Technician'),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        pin: formData.pin.trim(),
        isActive: formData.isActive,
        permissions: finalPermissions,
        avatarColor: formData.avatarColor,
        createdAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        failedAttempts: 0,
        lockedUntil: null,
        isBlocked: false,
      };
      onAddUser(newUser);
    }

    setIsModalOpen(false);
  };

  // Toggle user active status
  const handleToggleActive = (user: SimpleUser) => {
    if (user.username === 'admin') {
      alert('Akun master Administrator tidak dapat dinonaktifkan.');
      return;
    }
    if (user.id === currentUser.id) {
      alert('Anda tidak dapat menonaktifkan akun yang sedang aktif digunakan.');
      return;
    }
    onUpdateUser({
      ...user,
      isActive: !user.isActive,
    });
  };

  // Delete user
  const handleDelete = (user: SimpleUser) => {
    if (user.username === 'admin') {
      alert('Akun master Administrator tidak dapat dihapus.');
      return;
    }
    if (user.id === currentUser.id) {
      alert('Anda tidak dapat menghapus akun yang sedang aktif digunakan.');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus akun "${user.name}"?`)) {
      onDeleteUser(user.id);
    }
  };

  // RESTRICTED ACCESS SCREEN FOR TEKNISI OR UNAUTHORIZED USERS
  if (!hasAccess) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-card border border-rose-500/20 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              Akses Terbatas: Khusus Backoffice
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Akun Anda saat ini tercatat sebagai <strong className="text-foreground">{currentUser.name}</strong> dengan peran <span className="px-2 py-0.5 rounded font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">{currentUser.role}</span>.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              Peran Teknisi difokuskan untuk inspeksi QC lapangan (Wi-Fi, CCTV, Smartlock, TV) dan tidak memiliki izin mengakses modul Manajemen Pengguna & Hak Akses.
            </p>
          </div>

          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={() => onNavigateTab('evaluation')}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Kembali ke Penilaian QC
            </button>
            <button
              onClick={onOpenAuth}
              className="w-full py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-colors"
            >
              Buka Form Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered users
  const filteredUsers = users.filter(user => {
    const matchQuery = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.roleTitle && user.roleTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      user.pin.includes(searchQuery);

    const matchRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && user.isActive) ||
      (statusFilter === 'INACTIVE' && !user.isActive);

    return matchQuery && matchRole && matchStatus;
  });

  // Role counters
  const totalAdmin = users.filter(u => u.role === 'ADMIN').length;
  const totalBackoffice = users.filter(u => u.role === 'BACKOFFICE').length;
  const totalTeknisi = users.filter(u => u.role === 'TEKNISI').length;
  const totalActive = users.filter(u => u.isActive).length;

  // Icon mapping for modules
  const getModuleIcon = (id: AppModuleId) => {
    switch (id) {
      case 'dashboard': return LayoutDashboard;
      case 'calendar': return Calendar;
      case 'property': return Building2;
      case 'evaluation': return CheckSquare;
      case 'cctv': return Video;
      case 'devices': return Server;
      case 'issues': return AlertCircle;
      case 'readiness': return Award;
      case 'evidence': return Camera;
      case 'user_management': return UserCog;
      default: return Layers;
    }
  };

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. TOP HEADER & METRIC CARDS                             */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
              Manajemen Pengguna & Hak Akses
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Admin & Backoffice
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola akun tim Siaga IT, peran operasional (Admin, Backoffice & Teknisi), dan izin per modul aplikasi.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-card border border-border shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Total Pengguna</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-foreground">{users.length}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {totalActive} Aktif
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-card border border-indigo-500/20 bg-indigo-500/5 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs mb-1">
            <span className="font-semibold">Role Admin</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-foreground">{totalAdmin}</span>
            <span className="text-[10px] text-muted-foreground">Super Administrator</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-card border border-blue-500/20 bg-blue-500/5 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs mb-1">
            <span className="font-semibold">Role Backoffice</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-foreground">{totalBackoffice}</span>
            <span className="text-[10px] text-muted-foreground">Lead & Audit Operasional</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-card border border-emerald-500/20 bg-emerald-500/5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs mb-1">
            <span className="font-semibold">Role Teknisi</span>
            <Wrench className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-foreground">{totalTeknisi}</span>
            <span className="text-[10px] text-muted-foreground">Field Ops & QC Lapangan</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CURRENT ACTIVE ACCOUNT NOTIFICATION STRIP             */}
      {/* ======================================================== */}
      <div className="px-3.5 py-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <span className="text-foreground font-semibold">
              Sedang login sebagai: <span className="font-bold">{currentUser.name}</span>
            </span>
            <span className="text-muted-foreground text-[11px] block sm:inline sm:ml-2">
              Peran: <strong className="text-blue-600 dark:text-blue-400">{currentUser.role}</strong> ({currentUser.permissions.length} dari {APP_MODULES.length} modul aktif)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
              title="Buka form login untuk masuk menggunakan username & PIN"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Buka Form Login (Username + PIN)</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SEARCH & FILTERS BAR                                  */}
      {/* ======================================================== */}
      <div className="p-3 rounded-xl bg-card border border-border shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, jabatan, atau PIN pengguna..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:border-blue-500 outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground hidden sm:inline">Peran:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs focus:border-blue-500 outline-none font-medium"
            >
              <option value="ALL">Semua Peran</option>
              <option value="ADMIN">Admin ({totalAdmin})</option>
              <option value="BACKOFFICE">Backoffice ({totalBackoffice})</option>
              <option value="TEKNISI">Teknisi ({totalTeknisi})</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs focus:border-blue-500 outline-none font-medium"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif ({totalActive})</option>
              <option value="INACTIVE">Non-Aktif ({users.length - totalActive})</option>
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. USERS TABLE / CARD LIST                               */}
      {/* ======================================================== */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Pengguna</th>
                <th className="py-2.5 px-3">Peran (Role)</th>
                <th className="py-2.5 px-3">Izin Modul Tercentang</th>
                <th className="py-2.5 px-3">PIN Cepat</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Tidak ditemukan data pengguna yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  const isBackoffice = user.role === 'BACKOFFICE';
                  const hasUserMgmt = user.permissions.includes('user_management');

                  return (
                    <tr 
                      key={user.id}
                      className={`hover:bg-muted/40 transition-colors ${
                        isCurrent ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      {/* Name & Contact */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl ${user.avatarColor || 'bg-blue-600'} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs`}>
                            {user.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-foreground truncate">
                                {user.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                                @{user.username}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold font-mono bg-blue-600 text-white">
                                  AKUN SAYA
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {user.roleTitle || (isBackoffice ? 'Backoffice IT Lead' : 'Field Technician')}
                            </div>
                            {(user.email || user.phone) && (
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 mt-0.5">
                                {user.email && (
                                  <span className="flex items-center gap-0.5 truncate">
                                    <Mail className="w-2.5 h-2.5" />
                                    {user.email}
                                  </span>
                                )}
                                {user.phone && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="w-2.5 h-2.5" />
                                    {user.phone}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {user.role === 'ADMIN' ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Administrator</span>
                          </div>
                        ) : isBackoffice ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Backoffice</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Teknisi</span>
                          </div>
                        )}
                      </td>

                      {/* Permissions Pills */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-foreground">
                              {user.permissions.length} / {APP_MODULES.length}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              modul diizinkan
                            </span>
                          </div>

                          {/* Quick visual pills */}
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {hasUserMgmt ? (
                              <span 
                                title="Bisa mengakses & mengelola user management"
                                className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              >
                                User Mgmt: YA
                              </span>
                            ) : (
                              <span 
                                title="Tidak bisa mengakses menu User Management"
                                className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-muted text-muted-foreground border border-border"
                              >
                                User Mgmt: TIDAK
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-muted text-muted-foreground border border-border">
                              {user.permissions.includes('evaluation') ? 'QC Kamar' : ''}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-muted text-muted-foreground border border-border">
                              {user.permissions.includes('cctv') ? 'CCTV' : ''}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-muted text-muted-foreground border border-border">
                              {user.permissions.includes('devices') ? 'Perangkat' : ''}
                            </span>
                            {user.permissions.length > 4 && (
                              <span className="text-[9px] text-muted-foreground font-mono self-center">
                                +{user.permissions.length - 4} lainnya
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* PIN Masked */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <KeyRound className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span className="font-bold tracking-widest text-[11px]">••••</span>
                        </div>
                      </td>

                      {/* Status & Keamanan */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {user.isBlocked ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                            <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>DIBLOKIR</span>
                          </div>
                        ) : user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now() ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0 animate-pulse" />
                            <span>COOLDOWN 5M</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={isCurrent}
                            title={isCurrent ? 'Tidak dapat menonaktifkan akun sendiri' : 'Klik untuk mengubah status'}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                              user.isActive
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30'
                            } ${isCurrent ? 'opacity-80 cursor-not-allowed' : 'hover:opacity-80'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                            <span>{user.isActive ? 'Aktif' : 'Non-Aktif'}</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Unblock / Permit Action if user is blocked or locked */}
                          {(user.isBlocked || (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now())) && (
                            <button
                              onClick={() => handlePermitUser(user)}
                              className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold transition-colors flex items-center gap-1 shadow-2xs"
                              title={`Buka blokir & reset PIN untuk @${user.username}`}
                            >
                              <Unlock className="w-3 h-3 text-emerald-500" />
                              <span>Buka Blokir (Permit)</span>
                            </button>
                          )}

                          {/* Edit permissions & user */}
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit Data & Hak Akses Modul"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg border border-border bg-background transition-colors ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                                : 'text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30'
                            }`}
                            title={isCurrent ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. ADD / EDIT USER MODAL WITH PERMISSION CHECKBOXES      */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {editingUserId ? 'Edit Akun & Hak Akses' : 'Tambah Pengguna Baru'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Konfigurasi peran dan pilih modul yang dapat dibuka dengan mencentang kotak.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              
              {/* SECTION 1: PROFIL & PERAN */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>1. Informasi Profil & Peran</span>
                </h4>

                {/* Role Switcher Cards */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Pilih Peran Utama (Role):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Admin Option */}
                    <div
                      onClick={() => applyRoleTemplate('ADMIN')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.role === 'ADMIN'
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Admin</span>
                        </div>
                        {formData.role === 'ADMIN' && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Super Administrator. Hak akses penuh seluruh modul & kelola peran tim.
                      </p>
                    </div>

                    {/* Backoffice Option */}
                    <div
                      onClick={() => applyRoleTemplate('BACKOFFICE')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.role === 'BACKOFFICE'
                          ? 'border-blue-500 bg-blue-500/10 shadow-xs'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>Backoffice</span>
                        </div>
                        {formData.role === 'BACKOFFICE' && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Audit & Operasional. Laporan kesiapan resmi, hapus gedung & modul terpilih.
                      </p>
                    </div>

                    {/* Teknisi Option */}
                    <div
                      onClick={() => applyRoleTemplate('TEKNISI')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.role === 'TEKNISI'
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Teknisi (Field)</span>
                        </div>
                        {formData.role === 'TEKNISI' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Field Ops. Inspeksi QC, perangkat, CCTV & kendala lapangan.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security Lockout Banner if Editing a Blocked or Locked User */}
                {editingUserId && (() => {
                  const editingUser = users.find(u => u.id === editingUserId);
                  if (editingUser?.isBlocked || (editingUser?.lockedUntil && new Date(editingUser.lockedUntil).getTime() > Date.now())) {
                    return (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>Status: Akun ini sedang {editingUser.isBlocked ? 'DIBLOKIR TOTAL' : 'DITANGGUHKAN SEMENTARA'}.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePermitUser(editingUser)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Buka Blokir (Permit)</span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Profile Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Username Login (Disetting oleh Backoffice) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-foreground">
                        Username Login *
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        (Settingan Backoffice)
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-xs">
                        @
                      </span>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                        placeholder="e.g. rian.teknisi"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono font-bold focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rian Saputra"
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Jabatan / Posisi Tim
                    </label>
                    <input
                      type="text"
                      value={formData.roleTitle}
                      onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                      placeholder={formData.role === 'BACKOFFICE' ? 'IT Lead Backoffice' : 'Field Technician'}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. rian@siagait.com"
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      No. Handphone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 0812-3456-7890"
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      4-Digit PIN Cepat *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={4}
                        required
                        value={formData.pin}
                        onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                        placeholder="1234"
                        className="w-24 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono font-bold tracking-widest text-center focus:border-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pin: Math.floor(1000 + Math.random() * 9000).toString() })}
                        className="px-2 py-1 rounded-md border border-border bg-muted text-[10px] font-mono hover:text-foreground transition-colors"
                      >
                        Acak PIN
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-foreground">Status Akun Aktif</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 2: HAK AKSES FITUR (CENTANG-CENTANG) */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-border">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                    <span>2. Hak Akses Modul ({formData.permissions.length} dari {APP_MODULES.length} Tercentang)</span>
                  </h4>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyRoleTemplate(formData.role)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors flex items-center gap-1"
                      title="Kembalikan ke rekomendasi standar peran saat ini"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Reset Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleClearPermissions}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {/* Helper notice if role is Teknisi */}
                {formData.role === 'TEKNISI' && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Ketentuan Peran Teknisi:</strong> Modul <em>Manajemen Pengguna</em> otomatis dinonaktifkan untuk peran Teknisi sesuai kebijakan sistem. Modul lapangan lainnya dapat dicentang bebas sesuai kebutuhan.
                    </div>
                  </div>
                )}

                {/* Checkboxes Grouped by Category */}
                <div className="space-y-3">
                  
                  {/* Category 1: Portfolio & Cross-Property */}
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      A. Menu Portofolio & Perencanaan
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {APP_MODULES.filter(m => m.category === 'PORTFOLIO').map(module => {
                        const checked = formData.permissions.includes(module.id);
                        const Icon = getModuleIcon(module.id);
                        return (
                          <label
                            key={module.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                              checked 
                                ? 'bg-blue-500/10 border-blue-500/40 text-foreground shadow-2xs' 
                                : 'bg-card border-border hover:bg-muted/30 text-muted-foreground'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(module.id)}
                              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Icon className={`w-3.5 h-3.5 ${checked ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                <span className={`font-semibold ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {module.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                {module.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category 2: Property-Specific QC & Devices */}
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      B. Operasional QC Properti (Field Ops 4 Pilar)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {APP_MODULES.filter(m => m.category === 'PROPERTY_QC').map(module => {
                        const checked = formData.permissions.includes(module.id);
                        const Icon = getModuleIcon(module.id);
                        return (
                          <label
                            key={module.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                              checked 
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-foreground shadow-2xs' 
                                : 'bg-card border-border hover:bg-muted/30 text-muted-foreground'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(module.id)}
                              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Icon className={`w-3.5 h-3.5 ${checked ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                <span className={`font-semibold ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {module.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                {module.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category 3: Admin & User Management */}
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      C. Administrasi Sistem & Pengguna
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {APP_MODULES.filter(m => m.category === 'ADMIN').map(module => {
                        const checked = formData.permissions.includes(module.id);
                        const isTeknisi = formData.role === 'TEKNISI';
                        const Icon = getModuleIcon(module.id);

                        return (
                          <label
                            key={module.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                              isTeknisi 
                                ? 'opacity-50 bg-muted/30 border-border cursor-not-allowed'
                                : checked 
                                ? 'bg-blue-500/10 border-blue-500/40 text-foreground shadow-2xs cursor-pointer' 
                                : 'bg-card border-border hover:bg-muted/30 text-muted-foreground cursor-pointer'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isTeknisi}
                              checked={isTeknisi ? false : checked}
                              onChange={() => handleTogglePermission(module.id)}
                              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Icon className={`w-3.5 h-3.5 ${checked && !isTeknisi ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                <span className={`font-semibold ${checked && !isTeknisi ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {module.label}
                                </span>
                                {isTeknisi && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    Terkunci untuk Teknisi
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                {module.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  {editingUserId ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
