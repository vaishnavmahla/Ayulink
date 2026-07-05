require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); // ✨ Real Email Package
const twilio = require('twilio');

const app = express();

// --- SOCKET.IO & SERVER SETUP ---
const server = http.createServer(app); 
const io = new Server(server, {        
  cors: { origin: "*", methods: ["GET", "POST", "PUT"] }
});

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "svnit_ayulink_secret_key"; 

// --- REAL EMAIL ENGINE (NODEMAILER) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- REAL EMAIL ENGINE (WITH TEST INTERCEPTOR) ---
// --- REAL EMAIL ENGINE (DUAL-ROUTING INTERCEPTOR) ---
const sendEmail = async (toEmail, subject, body) => {
  
  // 1. Set up the two real destinations
  const MY_PATIENT_EMAIL = "vkdmahla7240@gmail.com";
  const MY_DOCTOR_EMAIL = "mahlavaishnav@gmail.com";

  // 2. Decide where it goes based on the original test email
  let FINAL_DESTINATION_EMAIL = "";
  let userType = "";

  if (toEmail.toLowerCase().includes('doctor')) {
      FINAL_DESTINATION_EMAIL = MY_DOCTOR_EMAIL;
      userType = "DOCTOR";
  } else {
      FINAL_DESTINATION_EMAIL = MY_PATIENT_EMAIL;
      userType = "PATIENT";
  }

  console.log(`\n🕵️‍♂️ [TEST MODE: ${userType}] Intercepted email meant for: ${toEmail}`);
  console.log(`➡️  Rerouting to real inbox: ${FINAL_DESTINATION_EMAIL}`);

  try {
    await transporter.sendMail({
      from: `"Ayulink Pro" <${process.env.EMAIL_USER}>`,
      to: FINAL_DESTINATION_EMAIL, 
      subject: `[For: ${toEmail}] ${subject}`, 
      text: body, 
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <div style="background-color: #fef08a; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 12px; color: #854d0e; text-align: center; font-weight: bold;">
            🧪 TEST MODE INTERCEPT: This email was originally intended for ${toEmail}
          </div>
          <h2 style="color: #2563eb; margin-top: 0;">Ayulink Healthcare</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.5;">${body}</p>
          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 25px 0;" />
          <p style="color: #64748b; font-size: 12px; text-align: center;">This is an automated notification from your secure Ayulink portal.</p>
        </div>
      `
    });
    console.log(`✅ ROUTED SUCCESSFULLY TO: ${FINAL_DESTINATION_EMAIL}\n`);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
  }
};

// --- REAL SMS ENGINE (FAST2SMS INTERCEPTOR) ---
// --- REAL SMS ENGINE (TWILIO INTERCEPTOR) ---
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendSMS = async (toPhone, message) => {
  
  // ⚠️ YOUR VERIFIED REAL PHONE NUMBER (Must include country code, e.g., +91 for India)
  const MY_REAL_PHONE = "+919313902393"; // <-- PUT YOUR ACTUAL NUMBER HERE

  console.log(`\n🕵️‍♂️ [TEST MODE SMS] Intercepted text meant for: ${toPhone || 'Empty DB Number'}`);
  console.log(`➡️  Rerouting to your verified phone: ${MY_REAL_PHONE}`);

  try {
    const response = await twilioClient.messages.create({
      body: `Ayulink Alert: ${message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: MY_REAL_PHONE
    });
    console.log(`✅ TWILIO SMS SENT! Message SID: ${response.sid}\n`);
  } catch (error) {
    console.error("❌ Failed to send Twilio SMS:", error.message);
  }
};

// --- SECURITY MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token." });
    req.user = user; 
    next(); 
  });
};

// --- BASIC ROUTES ---
app.get('/', (req, res) => {
  res.send('Ayulink Healthcare API is running!');
});

// --- AUTHENTICATION & USERS ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

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
      await prisma.patient.create({ data: { userId: newUser.id } });
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

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// --- PATIENT ROUTES ---
app.get('/api/patients', async (req, res) => {
  const patients = await prisma.patient.findMany({
    include: { user: { select: { name: true } } }
  });
  res.json(patients);
});

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
app.delete('/api/admin/reset-data', async (req, res) => {
  try {
    // 1. Wipe out the dashboard metrics (Vital Signs & History)
    await prisma.healthReport.deleteMany({}); 
    
    // 2. Wipe out the medications
    await prisma.prescription.deleteMany({}); 
    
    // 3. Wipe out the appointments/queue
    await prisma.appointment.deleteMany({}); 

    res.status(200).json({ 
      success: true, 
      message: "Data wiped: Appointments, Vitals, and Prescriptions are gone." 
    });

  } catch (error) {
    console.error("Error wiping data:", error);
    res.status(500).json({ success: false, message: "Server error during cleanup" });
  }
});

