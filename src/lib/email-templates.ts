import { createElement } from "react";
import { render, toPlainText } from "react-email";
import AccountEmailTemplate, {
  accountEmailSubject,
  type AccountEmailProps,
} from "../emails/account-email";

export type AccountEmail = {
  subject: string;
  text: string;
  html: string;
};

async function renderAccountEmail(
  props: AccountEmailProps,
): Promise<AccountEmail> {
  const html = await render(createElement(AccountEmailTemplate, props));
  return { subject: accountEmailSubject(props), text: toPlainText(html), html };
}

export function accountLinkEmail(url: string, reset: boolean) {
  return renderAccountEmail({ kind: reset ? "reset" : "verification", url });
}

export function accountOtpEmail(otp: string, type: string) {
  return renderAccountEmail({ kind: "otp", otp, purpose: type });
}
