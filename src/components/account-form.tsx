"use client";
import { useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";
import { Brand } from "./ui";
export default function AccountForm({
  configured,
  mode: initialMode,
  token,
  verificationError,
}: {
  configured: boolean;
  mode?: string;
  token?: string;
  verificationError?: string;
}) {
  const [mode, setMode] = useState(
    token
      ? "reset"
      : initialMode === "signup"
        ? "signup"
        : initialMode === "forgot"
          ? "forgot"
          : "signin",
  );
  const [method, setMethod] = useState<"otp" | "password">("otp");
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const codeInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    verificationError
      ? "El enlace ha caducado o no es válido. Solicita uno nuevo."
      : "",
  );
  const [email, setEmail] = useState("");
  function switchMode(next: string) {
    setMode(next);
    setSent(false);
    setOtp("");
    setMessage("");
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const callbackURL = `${window.location.origin}/`;
    try {
      if (method === "otp" && (mode === "signup" || mode === "signin")) {
        const result = sent
          ? await authClient.signIn.emailOtp({
              email,
              otp,
              name: name || undefined,
            })
          : await authClient.emailOtp.sendVerificationOtp({
              email,
              type: "sign-in",
            });
        if (result.error)
          throw new Error(
            result.error.status === 429
              ? "Demasiados intentos. Espera un minuto y vuelve a probar."
              : sent
                ? "El código no es válido o ha caducado. Revísalo o solicita otro."
                : "No hemos podido enviar el código. Revisa el correo e inténtalo de nuevo.",
          );
        if (sent) window.location.assign("/");
        else {
          setSent(true);
          setMessage("Código enviado. Revisa también la carpeta de spam.");
          requestAnimationFrame(() => codeInput.current?.focus());
        }
        return;
      }
      const result =
        mode === "signup"
          ? await authClient.signUp.email({
              name,
              email,
              password,
              callbackURL,
            })
          : mode === "forgot"
            ? await authClient.requestPasswordReset({
                email,
                redirectTo: `${window.location.origin}/cuenta?mode=reset`,
              })
            : mode === "reset"
              ? await authClient.resetPassword({
                  newPassword: password,
                  token: token ?? "",
                })
              : await authClient.signIn.email({ email, password, callbackURL });
      if (result.error) {
        const code = result.error.code;
        throw new Error(
          code === "EMAIL_NOT_VERIFIED"
            ? "Verifica tu correo. Te hemos enviado un nuevo enlace."
            : code === "INVALID_EMAIL_OR_PASSWORD"
              ? "El correo o la contraseña no son correctos."
              : result.error.status === 429
                ? "Demasiados intentos. Espera un minuto y vuelve a probar."
                : "No se ha podido completar la solicitud. Revisa tus datos o solicita un enlace nuevo.",
        );
      }
      if (mode === "signin" || mode === "signup") window.location.assign("/");
      else if (mode === "forgot")
        setMessage(
          "Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.",
        );
      else {
        setMode("signin");
        setMessage("Contraseña actualizada. Ya puedes iniciar sesión.");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se ha podido conectar. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  const title =
    mode === "signup"
      ? "Menos gasto. Más control."
      : mode === "forgot"
        ? "Recupera tu cuenta."
        : mode === "reset"
          ? "Una nueva contraseña."
          : "Tu luz, en su sitio.";
  return (
    <main className="account-layout">
      <div className="account-story">
        <Brand />
        <div>
          <span className="eyebrow">TU CUADERNO DE ELECTRICIDAD</span>
          <h2>
            Un poco de claridad.
            <br />
            <em>Un buen ahorro.</em>
          </h2>
          <p>
            Tus precios de hoy, las alternativas de mañana y todo lo que has
            pagado. Por fin, juntos.
          </p>
          <ul>
            {[
              "Compara con tu consumo real",
              "Conserva cada cambio de tarifa",
              "Sigue tus facturas mes a mes",
            ].map((s) => (
              <li key={s}>
                <Check size={17} />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <span className="small">
          Hecho para entender tu factura, sin complicaciones.
        </span>
      </div>
      <div className="account-side">
        <Link href="/" className="text-link">
          <ArrowLeft size={16} /> Volver al comparador
        </Link>
        <div className="account-card">
          <span className="eyebrow">LUZ EN CLARO / TU CUENTA</span>
          <h1>{title}</h1>
          <p>
            {mode === "signup"
              ? "Crea tu cuenta y guarda lo que importa."
              : mode === "forgot"
                ? "Te enviaremos un enlace para empezar de nuevo."
                : "Continúa donde lo dejaste."}
          </p>
          {!configured && (
            <div className="notice">
              Las cuentas todavía no están disponibles en esta instalación.
              Puedes usar el comparador sin registrarte.
            </div>
          )}
          {(mode === "signup" || mode === "signin") && (
            <div className="segmented auth-method" aria-label="Forma de acceso">
              <button
                type="button"
                disabled={busy}
                aria-pressed={method === "otp"}
                className={method === "otp" ? "selected" : ""}
                onClick={() => {
                  setMethod("otp");
                  switchMode(mode);
                }}
              >
                Código por correo
              </button>
              <button
                type="button"
                disabled={busy}
                aria-pressed={method === "password"}
                className={method === "password" ? "selected" : ""}
                onClick={() => {
                  setMethod("password");
                  switchMode(mode);
                }}
              >
                Contraseña
              </button>
            </div>
          )}
          {method === "otp" && (mode === "signup" || mode === "signin") && (
            <p className="small muted">
              Un código y estás dentro. Si es tu primera vez, crearemos tu
              cuenta al verificarlo.
            </p>
          )}
          <form onSubmit={submit}>
            <fieldset disabled={!configured || busy}>
              {mode === "signup" && !sent && (
                <label className="auth-label">
                  Tu nombre
                  <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={method === "password"}
                    autoComplete="name"
                    maxLength={100}
                  />
                </label>
              )}
              {mode !== "reset" && (
                <label className="auth-label">
                  Correo electrónico
                  <input
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={sent}
                    spellCheck={false}
                    autoCapitalize="none"
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={254}
                  />
                </label>
              )}
              {sent && method === "otp" && (
                <label className="auth-label">
                  Código de 6 dígitos
                  <InputOTP
                    ref={codeInput}
                    name="otp"
                    value={otp}
                    onChange={setOtp}
                    pasteTransformer={(text) => text.replace(/[\s-]/g, "")}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern={REGEXP_ONLY_DIGITS}
                    minLength={6}
                    maxLength={6}
                    required
                    aria-describedby="otp-hint"
                    aria-invalid={!!error}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <small id="otp-hint">
                    Enviado a {email}. Caduca en 10 minutos.
                  </small>
                </label>
              )}
              {(method === "password" || mode === "reset") &&
                mode !== "forgot" && (
                  <label className="auth-label">
                    {mode === "reset" ? "Nueva contraseña" : "Contraseña"}
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={mode === "signin" ? 1 : 12}
                      maxLength={128}
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                    />
                    {mode !== "signin" && (
                      <small>
                        Al menos 12 caracteres. Puedes usar una frase.
                      </small>
                    )}
                  </label>
                )}
              {mode === "signin" && method === "password" && (
                <button
                  type="button"
                  className="link-button forgot"
                  onClick={() => switchMode("forgot")}
                >
                  He olvidado mi contraseña
                </button>
              )}
              <button className="button primary full" type="submit">
                {busy
                  ? "Un momento…"
                  : method === "otp" && (mode === "signup" || mode === "signin")
                    ? sent
                      ? "Verificar y entrar"
                      : "Enviar código"
                    : mode === "signup"
                      ? "Crear mi cuenta"
                      : mode === "forgot"
                        ? "Enviar enlace"
                        : mode === "reset"
                          ? "Guardar contraseña"
                          : "Entrar en mi cuenta"}
                <ArrowRight size={17} />
              </button>
              {sent && method === "otp" && (
                <div className="otp-actions">
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setSent(false);
                      setOtp("");
                      setMessage("");
                      setError("");
                    }}
                  >
                    Cambiar correo o pedir otro código
                  </button>
                </div>
              )}
            </fieldset>
          </form>
          {error && (
            <div role="alert" className="notice error">
              {error}
            </div>
          )}
          {message && (
            <div role="status" className="notice success">
              {message}
            </div>
          )}
          <p className="auth-switch">
            {mode === "signin"
              ? "¿Primera vez por aquí?"
              : "¿Ya tienes cuenta?"}{" "}
            <button
              className="link-button"
              disabled={busy}
              onClick={() =>
                switchMode(mode === "signin" ? "signup" : "signin")
              }
            >
              {mode === "signin" ? "Crear una cuenta" : "Iniciar sesión"}
            </button>
          </p>
          <div className="auth-security">
            <ShieldCheck size={16} /> Tus datos solo están disponibles en tu
            cuenta.
          </div>
        </div>
      </div>
    </main>
  );
}
