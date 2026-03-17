import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * Ensures the admin user exists (username: admin, password: admin123).
 * Also ensures demo users exist with password "password123" for backward compatibility.
 * Call this if you can't login (e.g. after fresh DB or first run).
 */
export async function POST() {
  try {
    const adminPassword = await bcrypt.hash("admin123", 10);
    const demoPassword = await bcrypt.hash("password123", 10);

    let agency = await prisma.agency.findFirst();
    if (!agency) {
      agency = await prisma.agency.create({
        data: {
          name: "Demo Final Expense Agency",
          slug: "demo-agency",
          billingEmail: "billing@demoagency.com",
        },
      });
    }

    // Admin user: username "admin", password "admin123"
    await prisma.user.upsert({
      where: { username: "admin" },
      update: { password: adminPassword },
      create: {
        username: "admin",
        email: "admin@example.com",
        name: "Admin",
        password: adminPassword,
        role: "AGENCY_OWNER",
        agencyId: agency.id,
      },
    });

    // Legacy demo users (email-based, password "password123")
    const demos = [
      { email: "owner@demoagency.com", name: "Alex Owner", role: "AGENCY_OWNER" as const },
      { email: "manager1@demoagency.com", name: "Morgan Manager", role: "MANAGER" as const },
      { email: "manager2@demoagency.com", name: "Jordan Manager", role: "MANAGER" as const },
      { email: "agent1@demoagency.com", name: "Sam Agent", role: "AGENT" as const },
      { email: "agent2@demoagency.com", name: "Casey Agent", role: "AGENT" as const },
    ];
    for (const d of demos) {
      await prisma.user.upsert({
        where: { email: d.email },
        update: { password: demoPassword },
        create: {
          email: d.email,
          name: d.name,
          password: demoPassword,
          role: d.role,
          agencyId: agency.id,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Admin user ready. Use username: admin, password: admin123",
    });
  } catch (e) {
    console.error("ensure-demo-user failed:", e);
    return NextResponse.json(
      {
        error:
          "Could not ensure admin user. Is the database connected? Try: npx prisma generate then restart the dev server.",
      },
      { status: 500 }
    );
  }
}
