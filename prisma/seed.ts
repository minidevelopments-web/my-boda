import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// guestNeedsSetup(): true when User table empty → /setup must run.
// Bootstrap (run manually, never commit real passwords):
//   ADMIN_EMAIL=sysadmin@example.com ADMIN_BOOTSTRAP_PW='...' npx prisma db seed
async function bootstrapSysadmin(db: PrismaClient) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const bootstrapPw = process.env.ADMIN_BOOTSTRAP_PW;
  if (adminEmail && bootstrapPw) {
    const exists = await db.user.count();
    if (exists === 0) {
      await db.user.create({ data: { email: adminEmail, passwordHash: await bcrypt.hash(bootstrapPw, 12), role: "SYSADMIN" } });
      console.log(`[seed] bootstrap sysadmin ${adminEmail}`);
    }
  }
}

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://myboda:myboda@localhost:5432/myboda";
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await bootstrapSysadmin(prisma);
  // Clear existing
  await prisma.rsvpResponse.deleteMany();
  await prisma.guest.deleteMany();

  const guests = await Promise.all([
    prisma.guest.create({
      data: {
        name: "Lena Müller",
        email: "lena@example.com",
        category: "family",
        plusOne: true,
        plusOneName: "Max Müller",
        rsvp: {
          create: {
            attending: true,
            headcount: 2,
            mealChoice: "vegetarian",
            dietaryNotes: "No nuts",
            message: "So excited!",
          },
        },
      },
      include: { rsvp: true },
    }),
    prisma.guest.create({
      data: {
        name: "Carlos García",
        email: "carlos@example.com",
        category: "friends",
        rsvp: {
          create: {
            attending: true,
            headcount: 1,
            mealChoice: "meat",
            message: "Can't wait!",
          },
        },
      },
      include: { rsvp: true },
    }),
    prisma.guest.create({
      data: {
        name: "Anna Schmidt",
        email: "anna@example.com",
        category: "colleagues",
        rsvp: {
          create: {
            attending: false,
            headcount: 1,
            message: "Sorry, can't make it",
          },
        },
      },
      include: { rsvp: true },
    }),
  ]);

  console.log(`Seeded ${guests.length} guests`);
  for (const g of guests) {
    console.log(`- ${g.name} (${g.category}) attending=${g.rsvp?.attending}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
