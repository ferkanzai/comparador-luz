"use client";
// shadcn Input OTP composition, in the app's look: six large slots.
import { useContext, type ComponentProps } from "react";
import { OTPInput, OTPInputContext } from "input-otp";

export function InputOTP(props: ComponentProps<typeof OTPInput>) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName="group/otp relative flex w-full has-[input:disabled]:opacity-60"
      spellCheck={false}
      {...props}
    />
  );
}
export function InputOTPGroup(props: ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className="grid w-full grid-cols-6 gap-2"
      {...props}
    />
  );
}
export function InputOTPSlot({ index }: { index: number }) {
  const context = useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = context.slots[index];
  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className="relative grid h-14 place-items-center rounded-md border border-input bg-card text-2xl/[1.6] font-semibold text-foreground group-has-[input[aria-invalid=true]]/otp:border-destructive data-[active=true]:border-primary data-[active=true]:outline-2 data-[active=true]:outline-offset-2 data-[active=true]:outline-primary"
      aria-hidden="true"
    >
      {char}
      {hasFakeCaret && (
        <span className="absolute h-6 w-0.5 animate-caret-blink bg-primary motion-reduce:animate-none" />
      )}
    </div>
  );
}
