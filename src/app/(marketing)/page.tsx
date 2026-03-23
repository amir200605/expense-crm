import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, Zap, Shield, BarChart3, Quote, CheckCircle2, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground text-base font-bold shadow-sm">
              P
            </div>
            <span className="font-semibold text-lg tracking-tight">Prime Insurance Agency CRM</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="font-medium">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button className="font-medium shadow-sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" aria-hidden="true" />
          <div className="container mx-auto max-w-6xl px-4 py-20 md:py-32">
            <div className="relative mx-auto max-w-3xl text-center">
              <p className="text-sm font-medium uppercase tracking-wider text-primary mb-4">
                Final expense CRM
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                Built for agencies
                <br />
                <span className="text-primary">that close.</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto">
                Capture leads, track policies, automate follow-up, and grow your book—all in one insurance-specific platform.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="min-w-[180px] text-base shadow-md">
                    Start free trial
                  </Button>
                </Link>
                <Link href="/interested">
                  <Button size="lg" variant="outline" className="min-w-[160px] text-base">
                    Get in touch
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="ghost" className="min-w-[120px] text-base">
                    Sign in
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  No credit card required
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Free trial
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Cancel anytime
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Social proof / testimonial */}
        <section className="border-t border-border/80 bg-muted/20 py-16 md:py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground mb-8">
              Trusted by final expense agencies
            </p>
            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl border border-border/80 bg-card p-8 md:p-10 shadow-card">
                <Quote className="h-10 w-10 text-primary/30 mb-4" aria-hidden="true" />
                <blockquote className="text-lg md:text-xl text-foreground leading-relaxed">
                  &ldquo;We switched to ExpenseFlow and our follow-up time dropped. The automations and lead assignment alone paid for it in the first month.&rdquo;
                </blockquote>
                <footer className="mt-6 text-sm text-muted-foreground">
                  — Agency owner, final expense
                </footer>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Everything you need to close more
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Purpose-built for final expense: from first lead to policy and beyond.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group rounded-2xl border border-border/80 bg-card p-6 shadow-soft transition-all hover:shadow-card hover:border-primary/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">Lead management</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Capture, assign, and track leads with dispositions and pipeline stages.
                </p>
              </div>
              <div className="group rounded-2xl border border-border/80 bg-card p-6 shadow-soft transition-all hover:shadow-card hover:border-primary/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">Speed to contact</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Automations and tasks keep your team following up fast.
                </p>
              </div>
              <div className="group rounded-2xl border border-border/80 bg-card p-6 shadow-soft transition-all hover:shadow-card hover:border-primary/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">Compliance-ready</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Audit logs, notes, and replacement disclosure tracking.
                </p>
              </div>
              <div className="group rounded-2xl border border-border/80 bg-card p-6 shadow-soft transition-all hover:shadow-card hover:border-primary/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">Reports & commissions</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Dashboards and exports for owners, managers, and agents.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/80 bg-muted/30 py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ready to close more?
            </h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              Join agencies using ExpenseFlow to grow their book with less admin and faster follow-up.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="gap-2 text-base shadow-md">
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/interested">
                <Button size="lg" variant="outline" className="text-base">
                  Get in touch
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/80 py-8">
          <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
            ExpenseFlow CRM — Final expense insurance sales platform
          </div>
        </footer>
      </main>
    </div>
  );
}
