/**
 * Keeps only 2 clients and 2 leads in the database (by oldest createdAt).
 * Deletes the rest; relies on Prisma FK rules (cascade / set null).
 *
 * Usage: npx tsx scripts/trim-demo-data.ts
 *
 * To keep the **newest** 2 instead, change orderBy to `{ createdAt: "desc" }`.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP = 2;

async function main() {
  const [clientCount, leadCount] = await Promise.all([
    prisma.client.count(),
    prisma.lead.count(),
  ]);

  console.log(`Before: ${clientCount} clients, ${leadCount} leads`);

  const clientsToKeep = await prisma.client.findMany({
    orderBy: { createdAt: "asc" },
    take: KEEP,
    select: { id: true },
  });
  const keepClientIds = clientsToKeep.map((c) => c.id);

  const leadsToKeep = await prisma.lead.findMany({
    orderBy: { createdAt: "asc" },
    take: KEEP,
    select: { id: true },
  });
  const keepLeadIds = leadsToKeep.map((l) => l.id);

  if (clientCount > KEEP) {
    const deleted = await prisma.client.deleteMany({
      where: { id: { notIn: keepClientIds } },
    });
    console.log(`Deleted ${deleted.count} clients (kept ids: ${keepClientIds.join(", ")})`);
  } else {
    console.log(`Clients: skip delete (count ${clientCount} <= ${KEEP})`);
  }

  if (leadCount > KEEP) {
    const deleted = await prisma.lead.deleteMany({
      where: { id: { notIn: keepLeadIds } },
    });
    console.log(`Deleted ${deleted.count} leads (kept ids: ${keepLeadIds.join(", ")})`);
  } else {
    console.log(`Leads: skip delete (count ${leadCount} <= ${KEEP})`);
  }

  const [afterC, afterL] = await Promise.all([
    prisma.client.count(),
    prisma.lead.count(),
  ]);
  console.log(`After: ${afterC} clients, ${afterL} leads`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