app.patch('/api/patients/:id/complete', async (req, res) => {
  const { id } = req.params;
  // Example using Mongoose:
  await Patient.findByIdAndUpdate(id, { status: 'completed' });
  res.json({ message: 'Patient removed from queue' });
});

app.get('/api/my-reports', authenticateToken, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.userId }
    });

    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const reports = await prisma.healthReport.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const { symptoms, heartRate, temperature } = req.body;
    
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.userId }
    });

    let urgencyLevel = "NORMAL";
    let diagnosis = "General check-up recommended. Symptoms appear non-critical.";
    const urgentKeywords = ['chest pain', 'breathless', 'vision', 'paralysis'];
    const lowerSymptoms = symptoms.toLowerCase();

    if (urgentKeywords.some(kw => lowerSymptoms.includes(kw)) || heartRate > 120 || temperature > 103) {
      urgencyLevel = "CRITICAL";
      diagnosis = "🚨 URGENT: Potential cardiac or severe systemic distress detected. Please head to SVNIT Health Center or nearest ER immediately.";
    }

    const report = await prisma.healthReport.create({
      data: { patientId: patient.id, symptoms, diagnosis }
    });

    res.status(201).json({ message: "AI Analysis Complete", report, urgencyLevel });
  } catch (error) {
    res.status(500).json({ error: "Analysis failed" });
  }
});

// --- DOCTOR ROUTES ---
app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: { user: { select: { name: true, email: true } } }
    });
    
    const formattedDoctors = doctors.map(doc => ({
      id: doc.id,
      name: doc.user.name,
      specialization: doc.specialization || "General Physician",
      availableSlots: ["10:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"] 
    }));

    res.json(formattedDoctors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

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

// --- BOOKING ENGINE (WITH NOTIFICATIONS & AUTO-EXPIRE) ---
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;

    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.userId },
      include: { user: true } // We need this to get patient email/phone!
    });

    const doctor = await prisma.doctor.findUnique({
      where: { id: parseInt(doctorId) },
      include: { user: true } // We need this to get doctor email/phone!
    });

    if (!patient || !doctor) return res.status(404).json({ error: "Profiles not found." });

    // 1. THE BULLETPROOF BLOCKER
    const existingAppointment = await prisma.appointment.findFirst({
      where: { doctorId: parseInt(doctorId), date: new Date(date), time: time, status: { in: ["PENDING", "APPROVED"] } }
    });
    if (existingAppointment) return res.status(400).json({ error: "Slot unavailable!" });

    // 2. Create the appointment
    const appointment = await prisma.appointment.create({
      data: { patientId: patient.id, doctorId: parseInt(doctorId), date: new Date(date), time: time, status: 'PENDING' }
    });

    // 3. SEND REAL ALERTS TO DOCTOR
    sendEmail(doctor.user.email, "🚨 Action Required: New Appointment Request", `Patient ${patient.user.name} requested a slot at ${time}. Please log in to your dashboard to approve or reject this request within 10 minutes.`);
    sendSMS(doctor.user.phone, `Ayulink: New appointment request from ${patient.user.name}. You have 10 minutes to accept.`);

    io.emit("new_booking_alert", { doctorId: parseInt(doctorId), message: "New patient in the waiting room!" });

    res.status(201).json({ message: "Appointment Confirmed!", appointment });

    // 4. START THE COUNTDOWN TIMER (15 SECONDS FOR TESTING)
    const TIMEOUT_MS = 15 * 1000; 

    setTimeout(async () => {
      try {
        // Check if it's STILL pending after time runs out
        const checkAppt = await prisma.appointment.findUnique({ where: { id: appointment.id } });
        
        if (checkAppt && checkAppt.status === 'PENDING') {
          // Auto-Cancel it safely!
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { status: 'CANCELLED' } 
          });

          // Tell Doctor screen to refresh
          io.emit("new_booking_alert", {}); 
          
          // Tell Patient their request timed out
          io.emit("appointment_expired", { patientId: patient.id });
          
          // Alert Patient
          sendEmail(patient.user.email, "⏱️ Appointment Request Expired", `The doctor did not respond in time for your ${time} slot. The request has been cancelled. Please book a different time.`);
          sendSMS(patient.user.phone, `Ayulink: Your request at ${time} expired. The doctor is currently unavailable.`);
        }
      } catch (timeoutErr) {
        console.error("⚠️ Timeout Safety Catch:", timeoutErr);
      }
    }, TIMEOUT_MS);

  } catch (error) {
    console.error("Booking Error Details:", error);
    res.status(500).json({ error: "Failed to book appointment." });
  }
});

