"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/logo";
import { btn, field } from "@/components/ui";
import { getDemoSessionRole, setDemoSessionRole } from "@/lib/demo-session";
import { createApiAuthRepository } from "@/lib/data/api-auth";
import { apiErrorMessage } from "@/lib/data/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getDemoSessionRole()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const identifier = String(data.get("identifier") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (!identifier || !password) {
      setError("Isi username/email dan password untuk melanjutkan.");
      return;
    }

    setLoading(true);
    setError(null);

    const authRepo = createApiAuthRepository();

    if (!authRepo) {
      setError("Konfigurasi API backend belum disetel. Hubungi administrator sekolah.");
      setLoading(false);
      return;
    }

    try {
      const sessionUser = await authRepo.login({ identifier, password });
      setDemoSessionRole(sessionUser.role);
      router.push("/dashboard");
    } catch (err: unknown) {
      const isAuthError =
        typeof err === "object" &&
        err !== null &&
        "status" in err &&
        (err.status === 401 || err.status === 403);

      if (isAuthError) {
        setError("Email atau password tidak sesuai. Periksa kembali kredensial Anda.");
      } else {
        setError(apiErrorMessage(err));
      }
      setLoading(false);
    }
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
        <p className="max-w-md text-sm text-white/75">
          Sistem informasi presensi harian siswa resmi berbasis role (Ketua Kelas, Guru Piket, Admin).
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 md:px-16 lg:px-20 xl:px-28">
        <div className="mb-8 space-y-2 lg:hidden">
          <Logo size={48} />
          <p className="text-xl font-semibold">SMK Negeri 11 Jakarta</p>
          <p className="text-sm text-muted">Sistem Presensi Siswa</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="max-w-md space-y-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Masuk ke Akun</h1>
            <p className="text-sm text-muted">Gunakan email resmi sekolah yang telah didaftarkan administrator.</p>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Email / Akun
            <input
              name="identifier"
              type="email"
              autoComplete="username"
              required
              placeholder="nama@smkn11jakarta.sch.id"
              className={`${field} h-12 font-normal`}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Password
            <span className={`${field} flex h-12 items-center gap-2 font-normal`}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Masukkan password akun Anda"
                className="w-full bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className="text-sm font-medium text-primary hover:underline"
              >
                {showPassword ? "Sembunyikan" : "Tampilkan"}
              </button>
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`${btn.primary} h-12 w-full disabled:opacity-60`}
          >
            {loading ? "Memproses Verifikasi..." : "Masuk"}
          </button>

          <p className="text-xs leading-relaxed text-muted">
            Akses ke sistem ini dicatat dalam log audit sekolah. Hubungi administrator jika Anda lupa kata sandi atau mengalami kendala masuk.
          </p>
        </form>
      </section>
    </main>
  );
}
