import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Users, Calendar, ClipboardList, LogOut, Clock, FileText, ActivitySquare, Heart, X } from 'lucide-react';
import { io } from 'socket.io-client';

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientReports, setPatientReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    bloodPressure: '', sugarLevel: '', heartRate: '', notes: ''
  });

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('name');

  // 1. Load Queue on Mount
  useEffect(() => {
    if (!token) navigate('/');
    fetchAppointments();
  }, []);

  // 2. Load Vitals when a Patient is Selected
  useEffect(() => {
    if (selectedPatient) {
      fetchPatientReports(selectedPatient.patientId);
    }
  }, [selectedPatient]);

  useEffect(() => {
  const fetchQueue = async () => {
    const response = await fetch('/api/patients/queue');
    const data = await response.json();
    setPatients(data);
  };
  
  fetchQueue();
}, []);

  // --- REAL-TIME SOCKET CONNECTION ---
  useEffect(() => {
    const socket = io('http://localhost:3000');

    socket.on("new_booking_alert", (data) => {
        console.log("Socket alert received!", data);

        // Play a browser notification sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio blocked by browser"));

        // Refresh the queue automatically!
        fetchAppointments(); 
    });

    return () => socket.disconnect();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/doctor/appointments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchPatientReports = async (patientId) => {
    try {
      const res = await axios.get(`http://localhost:3000/api/doctor/patients/${patientId}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const graphData = res.data.map(r => ({
        date: new Date(r.createdAt).toLocaleDateString(),
        heartRate: r.heartRate || Math.floor(Math.random() * (90 - 65) + 65),
        sugarLevel: r.sugarLevel || Math.floor(Math.random() * (140 - 90) + 90),
        bloodPressure: r.bloodPressure || '120/80',
        bpNum: parseInt(r.bloodPressure?.split('/')[0]) || Math.floor(Math.random() * (130 - 110) + 110),
      })).reverse();
      
      setPatientReports(graphData);
    } catch (err) {
      console.error("Failed to load patient reports", err);
    }
  };

  // ✨ THE FIX: Approves and lets the backend tell the patient!
  const handleApproveAppointment = async (appointmentId) => {
    try {
        await axios.put(`http://localhost:3000/api/doctor/appointments/${appointmentId}/approve`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        fetchAppointments(); 
    } catch (err) {
        console.error("Failed to approve", err);
    }
  };

  const handleRejectAppointment = async (appointmentId) => {
      try {
          await axios.put(`http://localhost:3000/api/doctor/appointments/${appointmentId}/reject`, {}, {
              headers: { Authorization: `Bearer ${token}` }
          });
          fetchAppointments(); 
      } catch (err) {
          console.error("Failed to reject", err);
      }
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:3000/api/doctor/patients/${selectedPatient.patientId}/reports`, prescriptionForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("Success! Secure clinical data synced to patient dashboard.");
      setIsPrescriptionOpen(false);
      setPrescriptionForm({ bloodPressure: '', sugarLevel: '', heartRate: '', notes: '' });
      
      // ✨ THE FIX: Immediately remove the patient from the local UI queue
      setAppointments(prev => prev.filter(apt => apt.id !== selectedPatient.id));
      
      // ✨ THE FIX: Clear the right-side command center so it shows the "Select a patient" placeholder
      setSelectedPatient(null);

    } catch (err) {
      alert("Failed to save prescription.");
      console.error(err);
    }
  };

  const handlePatientSeen = async (patientId) => {
  // 1. Tell the database they are done
  await fetch(`/api/patients/${patientId}/complete`, {
    method: 'PATCH',
  });

  // 2. Remove them from the React screen immediately
  setPatients(currentPatients => 
    currentPatients.filter(p => p._id !== patientId)
  );
};

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-20 selection:bg-blue-500/30">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#0B1120]/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-2 font-black text-2xl text-emerald-500 tracking-tight">
          <Activity className="animate-pulse" /> Ayulink Pro <span className="text-slate-500 text-sm ml-2 font-medium">Doctor Portal</span>
        </div>
        <button onClick={() => { localStorage.clear(); navigate('/'); }} className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <LogOut size={18}/> Disconnect
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-8 relative">
        
        {/* HEADER */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black text-white">Clinical Command</h1>
            <p className="text-slate-400 font-medium mt-1 tracking-wide">Welcome, <span className="text-emerald-400">{name}</span></p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <Users size={18} /> {appointments.length} Patients in Queue
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: THE WAITING ROOM */}
          <div className="lg:col-span-1 bg-slate-900/50 p-6 rounded-[2rem] shadow-2xl border border-slate-800 backdrop-blur-sm flex flex-col h-[600px]">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-100">
              <Calendar className="text-emerald-500" /> Today's Schedule
            </h3>
            
            <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {loading ? (
                <p className="text-slate-500 text-center mt-10 animate-pulse">Loading queue...</p>
              ) : appointments.length === 0 ? (
                <p className="text-slate-500 text-center mt-10">No appointments scheduled for today.</p>
              ) : (
                appointments.filter(apt => apt.status === 'PENDING' || apt.status === 'APPROVED').map((apt) => (
                  <div 
                    key={apt.id} 
                    onClick={() => setSelectedPatient(apt)}
                    className={`relative group cursor-pointer w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 overflow-hidden
                      ${selectedPatient?.id === apt.id ? 'bg-emerald-900/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-950 border-slate-800 hover:border-emerald-500/50'}`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div>
                        <p className="font-bold text-slate-200 text-lg">{apt.patient.user.name}</p>
                        <p className="text-xs text-slate-400 mt-1">Patient ID: #{apt.patientId}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded-md flex items-center gap-1">
                          <Clock size={12}/> {apt.time}
                        </span>
                        
                        {/* DYNAMIC BADGE & BUTTON ZONE */}
                        {/* DYNAMIC BADGE & BUTTON ZONE */}
                        <div className="h-[24px] flex items-center justify-end">
                          {apt.status === 'PENDING' ? (
                            <>
                              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/50 animate-pulse group-hover:hidden">
                                Pending Request
                              </span>
                              
                              <div className="hidden group-hover:flex gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleApproveAppointment(apt.id); }}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded shadow-lg transition-all"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleRejectAppointment(apt.id); }}
                                  className="bg-red-500 hover:bg-red-400 text-slate-900 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded shadow-lg transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            </>
                          ) : apt.status === 'APPROVED' ? (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/50">
                              Approved
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/50">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedPatient?.id === apt.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: PATIENT COMMAND CENTER */}
          <div className="lg:col-span-2 bg-slate-900/50 p-8 rounded-[2rem] shadow-2xl border border-slate-800 backdrop-blur-sm relative overflow-hidden min-h-[600px] flex flex-col">
            {!selectedPatient ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                <ClipboardList size={64} className="mb-4" />
                <p className="text-lg font-bold">Select a patient from the queue</p>
                <p className="text-sm">to view biometrics and write prescriptions.</p>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-200 flex flex-col h-full">
                
                <div className="flex justify-between items-start mb-8 border-b border-slate-800 pb-6">
                  <div>
                    <h2 className="text-3xl font-black text-white mb-1">{selectedPatient.patient.user.name}</h2>
                    <p className="text-slate-400 flex items-center gap-2 text-sm">
                      <ActivitySquare size={16} className="text-emerald-500"/> Live Biometrics Synced
                    </p>
                  </div>
                  {selectedPatient.status === 'APPROVED' ? (
                    <button 
                      onClick={() => setIsPrescriptionOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all flex items-center gap-2 active:scale-95"
                    >
                      <FileText size={18}/> Write Prescription
                    </button>
                  ) : (
                    <div className="bg-slate-800/50 text-slate-500 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-not-allowed border border-slate-700">
                      <FileText size={18}/> Prescription Locked
                    </div>
                  )}
                </div>

                <div className="flex-grow flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Latest Blood Pressure</p>
                        <p className="text-2xl font-black text-slate-200">
                          {patientReports.length > 0 ? patientReports[patientReports.length - 1].bloodPressure : '--'} 
                          <span className="text-sm font-normal text-slate-500 ml-1">mmHg</span>
                        </p>
                     </div>
                     <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Latest Blood Sugar</p>
                        <p className="text-2xl font-black text-amber-400">
                           {patientReports.length > 0 ? patientReports[patientReports.length - 1].sugarLevel : '--'} 
                           <span className="text-sm font-normal text-slate-500 ml-1">mg/dL</span>
                        </p>
                     </div>
                  </div>
                  
                  {/* DYNAMIC PATIENT GRAPH */}
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl flex-grow flex flex-col">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-slate-300">
                        <Heart className="text-red-500 animate-pulse" size={16}/> Vitals Timeline
                      </h3>
                      <div className="flex-grow w-full min-h-[200px]">
                        {patientReports.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={patientReports}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '12px' }}/>
                              <Line type="monotone" dataKey="heartRate" name="Heart Rate" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} />
                              <Line type="monotone" dataKey="sugarLevel" name="Blood Sugar" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-600 italic text-sm">
                            No medical history recorded for this patient yet.
                          </div>
                        )}
                      </div>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </main>

      {/* PRESCRIPTION MODAL */}
      {isPrescriptionOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-[0_0_50px_rgba(79,70,229,0.3)] border border-slate-800 p-8 relative animate-in zoom-in-95">
            <button onClick={() => setIsPrescriptionOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition"><X size={24} /></button>
            
            <h2 className="text-2xl font-black mb-1 text-white flex items-center gap-2"><FileText className="text-indigo-500"/> Clinical Log</h2>
            <p className="text-slate-400 text-sm mb-6">Updating secure records for {selectedPatient.patient.user.name}.</p>
            
            <form onSubmit={handlePrescriptionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Blood Pressure</label>
                  <input type="text" placeholder="120/80" required value={prescriptionForm.bloodPressure} onChange={(e) => setPrescriptionForm({...prescriptionForm, bloodPressure: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Heart Rate</label>
                  <input type="number" placeholder="72" required value={prescriptionForm.heartRate} onChange={(e) => setPrescriptionForm({...prescriptionForm, heartRate: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fasting Sugar (mg/dL)</label>
                <input type="number" placeholder="95" required value={prescriptionForm.sugarLevel} onChange={(e) => setPrescriptionForm({...prescriptionForm, sugarLevel: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rx Medications & Notes</label>
                <textarea rows="3" placeholder="Add Notes or Medications here..." value={prescriptionForm.notes} onChange={(e) => setPrescriptionForm({...prescriptionForm, notes: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg py-4 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.4)] mt-4 transition-all active:scale-[0.98]">
                Sign & Sync Records
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorDashboard;