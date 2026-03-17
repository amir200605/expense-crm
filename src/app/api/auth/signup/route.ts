import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8),
  role: z.enum(["AGENT", "MANAGER"]).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { name, username, password, role } = parsed.data;
    const existing = await prisma.user.findFirst({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username already taken." }, { status: 400 });
    }
    const agency = await prisma.agency.findFirst();
    if (!agency) {
      return NextResponse.json(
        { error: "No agency exists. Run seed to create one." },
        { status: 400 }
      );
    }
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        username,
        email: `${username}@placeholder.local`,
        password: hashed,
        agencyId: agency.id,
        role: role ?? "AGENT",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sign up failed." }, { status: 500 });
  }
}
