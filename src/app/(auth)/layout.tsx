import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))] p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          E
        </div>
        <span className="font-semibold text-lg tracking-tight text-foreground">ExpenseFlow</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
