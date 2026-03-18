require('dotenv').config(); // <-- THIS IS THE MAGIC LINE WE MISSED!
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // or 'bcrypt' depending on what you installed
const prisma = new PrismaClient();

async function main() {
  // 1. Hash the password
  const hashedPassword = await bcrypt.hash("doctor123", 10);

  // 2. Create the User and the connected Doctor profile
  const doctor = await prisma.user.upsert({
    where: { email: "doctor@ayulink.com" },
    update: { password: hashedPassword }, // If exists, just update password
    create: {
      name: "Dr. Aditi Verma",
      email: "doctor@ayulink.com",
      password: hashedPassword,
      role: "DOCTOR",
      doctor: {
        create: { specialization: "Cardiologist" }
      }
    }
  });

  console.log("✅ DOCTOR ACCOUNT READY!");
  console.log("------------------------");
  console.log("Email:    doctor@ayulink.com");
  console.log("Password: doctor123");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });