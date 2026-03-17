import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  const agency = await prisma.agency.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      name: "Demo Final Expense Agency",
      slug: "demo-agency",
      billingEmail: "billing@demoagency.com",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@demoagency.com" },
    update: {},
    create: {
      email: "owner@demoagency.com",
      name: "Alex Owner",
      password: hashedPassword,
      role: "AGENCY_OWNER",
      agencyId: agency.id,
    },
  });

  const managers = await Promise.all([
    prisma.user.upsert({
      where: { email: "manager1@demoagency.com" },
      update: {},
      create: {
        email: "manager1@demoagency.com",
        name: "Morgan Manager",
        password: hashedPassword,
        role: "MANAGER",
        agencyId: agency.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "manager2@demoagency.com" },
      update: {},
      create: {
        email: "manager2@demoagency.com",
        name: "Jordan Manager",
        password: hashedPassword,
        role: "MANAGER",
        agencyId: agency.id,
      },
    }),
  ]);

  const agents = await Promise.all([
    prisma.user.upsert({
      where: { email: "agent1@demoagency.com" },
      update: {},
      create: {
        email: "agent1@demoagency.com",
        name: "Sam Agent",
        password: hashedPassword,
        role: "AGENT",
        agencyId: agency.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "agent2@demoagency.com" },
      update: {},
      create: {
        email: "agent2@demoagency.com",
        name: "Casey Agent",
        password: hashedPassword,
        role: "AGENT",
        agencyId: agency.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "agent3@demoagency.com" },
      update: {},
      create: {
        email: "agent3@demoagency.com",
        name: "Riley Agent",
        password: hashedPassword,
        role: "AGENT",
        agencyId: agency.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "agent4@demoagency.com" },
      update: {},
      create: {
        email: "agent4@demoagency.com",
        name: "Quinn Agent",
        password: hashedPassword,
        role: "AGENT",
        agencyId: agency.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "agent5@demoagency.com" },
      update: {},
      create: {
        email: "agent5@demoagency.com",
        name: "Taylor Agent",
        password: hashedPassword,
        role: "AGENT",
        agencyId: agency.id,
      },
    }),
  ]);

  const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "William", "Elizabeth"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
  const states = ["TX", "FL", "CA", "OH", "GA", "NC", "PA", "IL", "MI", "AZ"];
  const sources = ["Facebook", "Direct Mail", "TV Lead", "Internet", "Referral"];

  const leads: { id: string }[] = [];
  for (let i = 0; i < 100; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / 10) % lastNames.length];
    const lead = await prisma.lead.create({
      data: {
        agencyId: agency.id,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        phone: `555${String(i).padStart(7, "0")}`,
        email: i % 3 === 0 ? `lead${i}@example.com` : null,
        source: sources[i % sources.length],
        state: states[i % states.length],
        disposition: ["NEW", "CONTACTED", "INTERESTED", "APPOINTMENT_SET", "SOLD", "NOT_INTERESTED"][i % 6] as "NEW" | "CONTACTED" | "INTERESTED" | "APPOINTMENT_SET" | "SOLD" | "NOT_INTERESTED",
        pipelineStage: ["NEW_LEAD", "CONTACTING", "QUOTED", "APPOINTMENT_SET", "UNDERWRITING", "PLACED"][i % 6] as "NEW_LEAD" | "CONTACTING" | "QUOTED" | "APPOINTMENT_SET" | "UNDERWRITING" | "PLACED",
        assignedAgentId: agents[i % agents.length].id,
        assignedManagerId: managers[i % 2].id,
        lastContactedAt: i % 4 === 0 ? new Date(Date.now() - 86400000 * (i % 7)) : null,
        nextFollowUpAt: i % 5 === 0 ? new Date(Date.now() + 86400000 * (i % 5 + 1)) : null,
      },
    });
    leads.push(lead);
  }

  const clients: { id: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const firstName = firstNames[(i + 3) % firstNames.length];
    const lastName = lastNames[(i + 2) % lastNames.length];
    const client = await prisma.client.create({
      data: {
        agencyId: agency.id,
        linkedLeadId: leads[i]?.id ?? null,
        firstName,
        lastName,
        phone: `555${String(200 + i).padStart(7, "0")}`,
        email: `client${i}@example.com`,
        city: "Houston",
        state: "TX",
        zip: "77001",
        beneficiaryName: "Spouse",
        carrier: i % 2 === 0 ? "AIG" : "Mutual of Omaha",
        productName: "Final Expense Whole Life",
        faceAmount: 10000 + (i % 5) * 5000,
        premiumAmount: 50 + (i % 4) * 15,
        policyStatus: "Placed",
        agentOfRecordId: agents[i % agents.length].id,
      },
    });
    clients.push(client);
  }

  for (let i = 0; i < 20; i++) {
    await prisma.policy.create({
      data: {
        clientId: clients[i % clients.length].id,
        policyNumber: `POL-${1000 + i}`,
        carrier: i % 2 === 0 ? "AIG" : "Mutual of Omaha",
        productName: "Final Expense",
        faceAmount: 10000,
        premium: 65,
        policyStatus: i % 5 === 0 ? "PENDING_UNDERWRITING" : "PLACED",
        effectiveDate: new Date(Date.now() - 86400000 * (i % 90)),
        chargebackWindowEnd: new Date(Date.now() + 86400000 * (180 - i)),
      },
    });
  }

  const policies = await prisma.policy.findMany({ take: 10 });
  for (let i = 0; i < 10; i++) {
    const p = policies[i];
    if (!p) continue;
    const client = await prisma.client.findUnique({ where: { id: p.clientId } });
    if (!client) continue;
    await prisma.commission.create({
      data: {
        agentId: client.agentOfRecordId ?? agents[0].id,
        clientId: client.id,
        policyId: p.id,
        carrier: p.carrier ?? "AIG",
        product: p.productName ?? "Final Expense",
        amount: 150 + i * 20,
        expectedDate: new Date(Date.now() + 86400000 * 30),
        status: i % 3 === 0 ? "RECEIVED" : "EXPECTED",
      },
    });
  }

  const chargebackPolicies = await prisma.policy.findMany({ take: 5 });
  for (let i = 0; i < 5; i++) {
    const p = chargebackPolicies[i];
    if (!p) continue;
    await prisma.chargeback.create({
      data: {
        policyId: p.id,
        agentId: agents[i].id,
        amount: 200,
        reason: "Policy lapsed within chargeback window",
        date: new Date(),
        recovered: i % 2 === 0,
      },
    });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  for (let i = 0; i < 15; i++) {
    await prisma.task.create({
      data: {
        title: `Call lead - ${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
        dueDate: new Date(Date.now() + 86400000 * (i % 5)),
        assignedToId: agents[i % agents.length].id,
        relatedLeadId: leads[i]?.id ?? null,
        status: i % 4 === 0 ? "COMPLETED" : "PENDING",
        type: "CALL",
      },
    });
  }

  for (let i = 0; i < 10; i++) {
    await prisma.appointment.create({
      data: {
        leadId: leads[i + 10]?.id ?? null,
        agentId: agents[i % agents.length].id,
        date: new Date(Date.now() + 86400000 * (i % 7)),
        startTime: "10:00",
        endTime: "10:30",
        type: "PHONE",
        status: "SCHEDULED",
      },
    });
  }

  console.log("Seed completed: agency, owner, 2 managers, 5 agents, 100 leads, 30 clients, 20 policies, commissions, chargebacks, tasks, appointments.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
