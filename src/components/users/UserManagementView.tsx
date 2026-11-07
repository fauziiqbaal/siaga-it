import React, { useState } from 'react';
import type { SimpleUser, UserRole, AppModuleId } from '../../types/hotel';
import { APP_MODULES, getDefaultPermissionsForRole } from '../../data/mockData';
import { Badge, Btn, Card, Field, SelectInput, Sheet, Stat, TextInput } from '../ui/kit';
import { cn } from '../../lib/utils';

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
  // Hanya Admin & Backoffice dengan izin user_management yang boleh membuka
  const hasAccess =
    currentUser.role === 'ADMIN' ||
    (currentUser.role === 'BACKOFFICE' && currentUser.permissions.includes('user_management'));

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Sheet Tambah/Edit
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

  const applyRoleTemplate = (role: UserRole) => {
    const defaultPerms = getDefaultPermissionsForRole(role);
    setFormData((prev) => ({
      ...prev,
      role,
      roleTitle:
        prev.roleTitle ||
        (role === 'ADMIN'
          ? 'Super Administrator'
          : role === 'BACKOFFICE'
            ? 'IT Ops Backoffice'
            : 'Field Technician'),
      permissions: defaultPerms,
      avatarColor:
        role === 'ADMIN' ? 'bg-indigo-600' : role === 'BACKOFFICE' ? 'bg-blue-600' : 'bg-emerald-600',
    }));
  };

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
    alert(`Akses untuk ${user.name} (@${user.username}) berhasil diizinkan kembali.`);
  };

  const handleTogglePermission = (modId: AppModuleId) => {
    if (formData.role === 'TEKNISI' && modId === 'user_management') {
      alert('Peran Teknisi tidak diizinkan mengakses modul Manajemen Pengguna.');
      return;
    }

    setFormData((prev) => {
      const exists = prev.permissions.includes(modId);
      return {
        ...prev,
        permissions: exists ? prev.permissions.filter((p) => p !== modId) : [...prev.permissions, modId],
      };
    });
  };

  const handleSelectAllPermissions = () => {
    if (formData.role === 'TEKNISI') {
      const allExceptUserMgmt = APP_MODULES.filter((m) => m.id !== 'user_management').map((m) => m.id);
      setFormData((prev) => ({ ...prev, permissions: allExceptUserMgmt }));
    } else {
      setFormData((prev) => ({ ...prev, permissions: APP_MODULES.map((m) => m.id) }));
    }
  };

  const handleClearPermissions = () => {
    setFormData((prev) => ({ ...prev, permissions: [] }));
  };

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

  const handleOpenEditModal = (user: SimpleUser) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username || user.name.toLowerCase().replace(/\s+/g, '.'),
      name: user.name,
      role: user.role,
      roleTitle:
        user.roleTitle ||
        (user.role === 'ADMIN'
          ? 'Super Administrator'
          : user.role === 'BACKOFFICE'
            ? 'Backoffice IT Lead'
            : 'Field Technician'),
      email: user.email || '',
      phone: user.phone || '',
      pin: user.pin,
      isActive: user.isActive,
      permissions: [...user.permissions],
      avatarColor:
        user.avatarColor ||
        (user.role === 'ADMIN' ? 'bg-indigo-600' : user.role === 'BACKOFFICE' ? 'bg-blue-600' : 'bg-emerald-600'),
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama pengguna wajib diisi.');
      return;
    }
    if (!formData.username.trim()) {
      alert('Username wajib diisi untuk login.');
      return;
    }

    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '');
    const duplicate = users.find((u) => (u.username || '').toLowerCase() === cleanUsername && u.id !== editingUserId);
    if (duplicate) {
      alert(`Username "@${cleanUsername}" sudah digunakan oleh ${duplicate.name}.`);
      return;
    }

    if (!formData.pin.trim() || formData.pin.length !== 4) {
      alert('PIN harus terdiri dari 4 digit angka.');
      return;
    }

    if (editingUserId) {
      const existing = users.find((u) => u.id === editingUserId);
      const isMasterAdmin = existing?.username === 'admin';
      const finalRole = isMasterAdmin ? 'ADMIN' : formData.role;
      const finalPermissions = isMasterAdmin
        ? APP_MODULES.map((m) => m.id)
        : formData.role === 'TEKNISI'
          ? formData.permissions.filter((p) => p !== 'user_management')
          : formData.permissions;

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
        isBlocked: isMasterAdmin ? false : existing?.isBlocked || false,
      };
      onUpdateUser(updated);

      if (currentUser.id === editingUserId) {
        onSelectUser(updated);
      }
    } else {
      const finalPermissions =
        formData.role === 'TEKNISI'
          ? formData.permissions.filter((p) => p !== 'user_management')
          : formData.permissions;

      const newUser: SimpleUser = {
        id: `u-${Date.now()}`,
        username: cleanUsername,
        name: formData.name.trim(),
        role: formData.role,
        roleTitle:
          formData.roleTitle.trim() ||
          (formData.role === 'ADMIN'
            ? 'Super Administrator'
            : formData.role === 'BACKOFFICE'
              ? 'Backoffice IT Lead'
              : 'Field Technician'),
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

  const handleToggleActive = (user: SimpleUser) => {
    if (user.username === 'admin') {
      alert('Akun master Administrator tidak dapat dinonaktifkan.');
      return;
    }
    if (user.id === currentUser.id) {
      alert('Tidak dapat menonaktifkan akun yang sedang aktif digunakan.');
      return;
    }
    onUpdateUser({
      ...user,
      isActive: !user.isActive,
    });
  };

  const handleDelete = (user: SimpleUser) => {
    if (user.username === 'admin') {
      alert('Akun master Administrator tidak dapat dihapus.');
      return;
    }
    if (user.id === currentUser.id) {
      alert('Tidak dapat menghapus akun yang sedang aktif digunakan.');
      return;
    }
    if (confirm(`Hapus akun "${user.name}"?`)) {
      onDeleteUser(user.id);
    }
  };

  // Layar akses terbatas jika bukan Admin / Backoffice
  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-lg py-8 space-y-3">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-200">
          <p className="font-bold">Akses terbatas: khusus Admin &amp; Backoffice</p>
          <p className="mt-1">
            Akun Anda saat ini tercatat sebagai <strong>{currentUser.name}</strong> ({currentUser.role}). Peran
            Teknisi difokuskan untuk inspeksi QC lapangan dan tidak memiliki izin mengelola pengguna.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="primary" onClick={() => onNavigateTab('setup')} className="flex-1">
            Kembali ke menu utama
          </Btn>
          {onOpenAuth && (
            <Btn onClick={onOpenAuth} className="flex-1">
              Ganti akun
            </Btn>
          )}
        </div>
      </div>
    );
  }

  // Filtered users
  const filteredUsers = users.filter((user) => {
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

  const totalAdmin = users.filter((u) => u.role === 'ADMIN').length;
  const totalBackoffice = users.filter((u) => u.role === 'BACKOFFICE').length;
  const totalTeknisi = users.filter((u) => u.role === 'TEKNISI').length;
  const totalActive = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-3">
      {/* Tombol kembali ke menu utama */}
      <div className="flex items-center justify-between gap-2 pb-0.5">
        <Btn onClick={() => onNavigateTab('setup')}>
          Kembali ke menu utama
        </Btn>
        <span className="text-[10px] text-muted-foreground">
          Administrator / User Management
        </span>
      </div>

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground">
              Manajemen Pengguna &amp; Hak Akses
            </h1>
            <Badge tone="neutral">Admin &amp; Backoffice</Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Kelola akun tim Siaga IT, peran hak akses (Admin, Backoffice, Teknisi), izin modul, dan PIN login.
          </p>
        </div>
        <Btn variant="primary" onClick={handleOpenAddModal} className="shrink-0">
          + Tambah pengguna
        </Btn>
      </div>

      {/* Statistik Ringkas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Total pengguna" value={users.length} hint={`${totalActive} aktif`} />
        <Stat label="Admin" value={totalAdmin} hint="Super administrator" />
        <Stat label="Backoffice" value={totalBackoffice} hint="Lead &amp; audit" />
        <Stat label="Teknisi" value={totalTeknisi} hint="Field ops &amp; QC" />
      </div>

      {/* Info Akun Aktif */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-xs">
        <div>
          <span className="text-muted-foreground">Login aktif: </span>
          <span className="font-semibold text-foreground">{currentUser.name}</span>
          <span className="text-muted-foreground ml-1 font-mono">(@{currentUser.username || 'user'})</span>
          <span className="ml-2">
            <Badge tone={currentUser.role === 'ADMIN' ? 'blue' : currentUser.role === 'BACKOFFICE' ? 'amber' : 'neutral'}>
              {currentUser.role}
            </Badge>
          </span>
        </div>
        {onOpenAuth && (
          <Btn className="min-h-[30px] px-2 text-[10px]" onClick={onOpenAuth}>
            Ganti akun
          </Btn>
        )}
      </div>

      {/* Pencarian & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <TextInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama, username, jabatan, email..."
          className="flex-1"
        />
        <div className="flex gap-2">
          <SelectInput
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-36"
          >
            <option value="ALL">Semua peran</option>
            <option value="ADMIN">Admin ({totalAdmin})</option>
            <option value="BACKOFFICE">Backoffice ({totalBackoffice})</option>
            <option value="TEKNISI">Teknisi ({totalTeknisi})</option>
          </SelectInput>
          <SelectInput
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-32"
          >
            <option value="ALL">Semua status</option>
            <option value="ACTIVE">Aktif ({totalActive})</option>
            <option value="INACTIVE">Non-aktif ({users.length - totalActive})</option>
          </SelectInput>
        </div>
      </div>

      {/* Tabel Pengguna */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3">Pengguna</th>
                <th className="py-2.5 px-3">Peran</th>
                <th className="py-2.5 px-3">Izin modul</th>
                <th className="py-2.5 px-3">PIN</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Tidak ditemukan data pengguna yang cocok.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  const isCooldown = user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now();

                  return (
                    <tr
                      key={user.id}
                      className={cn('hover:bg-muted/30 transition-colors', isCurrent && 'bg-blue-500/5')}
                    >
                      <td className="py-2.5 px-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground">{user.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">@{user.username}</span>
                            {isCurrent && <Badge tone="blue">Akun saya</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {user.roleTitle || user.role}
                            {user.email ? ` · ${user.email}` : ''}
                            {user.phone ? ` · ${user.phone}` : ''}
                          </p>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Badge tone={user.role === 'ADMIN' ? 'blue' : user.role === 'BACKOFFICE' ? 'amber' : 'neutral'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-muted-foreground">
                        <span className="font-mono font-bold text-foreground">{user.permissions.length}</span> /{' '}
                        {APP_MODULES.length} modul
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        ••••
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {user.isBlocked ? (
                          <Badge tone="red">DIBLOKIR</Badge>
                        ) : isCooldown ? (
                          <Badge tone="amber">COOLDOWN</Badge>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(user)}
                            disabled={isCurrent || user.username === 'admin'}
                            className="text-left"
                            title={isCurrent ? 'Tidak bisa menonaktifkan akun sendiri' : 'Klik untuk ubah status'}
                          >
                            <Badge tone={user.isActive ? 'green' : 'neutral'}>
                              {user.isActive ? 'Aktif' : 'Non-aktif'}
                            </Badge>
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {(user.isBlocked || isCooldown) && (
                            <Btn
                              className="min-h-[28px] px-2 text-[10px]"
                              onClick={() => handlePermitUser(user)}
                            >
                              Buka blokir
                            </Btn>
                          )}
                          <Btn
                            className="min-h-[28px] px-2 text-[10px]"
                            onClick={() => handleOpenEditModal(user)}
                          >
                            Ubah
                          </Btn>
                          {!isCurrent && user.username !== 'admin' && (
                            <Btn
                              variant="danger"
                              className="min-h-[28px] px-2 text-[10px]"
                              onClick={() => handleDelete(user)}
                            >
                              Hapus
                            </Btn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sheet Tambah / Edit Pengguna */}
      <Sheet
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUserId ? 'Ubah akun pengguna' : 'Tambah pengguna baru'}
        subtitle="Konfigurasi peran dan hak akses per modul aplikasi."
        footer={
          <div className="flex gap-2">
            <Btn block onClick={() => setIsModalOpen(false)}>
              Batal
            </Btn>
            <Btn block variant="primary" onClick={handleSaveUser}>
              Simpan
            </Btn>
          </div>
        }
      >
        <div className="space-y-3">
          {editingUserId &&
            (() => {
              const editingUser = users.find((u) => u.id === editingUserId);
              if (
                editingUser?.isBlocked ||
                (editingUser?.lockedUntil && new Date(editingUser.lockedUntil).getTime() > Date.now())
              ) {
                return (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 flex items-center justify-between gap-2 text-xs text-rose-800 dark:text-rose-200">
                    <span>Akun ini sedang {editingUser.isBlocked ? 'diblokir' : 'ditangguhkan'}.</span>
                    <Btn className="min-h-[28px] px-2 text-[10px]" onClick={() => handlePermitUser(editingUser)}>
                      Buka blokir
                    </Btn>
                  </div>
                );
              }
              return null;
            })()}

          <Field label="Peran (Role)">
            <SelectInput
              value={formData.role}
              onChange={(e) => applyRoleTemplate(e.target.value as UserRole)}
            >
              <option value="TEKNISI">Teknisi (Field Ops &amp; QC Lapangan)</option>
              <option value="BACKOFFICE">Backoffice (Audit &amp; Laporan Kesiapan)</option>
              <option value="ADMIN">Admin (Super Administrator)</option>
            </SelectInput>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Username login">
              <TextInput
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })
                }
                placeholder="rian.teknisi"
              />
            </Field>

            <Field label="Nama lengkap">
              <TextInput
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Rian Saputra"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Jabatan">
              <TextInput
                value={formData.roleTitle}
                onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                placeholder={formData.role === 'BACKOFFICE' ? 'IT Ops Lead' : 'Field Technician'}
              />
            </Field>

            <Field label="Email">
              <TextInput
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rian@siagait.com"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="No. telepon">
              <TextInput
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0812-3456-7890"
              />
            </Field>

            <Field label="4-Digit PIN">
              <div className="flex gap-1.5">
                <TextInput
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="1234"
                  className="font-mono text-center font-bold"
                />
                <Btn
                  className="shrink-0"
                  onClick={() =>
                    setFormData({ ...formData, pin: Math.floor(1000 + Math.random() * 9000).toString() })
                  }
                >
                  Acak
                </Btn>
              </div>
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs pt-1">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded"
            />
            <span className="font-semibold text-foreground">Status akun aktif</span>
          </label>

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-foreground">
                Hak akses modul ({formData.permissions.length} dari {APP_MODULES.length})
              </p>
              <div className="flex gap-1">
                <Btn className="min-h-[26px] px-1.5 text-[10px]" onClick={() => applyRoleTemplate(formData.role)}>
                  Reset
                </Btn>
                <Btn className="min-h-[26px] px-1.5 text-[10px]" onClick={handleSelectAllPermissions}>
                  Semua
                </Btn>
                <Btn className="min-h-[26px] px-1.5 text-[10px]" onClick={handleClearPermissions}>
                  Kosongkan
                </Btn>
              </div>
            </div>

            {formData.role === 'TEKNISI' && (
              <p className="mb-2 text-[10px] text-amber-700 dark:text-amber-300">
                Catatan: Modul Manajemen Pengguna otomatis dinonaktifkan untuk peran Teknisi.
              </p>
            )}

            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {APP_MODULES.map((module) => {
                const checked = formData.permissions.includes(module.id);
                const isTeknisiLock = formData.role === 'TEKNISI' && module.id === 'user_management';

                return (
                  <label
                    key={module.id}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border p-2 text-xs transition-colors',
                      isTeknisiLock
                        ? 'opacity-40 border-border bg-muted/20 cursor-not-allowed'
                        : checked
                          ? 'border-blue-500/40 bg-blue-500/5 cursor-pointer'
                          : 'border-border bg-card hover:bg-muted/30 cursor-pointer',
                    )}
                  >
                    <input
                      type="checkbox"
                      disabled={isTeknisiLock}
                      checked={isTeknisiLock ? false : checked}
                      onChange={() => handleTogglePermission(module.id)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-foreground">{module.label}</span>
                        {isTeknisiLock && <span className="text-[9px] text-muted-foreground">Terkunci</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">{module.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Sheet>
    </div>
  );
};
