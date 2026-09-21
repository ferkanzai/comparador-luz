export async function sendAccountEmail(
  to: string,
  url: string,
  reset: boolean,
) {
  const subject = reset
    ? "Cambia tu contraseña · Luz en claro"
    : "Verifica tu correo · Luz en claro";
  const text = `${reset ? "Cambia tu contraseña" : "Verifica tu correo para guardar tus tarifas"}: ${url}\n\nSi no has solicitado este correo, puedes ignorarlo.`;
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.EMAIL_MODE === "console"
  ) {
    console.info(`[Development email] ${subject}\n${text}`);
    return;
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      text,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(`Email delivery failed (${response.status}).`);
}
