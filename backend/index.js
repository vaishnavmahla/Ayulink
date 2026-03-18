require('dotenv').config(); 
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const app = express();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.use(express.json());


const cors = require('cors'); // 1. Import cors
app.use(cors());              // 2. Allow frontend to connect


// Security Guard Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token." });
    req.user = user; // Attach user info (id and role) to the request
    next(); // Move to the next step
  });
};

const jwt = require('jsonwebtoken');
const JWT_SECRET = "svnit_ayulink_secret_key"; // In production, move this to .env

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

    // 3. Generate a JWT Token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: "Login successful", token, role: user.role, name: user.name });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});



app.get('/', (req, res) => {
  res.send('Ayulink Healthcare API is running!');
});

// Create a new User and their linked Profile (Patient/Doctor)
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password, role, specialization } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword, 
        role: role || 'PATIENT' 
      },
    });

    if (newUser.role === 'PATIENT') {
      await prisma.patient.create({
        data: { userId: newUser.id }
      });
    } else if (newUser.role === 'DOCTOR') {
      await prisma.doctor.create({
        data: { 
          userId: newUser.id, 
          specialization: specialization || 'General Physician' 
        }
      });
    }

    res.status(201).json({ message: "User and profile created successfully", user: newUser });
  } catch (error) {
    console.error("USER CREATION ERROR:", error);
    res.status(500).json({ error: "Failed to create user. Email might already exist." });
  }
});

// Add 'authenticateToken' here to protect it
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// Fetch all Doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch doctors." });
  }
});

app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const { symptoms, heartRate, temperature } = req.body;
    
    // Find patient record
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.userId }
    });

    // Futuristic Logic: Automated Triage
    let urgencyLevel = "NORMAL";
    let diagnosis = "General check-up recommended. Symptoms appear non-critical.";

    const urgentKeywords = ['chest pain', 'breathless', 'vision', 'paralysis'];
    const lowerSymptoms = symptoms.toLowerCase();

    if (urgentKeywords.some(kw => lowerSymptoms.includes(kw)) || heartRate > 120 || temperature > 103) {
      urgencyLevel = "CRITICAL";
      diagnosis = "🚨 URGENT: Potential cardiac or severe systemic distress detected. Please head to SVNIT Health Center or nearest ER immediately.";
    }

    const report = await prisma.healthReport.create({
      data: {
        patientId: patient.id,
        symptoms,
        diagnosis,
        // We'll assume your schema has an urgency field, or we just prepend it to diagnosis
      }
    });

    res.status(201).json({ message: "AI Analysis Complete", report, urgencyLevel });
  } catch (error) {
    res.status(500).json({ error: "Analysis failed" });
  }
});

// View Patient History
app.get('/api/patients/:id/reports', async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const patientHistory = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { name: true, email: true } },
        reports: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!patientHistory) return res.status(404).json({ error: "Patient not found" });
    res.json(patientHistory);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch patient history" });
  }
});


app.get('/api/patients', async (req, res) => {
  const patients = await prisma.patient.findMany({
    include: { user: { select: { name: true } } }
  });
  res.json(patients);
});

// --- BOOK AN APPOINTMENT ---
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;

    // 1. Securely find the patient based on their login token
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.userId }
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient profile not found. Please log in again." });
    }

    // 2. Create the appointment in the database
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,       // Let the backend securely set this!
        doctorId: parseInt(doctorId),
        date: new Date(date),        // e.g., "2026-10-10"
        status: "SCHEDULED"
      }
    });

    res.status(201).json({ message: "Appointment Confirmed!", appointment });
  } catch (error) {
    console.error("Booking Error Details:", error);
    res.status(500).json({ error: "Failed to book appointment in the database." });
  }
});

// 2. View Doctor's Schedule
app.get('/api/doctors/:id/appointments', async (req, res) => {
  try {
    const doctorId = parseInt(req.params.id);
    const schedule = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        appointments: {
          include: { patient: { include: { user: { select: { name: true } } } } }
        }
      }
    });
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});


// Fetch reports for the logged-in patient
app.get('/api/my-reports', authenticateToken, async (req, res) => {
  try {
    // 1. Find the patient record linked to this User ID
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.userId }
    });

    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    // 2. Get all reports for this patient
    const reports = await prisma.healthReport.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// --- 1. GET ALL DOCTORS FOR BOOKING ---
