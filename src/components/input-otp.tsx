"use client";
// shadcn Input OTP composition, styled with this app's existing CSS tokens.
import { useContext, type ComponentProps } from "react";
import { OTPInput, OTPInputContext } from "input-otp";

export function InputOTP(props: ComponentProps<typeof OTPInput>) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName="otp-control"
      spellCheck={false}
      {...props}
    />
  );
}
export function InputOTPGroup(props: ComponentProps<"div">) {
  return <div data-slot="input-otp-group" className="otp-group" {...props} />;
}
export function InputOTPSlot({ index }: { index: number }) {
  const context = useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = context.slots[index];
  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className="otp-slot"
      aria-hidden="true"
    >
      {char}
      {hasFakeCaret && <span className="otp-caret" />}
    </div>
  );
}