// --- DOCTOR DASHBOARD ROUTES ---
app.get('/api/doctor/appointments', authenticateToken, async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } });
    if (!doctor) return res.status(403).json({ error: "Access denied. Doctor profile not found." });

    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      include: {
        patient: { include: { user: { select: { name: true, email: true } } } }
      },
      orderBy: { date: 'asc' } 
    });

    res.json(appointments);
  } catch (error) {
    console.error("Fetch Appointments Error:", error);
    res.status(500).json({ error: "Failed to fetch the waiting room queue." });
  }
});

app.get('/api/doctor/patients/:patientId/reports', authenticateToken, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } });
    if (!doctor) return res.status(403).json({ error: "Access denied." });

    const reports = await prisma.healthReport.findMany({
      where: { patientId: patientId },
      orderBy: { createdAt: 'desc' },
      take: 10 
    });

    res.json(reports);
  } catch (error) {
    console.error("Fetch Patient Reports Error:", error);
    res.status(500).json({ error: "Failed to fetch patient history." });
  }
});

app.post('/api/doctor/patients/:patientId/reports', authenticateToken, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
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
        symptoms: notes || "Routine clinical visit. No major symptoms.",
        diagnosis: "General Checkup" 
      }
    });

    res.json({ message: "Vitals securely logged to patient record.", report: newReport });
  } catch (error) {
    console.error("Save Report Error:", error);
    res.status(500).json({ error: "Failed to save clinical data." });
  }
});

// ✨ APPROVE APPOINTMENT
app.put('/api/doctor/appointments/:appointmentId/approve', authenticateToken, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.appointmentId);
    
    // Update and pull patient info for the email!
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "APPROVED" },
      include: { patient: { include: { user: true } } }
    });

    // Alert Patient
    sendEmail(updatedAppointment.patient.user.email, "✅ Appointment Confirmed!", `Great news! Your slot for ${updatedAppointment.time} has been officially approved by the doctor.`);
    sendSMS(updatedAppointment.patient.user.phone, `Ayulink: ✅ Good news! Your appointment at ${updatedAppointment.time} is approved.`);

    io.emit("appointment_approved", { 
      appointmentId: updatedAppointment.id, date: updatedAppointment.date.toISOString().split("T")[0], time: updatedAppointment.time
    });
    res.json({ message: "Approved successfully", appointment: updatedAppointment });
  } catch (error) { res.status(500).json({ error: "Failed to approve." }); }
});

// ✨ REJECT APPOINTMENT
app.put('/api/doctor/appointments/:appointmentId/reject', authenticateToken, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.appointmentId);
    
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
      include: { patient: { include: { user: true } } }
    });

    // Alert Patient
    sendEmail(updatedAppointment.patient.user.email, "❌ Appointment Declined", `Unfortunately, the doctor is unavailable for the ${updatedAppointment.time} slot. Please log in and choose a different time.`);
    sendSMS(updatedAppointment.patient.user.phone, `Ayulink: ❌ Sorry, your appointment at ${updatedAppointment.time} was declined. Please choose another slot.`);

    io.emit("appointment_declined", { appointmentId: updatedAppointment.id });
    res.json({ message: "Rejected successfully", appointment: updatedAppointment });
  } catch (error) { res.status(500).json({ error: "Failed to reject." }); }
});

// --- TEMPORARY SETUP ROUTES (UPDATE THESE WITH YOUR REAL EMAILS TO TEST!) ---
app.get('/api/setup-patient', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10); 
    const myRealEmail = "vkdmahla7240@gmail.com"; // ⚠️ CHANGE TO YOUR REAL GMAIL
    
    const patient = await prisma.user.upsert({
      where: { email: myRealEmail },
      update: { password: hashedPassword },
      create: {
        name: "Test Patient (Me)",
        email: myRealEmail,
        password: hashedPassword,
        role: "PATIENT",
        patientProfile: { create: {} }
      }
    });
    res.json({ message: "✅ PATIENT ACCOUNT READY!", email: myRealEmail, password: "password123" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/setup-doctor', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash("doctor123", 10);
    const docEmail = "vkdmahla7240@gmail.com"; // ⚠️ CHANGE TO YOUR REAL GMAIL IF YOU WANT TO SEE DOCTOR ALERTS
    
    const doctor = await prisma.user.upsert({
      where: { email: docEmail },
      update: { password: hashedPassword },
      create: {
        name: "Dr. Aditi Verma",
        email: docEmail,
        password: hashedPassword,
        role: "DOCTOR",
        doctorProfile: { create: { specialization: "Cardiologist" } }
      }
    });
    res.json({ message: "✅ DOCTOR ACCOUNT READY!", email: docEmail, password: "doctor123" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patients/queue', async (req, res) => {
  // Example using Mongoose:
  const waitingPatients = await Patient.find({ status: 'waiting' });
  res.json(waitingPatients);
});

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {  
  console.log(`Server & Sockets running on http://localhost:${PORT}`);
});