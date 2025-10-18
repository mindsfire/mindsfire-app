"use client";
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex justify-center">
      <SignIn routing="hash" signUpUrl="/clerk-test/sign-up" />
    </div>
  );
}
