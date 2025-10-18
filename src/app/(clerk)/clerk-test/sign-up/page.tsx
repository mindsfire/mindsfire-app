"use client";
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex justify-center">
      <SignUp routing="hash" signInUrl="/clerk-test/sign-in" />
    </div>
  );
}
