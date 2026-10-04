"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/logo";
import { btn, field } from "@/components/ui";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { getDemoSessionRole, setDemoSessionRole } from "@/lib/demo-session";

const DEMO_ACCOUNTS: { identifier: string; password: string; role: Role }[] = [
  { identifier: "aisyah.putri@smkn11jakarta.sch.id", password: "demo-ketua-2026", role: "KETUA_KELAS" },
  { identifier: "piket.senin@smkn11jakarta.sch.id", password: "demo-guru-2026", role: "GURU_PIKET" },
  { identifier: "admin@smkn11jakarta.sch.id", password: "demo-admin-2026", role: "ADMIN" },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getDemoSessionRole()) router.replace("/dashboard");
  }, [router]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const identifier = String(data.get("identifier") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (!identifier || !password) {
      setError("Isi username/email dan password untuk melanjutkan.");
      return;
    }
    const account = DEMO_ACCOUNTS.find(
      (demoAccount) => demoAccount.identifier === identifier.toLowerCase() && demoAccount.password === password,
    );
    if (!account) {
      setError("Email atau password akun demo tidak sesuai.");
      return;
    }
    try {
      setDemoSessionRole(account.role);
    } catch (error) {
      console.error("Sesi demo tidak dapat disimpan.", error);
      setError("Sesi masuk tidak dapat disimpan di browser ini. Periksa pengaturan penyimpanan browser lalu coba lagi.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="page-enter grid min-h-screen lg:grid-cols-[minmax(22rem,5fr)_7fr]">
      <section className="hidden flex-col justify-between bg-primary p-10 lg:flex xl:p-16">
        <div className="space-y-6">
          <Logo size={88} />
          <div className="space-y-2">
            <p className="text-[2rem] font-semibold leading-tight text-white">SMK Negeri 11 Jakarta</p>
            <p className="text-lg text-sky">Sistem Presensi Siswa</p>
          </div>
        </div>
        <p className="max-w-md text-sm text-white/75">Presensi harian siswa yang resmi, rapi, dan mudah dipantau.</p>
      </section>

      <section className="flex flex-col items-center justify-center gap-6 p-6">
        <div className="flex items-center gap-4 lg:hidden">
          <Logo size={44} />
          <div>
            <p className="font-semibold">SMK Negeri 11 Jakarta</p>
            <p className="text-xs text-muted">Sistem Presensi Siswa</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} onInput={() => setError(null)} className="w-full max-w-104 space-y-6 rounded-lg border border-line bg-surface p-8 sm:p-10">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Masuk</h1>
            <p className="text-sm text-muted">Gunakan akun yang diberikan sekolah.</p>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Username / Email
            <input name="identifier" autoComplete="username" required placeholder="nama@smkn11jakarta.sch.id" className={`${field} h-12 font-normal`} />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Password
            <span className={`${field} flex h-12 items-center gap-2 font-normal`}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Masukkan password"
                className="w-full bg-transparent outline-none"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword} className="text-sm font-medium text-primary">
                {showPassword ? "Sembunyikan" : "Tampilkan"}
              </button>
            </span>
          </label>

          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <button type="submit" className={`${btn.primary} h-12 w-full`}>Login</button>
          <details className="rounded-md border border-line px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium text-primary">Akun demo untuk setiap peran</summary>
            <dl className="mt-3 space-y-3 text-xs">
              {DEMO_ACCOUNTS.map((account) => (
                <div key={account.role}>
                  <dt className="font-semibold text-ink">{ROLE_LABEL[account.role]}</dt>
                  <dd className="mt-1 break-all text-muted">Email: {account.identifier}</dd>
                  <dd className="text-muted">Password: {account.password}</dd>
                </div>
              ))}
            </dl>
          </details>
          <p className="text-xs leading-relaxed text-muted">Login ini hanya simulasi frontend dengan akun demo publik. Di sistem produksi, backend memverifikasi password, menentukan role dari akun, dan menolak akses yang tidak diizinkan.</p>
        </form>
      </section>
    </main>
  );
}
