"use client";
import { useFeedback } from "./feedback-notice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";
import { Brand } from "./ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
export default function AccountForm({
  configured,
  mode: initialMode,
  token,
  verificationError,
  deleted = false,
}: {
  configured: boolean;
  mode?: string;
  token?: string;
  verificationError?: string;
  deleted?: boolean;
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
  const { setMessage } = useFeedback();
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
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
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
            ? "Confirma tu correo antes de entrar. Te hemos enviado un nuevo enlace: ábrelo en este navegador."
            : code === "INVALID_EMAIL_OR_PASSWORD"
              ? "El correo o la contraseña no son correctos."
              : result.error.status === 429
                ? "Demasiados intentos. Espera un minuto y vuelve a probar."
                : "No se ha podido completar la solicitud. Revisa tus datos o solicita un enlace nuevo.",
        );
      }
      if (mode === "signin") window.location.assign("/");
      else if (mode === "signup")
        setMessage(
          `Te hemos enviado un enlace a ${email}. Ábrelo en este navegador para entrar con tu contraseña. Si lo abres en otro, entrarás allí y, por seguridad, tendrás que crear una contraseña nueva.`,
        );
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
        <Button asChild variant="link" size="inline" className="self-start">
          <Link href="/">
            <ArrowLeft size={16} /> Volver al comparador
          </Link>
        </Button>
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
          {deleted && (
            <Alert role="status">
              Hemos eliminado tu cuenta y todos sus datos.
            </Alert>
          )}
          {!configured && (
            <Alert role="note">
              Las cuentas todavía no están disponibles en esta instalación.
              Puedes usar el comparador sin registrarte.
            </Alert>
          )}
          {(mode === "signup" || mode === "signin") && (
            <ToggleGroup
              type="single"
              value={method}
              className="segmented auth-method w-full rounded-lg bg-muted p-1 *:data-[state=on]:bg-card *:data-[state=on]:shadow-sm"
              aria-label="Forma de acceso"
            >
              <ToggleGroupItem
                value="otp"
                disabled={busy}
                onClick={() => {
                  setMethod("otp");
                  switchMode(mode);
                }}
              >
                Código por correo
              </ToggleGroupItem>
              <ToggleGroupItem
                value="password"
                disabled={busy}
                onClick={() => {
                  setMethod("password");
                  switchMode(mode);
                }}
              >
                Contraseña
              </ToggleGroupItem>
            </ToggleGroup>
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
                  <Input
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
                  <Input
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
                <div className="auth-label">
                  <label htmlFor="otp">Código de 6 dígitos</label>
                  <InputOTP
                    ref={codeInput}
                    id="otp"
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
                </div>
              )}
              {(method === "password" || mode === "reset") &&
                mode !== "forgot" && (
                  <div className="auth-label">
                    <label htmlFor="password">
                      {mode === "reset" ? "Nueva contraseña" : "Contraseña"}
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={mode === "signin" ? 1 : 12}
                      maxLength={128}
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      aria-describedby={
                        mode === "signin" ? undefined : "password-hint"
                      }
                    />
                    {mode !== "signin" && (
                      <small id="password-hint">
                        Al menos 12 caracteres. Puedes usar una frase.
                      </small>
                    )}
                  </div>
                )}
              {mode === "signin" && method === "password" && (
                <Button
                  variant="link"
                  size="inline"
                  className="forgot"
                  type="button"

                  onClick={() => switchMode("forgot")}
                >
                  He olvidado mi contraseña
                </Button>
              )}
              <Button className="w-full" type="submit">
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
              </Button>
              {sent && method === "otp" && (
                <div className="otp-actions">
                  <Button
                    variant="link"
                    size="inline"
                    type="button"

                    onClick={() => {
                      setSent(false);
                      setOtp("");
                      setError("");
                    }}
                  >
                    Cambiar correo o pedir otro código
                  </Button>
                </div>
              )}
            </fieldset>
          </form>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <p className="auth-switch">
            {mode === "signin"
              ? "¿Primera vez por aquí?"
              : "¿Ya tienes cuenta?"}{" "}
            <Button
              variant="link"
              size="inline"

              disabled={busy}
              onClick={() =>
                switchMode(mode === "signin" ? "signup" : "signin")
              }
            >
              {mode === "signin" ? "Crear una cuenta" : "Iniciar sesión"}
            </Button>
          </p>
          <div className="auth-security">
            <ShieldCheck size={16} />
            <span>
              Tus datos solo están disponibles en tu cuenta.{" "}
              <Link href="/privacidad">Cómo los tratamos</Link>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
