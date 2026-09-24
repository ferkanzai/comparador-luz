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
import {
  authField,
  authHint,
  eyebrow,
  fieldset,
  textLink,
} from "./account-styles";
import { cn } from "@/lib/utils";
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
    <main className="grid min-h-dvh grid-cols-2 max-[800px]:grid-cols-1 min-[801px]:h-dvh min-[801px]:grid-rows-[minmax(0,1fr)]">
      <div className="relative flex flex-col justify-between gap-16 overflow-hidden bg-inverse px-[clamp(25px,6vw,90px)] py-12 text-inverse-foreground after:pointer-events-none after:absolute after:-right-[290px] after:-bottom-[150px] after:box-content after:size-[450px] after:rounded-full after:border after:border-period-3/[13.3%] after:shadow-[0_0_0_60px_color-mix(in_oklab,var(--period-3)_2.4%,transparent),0_0_0_120px_color-mix(in_oklab,var(--period-3)_1.6%,transparent)] after:content-[''] max-[1000px]:p-9 max-[800px]:p-6 min-[801px]:min-h-0 min-[801px]:gap-[clamp(16px,3dvh,60px)] [&_:focus-visible]:shadow-none [&_:focus-visible]:outline-lime">
        <Brand inverse />
        <div className="max-[800px]:hidden">
          <span className={cn(eyebrow, "text-inverse-muted")}>
            TU CUADERNO DE ELECTRICIDAD
          </span>
          <h2 className="my-5 font-heading text-[clamp(35px,3.3vw,51px)]/[1.22] font-bold tracking-[-2px] [@media(min-width:801px)_and_(max-height:600px)]:my-4 [@media(min-width:801px)_and_(max-height:600px)]:text-3xl/[1.22]">
            Un poco de claridad.
            <br />
            <em className="text-lime not-italic">Un buen ahorro.</em>
          </h2>
          <p className="m-0 max-w-[360px] text-base/[1.8] text-inverse-muted">
            Tus precios de hoy, las alternativas de mañana y todo lo que has
            pagado. Por fin, juntos.
          </p>
          <ul className="m-0 mt-8 mb-[1em] grid list-none gap-4 p-0 text-sm-plus text-success-border [@media(min-width:801px)_and_(max-height:600px)]:mt-5 [@media(min-width:801px)_and_(max-height:600px)]:mb-0 [@media(min-width:801px)_and_(max-height:600px)]:gap-2.5">
            {[
              "Compara con tu consumo real",
              "Conserva cada cambio de tarifa",
              "Sigue tus facturas mes a mes",
            ].map((s) => (
              <li key={s} className="flex items-center gap-3">
                <Check size={17} className="shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <span className="text-sm/[1.6] text-chart-5-soft max-[800px]:hidden">
          Hecho para entender tu factura, sin complicaciones.
        </span>
      </div>
      <div className="flex flex-col px-[clamp(25px,6vw,90px)] py-12 max-[1000px]:p-9 max-[800px]:min-h-[calc(100dvh-86px)] max-[800px]:p-6 min-[801px]:min-h-0 min-[801px]:overflow-y-auto">
        <Button asChild variant="link" size="inline" className="self-start">
          <Link href="/">
            <ArrowLeft size={16} /> Volver al comparador
          </Link>
        </Button>
        <div className="mx-0 my-auto max-w-[430px] py-16 max-[800px]:m-auto max-[800px]:w-full max-[800px]:max-w-[440px] max-[800px]:py-9 min-[801px]:shrink-0">
          <span className={cn(eyebrow, "text-muted-foreground")}>
            LUZ EN CLARO / TU CUENTA
          </span>
          <h1 className="my-3 font-heading text-3xl/[1.6] font-semibold tracking-[-1.3px]">
            {title}
          </h1>
          <p className="m-0 text-base/[1.6] text-muted-foreground">
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
              className="mt-6 mb-3 w-full rounded-lg bg-muted p-1 *:flex-1 *:data-[state=on]:bg-card *:data-[state=on]:shadow-sm"
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
            <p className="m-0 text-base/[1.6] text-muted-foreground">
              Un código y estás dentro. Si es tu primera vez, crearemos tu
              cuenta al verificarlo.
            </p>
          )}
          <form className="mt-7" onSubmit={submit}>
            <fieldset className={fieldset} disabled={!configured || busy}>
              {mode === "signup" && !sent && (
                <div className={authField}>
                  <label htmlFor="name">Tu nombre</label>
                  <Input
                    id="name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={method === "password"}
                    autoComplete="name"
                    maxLength={100}
                  />
                </div>
              )}
              {mode !== "reset" && (
                <div className={authField}>
                  <label htmlFor="email">Correo electrónico</label>
                  <Input
                    id="email"
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
                </div>
              )}
              {sent && method === "otp" && (
                <div className={authField}>
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
                  <small id="otp-hint" className={authHint}>
                    Enviado a {email}. Caduca en 10 minutos.
                  </small>
                </div>
              )}
              {(method === "password" || mode === "reset") &&
                mode !== "forgot" && (
                  <div className={authField}>
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
                      <small id="password-hint" className={authHint}>
                        Al menos 12 caracteres. Puedes usar una frase.
                      </small>
                    )}
                  </div>
                )}
              {mode === "signin" && method === "password" && (
                <Button
                  variant="link"
                  size="inline"
                  className="mb-6"
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
                <div className="mt-4">
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
          <p className="my-6 text-center text-sm-plus text-muted-foreground">
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
          <div className="mt-9 flex items-center justify-center gap-2 border-t border-border pt-6 text-sm/[1.6] text-muted-foreground">
            <ShieldCheck size={16} className="shrink-0" />
            <span>
              Tus datos solo están disponibles en tu cuenta.{" "}
              <Link href="/privacidad" className={textLink}>
                Cómo los tratamos
              </Link>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