app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    
    // Formatting for the frontend
    const formattedDoctors = doctors.map(doc => ({
      id: doc.id,
      name: doc.user.name,
      specialization: doc.specialization || "General Physician",
      availableSlots: ["10:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"] // We will make this dynamic later!
    }));

    res.json(formattedDoctors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// --- 2. BOOK AN APPOINTMENT ---
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;

    // Find the patient making the request
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.userId }
    });

    // Create the appointment in the database
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: parseInt(doctorId),
        date: new Date(date), // e.g., "2026-03-20"
        status: "SCHEDULED"
      }
    });

    res.status(201).json({ message: "Appointment Confirmed!", appointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to book appointment" });
  }
});

// --- GET DOCTOR'S APPOINTMENTS (WAITING ROOM) ---
app.get('/api/doctor/appointments', authenticateToken, async (req, res) => {
  try {
    // 1. Check if the logged-in user is actually a Doctor
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.userId }
    });

    // Security Check: If they aren't a doctor, block access!
    if (!doctor) {
      return res.status(403).json({ error: "Access denied. Doctor profile not found." });
    }

    // 2. Fetch all appointments assigned to this doctor
    const appointments = await prisma.appointment.findMany({
      where: { 
        doctorId: doctor.id,
        status: "SCHEDULED" // Only get active appointments
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true } } // Pull the patient's name!
          }
        }
      },
      orderBy: { date: 'asc' } // Sort by closest date first
    });

    res.json(appointments);
  } catch (error) {
    console.error("Fetch Appointments Error:", error);
    res.status(500).json({ error: "Failed to fetch the waiting room queue." });
  }
});

// --- GET SPECIFIC PATIENT'S VITALS (DOCTOR VIEW) ---
app.get('/api/doctor/patients/:patientId/reports', authenticateToken, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    
    // Security check: Ensure the requester is actually a doctor
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } });
    if (!doctor) return res.status(403).json({ error: "Access denied." });

    const reports = await prisma.healthReport.findMany({
      where: { patientId: patientId },
      orderBy: { createdAt: 'desc' },
      take: 10 // Grab the 10 most recent reports
    });

    res.json(reports);
  } catch (error) {
    console.error("Fetch Patient Reports Error:", error);
    res.status(500).json({ error: "Failed to fetch patient history." });
  }
});

// --- DOCTOR: SAVE NEW VITALS / PRESCRIPTION ---
app.post('/api/doctor/patients/:patientId/reports', authenticateToken, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    // 1. We grab 'notes' from the frontend req.body now!
    const { bloodPressure, sugarLevel, heartRate, notes } = req.body;

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } });
    if (!doctor) return res.status(403).json({ error: "Access denied." });

    const newReport = await prisma.healthReport.create({
      data: {
        patientId,
        bloodPressure: bloodPressure || "120/80",
        sugarLevel: parseInt(sugarLevel) || 100,
        heartRate: parseInt(heartRate) || 75,
        oxygenLevel: 98, 
        temperature: 98.6,
        stressIndex: 40,
        sleepScore: 80,
        // 2. THIS IS THE FIX! We pass the notes into the required symptoms field.
        symptoms: notes || "Routine clinical visit. No major symptoms.",
        diagnosis: "General Checkup" // <--- ADD THIS LINE TO SATISFY PRISMA!
      }
    });

    res.json({ message: "Vitals securely logged to patient record.", report: newReport });
  } catch (error) {
    console.error("Save Report Error:", error);
    res.status(500).json({ error: "Failed to save clinical data." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// --- TEMPORARY DOCTOR SETUP ROUTE ---
app.get('/api/setup-doctor', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs'); 
    const hashedPassword = await bcrypt.hash("doctor123", 10);

    const doctor = await prisma.user.upsert({
      where: { email: "doctor@ayulink.com" },
      update: { password: hashedPassword },
      create: {
        name: "Dr. Aditi Verma",
        email: "doctor@ayulink.com",
        password: hashedPassword,
        role: "DOCTOR",
        doctorProfile: {    // <--- THIS IS THE FIX! Changed 'doctor' to 'doctorProfile'
          create: { specialization: "Cardiologist" }
        }
      }
    });
    
    res.json({ 
      message: "✅ DOCTOR ACCOUNT CREATED SUCCESSFULLY!", 
      email: "doctor@ayulink.com", 
      password: "doctor123" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});