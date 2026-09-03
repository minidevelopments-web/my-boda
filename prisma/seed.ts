import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./data/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
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
