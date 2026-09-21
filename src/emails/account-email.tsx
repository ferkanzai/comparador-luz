import type { CSSProperties, ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

export type AccountEmailProps =
  | { kind: "otp"; otp: string; purpose: string }
  | { kind: "verification" | "reset"; url: string };

const theme = {
  paper: "#f7f8f2",
  ink: "#243d32",
  muted: "#536358",
  line: "#d5dfd1",
  lime: "#d7ee87",
  olive: "#65823a",
  body: "'DM Sans', 'Trebuchet MS', Helvetica, sans-serif",
  display: "'Manrope', 'Trebuchet MS', Helvetica, sans-serif",
};
const paragraph: CSSProperties = {
  margin: "0 0 28px",
  fontSize: "16px",
  lineHeight: "26px",
  color: theme.muted,
};
const small: CSSProperties = {
  margin: "0",
  fontSize: "13px",
  lineHeight: "21px",
  color: theme.muted,
};

function otpAction(purpose: string) {
  return purpose === "forget-password"
    ? "cambiar tu contraseña"
    : purpose === "email-verification"
      ? "verificar tu correo"
      : "entrar en Luz en claro";
}

export function accountEmailSubject(props: AccountEmailProps) {
  if (props.kind !== "otp") {
    return props.kind === "reset"
      ? "Cambia tu contraseña · Luz en claro"
      : "Verifica tu correo · Luz en claro";
  }
  const action =
    props.purpose === "forget-password"
      ? "Restablece tu contraseña"
      : props.purpose === "email-verification"
        ? "Verifica tu correo"
        : "Tu código de acceso";
  return `${props.otp} · ${action} · Luz en claro`;
}

function EmailLayout({
  preview,
  eyebrow,
  title,
  intro,
  children,
}: {
  preview: string;
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <Html lang="es">
      <Head>
        <meta
          name="format-detection"
          content="telephone=no,date=no,address=no,email=no"
        />
        <title>{`${title} · Luz en claro`}</title>
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "32px 16px",
          backgroundColor: theme.paper,
          color: theme.ink,
          fontFamily: theme.body,
          WebkitTextSizeAdjust: "100%",
        }}
      >
        <Container
          style={{ width: "100%", maxWidth: "560px", tableLayout: "fixed" }}
        >
          <Text
            data-skip-in-text="true"
            style={{
              margin: "0 8px 26px",
              fontFamily: theme.display,
              fontSize: "26px",
              lineHeight: "34px",
              letterSpacing: "-1.2px",
              color: theme.ink,
            }}
          >
            <strong>luz</strong>enclaro
            <span style={{ color: theme.olive, fontWeight: 700 }}>.</span>
          </Text>
          <Section
            style={{
              backgroundColor: "#ffffff",
              border: `1px solid ${theme.line}`,
              borderTop: `5px solid ${theme.lime}`,
              borderRadius: "16px",
              padding: "32px 24px",
            }}
          >
            <Text
              style={{
                margin: "0 0 18px",
                fontSize: "12px",
                lineHeight: "18px",
                fontWeight: 700,
                letterSpacing: "1.6px",
                color: theme.olive,
              }}
            >
              {eyebrow}
            </Text>
            <Heading
              as="h1"
              style={{
                margin: "0 0 16px",
                fontFamily: theme.display,
                fontSize: "32px",
                lineHeight: "39px",
                letterSpacing: "-1.1px",
                fontWeight: 700,
                color: theme.ink,
              }}
            >
              {title}
            </Heading>
            <Text style={paragraph}>{intro}</Text>
            {children}
            <Hr style={{ borderColor: theme.line, margin: "28px 0 22px" }} />
            <Text style={small}>
              Si no has solicitado este correo, puedes ignorarlo.
            </Text>
          </Section>
          <Section style={{ padding: "24px 8px 0" }}>
            <Text
              style={{
                ...small,
                margin: "0 0 8px",
                fontSize: "11px",
                lineHeight: "18px",
                letterSpacing: "1.5px",
                fontWeight: 700,
              }}
            >
              TU ENERGÍA. TUS NÚMEROS.
            </Text>
            <Text style={{ ...small, fontSize: "12px", lineHeight: "20px" }}>
              Luz en claro · Tu electricidad, bajo control.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default function AccountEmailTemplate(props: AccountEmailProps) {
  if (props.kind === "otp") {
    const action = otpAction(props.purpose);
    const title =
      props.purpose === "forget-password"
        ? "Recupera tu acceso."
        : props.purpose === "email-verification"
          ? "Verifica tu correo."
          : "Tu código de acceso.";
    return (
      <EmailLayout
        title={title}
        eyebrow="TU CUENTA, EN CLARO"
        preview={`Tu código para ${action}. Válido durante 10 minutos.`}
        intro={`Introduce este código en la app para ${action}.`}
      >
        <Section
          style={{
            padding: "24px 12px",
            backgroundColor: theme.ink,
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <Text
            style={{
              margin: "0 0 12px",
              fontSize: "11px",
              lineHeight: "18px",
              letterSpacing: "1.5px",
              color: "#ffffff",
            }}
          >
            TU CÓDIGO DE UN SOLO USO
          </Text>
          <Text
            style={{
              margin: 0,
              fontFamily: "'Courier New', monospace",
              fontSize: "36px",
              lineHeight: "46px",
              fontWeight: 700,
              letterSpacing: "6px",
              color: theme.lime,
              whiteSpace: "nowrap",
            }}
          >
            {props.otp}
          </Text>
        </Section>
        <Text
          style={{
            ...small,
            marginTop: "18px",
            fontSize: "14px",
            lineHeight: "23px",
          }}
        >
          Caduca en 10 minutos y solo se puede usar una vez.
        </Text>
        <Text style={{ ...small, marginTop: "8px" }}>
          No compartas este código con nadie.
        </Text>
      </EmailLayout>
    );
  }

  const reset = props.kind === "reset";
  const action = reset ? "Cambiar contraseña" : "Confirmar mi correo";
  return (
    <EmailLayout
      title={reset ? "Una nueva contraseña." : "Confirma tu correo."}
      eyebrow={reset ? "RECUPERA TU ACCESO" : "BIENVENIDO A LUZ EN CLARO"}
      preview={
        reset
          ? "Elige una nueva contraseña para tu cuenta de Luz en claro."
          : "Un último paso: verifica tu correo en Luz en claro."
      }
      intro={
        reset
          ? "Has solicitado cambiar tu contraseña de Luz en claro. Elige una nueva para volver a entrar en tu cuenta."
          : "Gracias por unirte a Luz en claro. Confirma que este correo es tuyo para completar la verificación de tu cuenta."
      }
    >
      <Button
        href={props.url}
        style={{
          padding: "16px 24px",
          backgroundColor: theme.ink,
          borderRadius: "9px",
          color: "#ffffff",
          fontSize: "16px",
          lineHeight: "22px",
          fontWeight: 700,
          textDecoration: "none",
          textAlign: "center",
        }}
      >
        {action}
      </Button>
      <Text style={{ ...small, margin: "26px 0 8px" }}>
        Si el botón no funciona, copia y pega este enlace en tu navegador:
      </Text>
      <Text
        style={{
          ...small,
          fontSize: "12px",
          lineHeight: "20px",
          wordBreak: "break-all",
          overflowWrap: "anywhere",
        }}
      >
        <Link
          href={props.url}
          style={{
            color: "#28704f",
            textDecoration: "underline",
            wordBreak: "break-all",
            overflowWrap: "anywhere",
          }}
        >
          {props.url}
        </Link>
      </Text>
    </EmailLayout>
  );
}

AccountEmailTemplate.PreviewProps = {
  kind: "otp",
  otp: "482916",
  purpose: "sign-in",
} satisfies AccountEmailProps;
