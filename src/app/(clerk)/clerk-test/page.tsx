export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Clerk Sandbox</h1>
      <p className="text-sm text-muted-foreground">This area is isolated for testing Clerk without affecting existing auth.</p>
      <ul className="list-disc pl-6 text-sm">
        <li>
          <a className="underline" href="/clerk-test/sign-in">Sign In</a>
        </li>
        <li>
          <a className="underline" href="/clerk-test/sign-up">Sign Up</a>
        </li>
        <li>
          <a className="underline" href="/clerk-test/protected">Protected Page (requires Clerk session)</a>
        </li>
      </ul>
    </div>
  );
}
