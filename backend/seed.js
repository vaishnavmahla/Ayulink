require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('☢️ Initiating Database Nuke...');

  // 1. Delete child records first
  await prisma.appointment.deleteMany();
  await prisma.healthReport.deleteMany();
  await prisma.prescription.deleteMany();

  // 2. Delete main profiles
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Database wiped clean! Paving new data...');

  // 3. Hash the universal password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 4. Generate 6 Doctors
  console.log('👨‍⚕️ Creating 6 Doctors...');
  for (let i = 1; i <= 6; i++) {
    await prisma.user.create({
      data: {
        email: `doctor${i}@gmail.com`,
        name: `Dr. Specialist ${i}`,
        password: hashedPassword,
        role: 'DOCTOR',
        doctorProfile: {          // <-- CHANGED THIS TO MATCH YOUR SCHEMA
          create: {
            specialization: 'General Physician',
          },
        },
      },
    });
  }

  // 5. Generate 6 Patients
  console.log('🧑‍ Creating 6 Patients...');
  for (let i = 1; i <= 6; i++) {
    await prisma.user.create({
      data: {
        email: `patient${i}@gmail.com`,
        name: `Test Patient ${i}`,
        password: hashedPassword,
        role: 'PATIENT',
        patientProfile: {         // <-- CHANGED THIS TO MATCH YOUR SCHEMA
          create: {
            medicalHistory: 'No major history',
          },
        },
      },
    });
  }

  console.log('✅ Nuke and Pave Complete! You are ready to go.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });