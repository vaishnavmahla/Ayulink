import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Calendar, Clipboard, LogOut, Pill, Heart, Plus, X, Clock, User as UserIcon, Wind, Thermometer, Bot, Send, CheckCircle, MapPin, AlertOctagon, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons not showing in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Red Icon for Hospitals
const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States for Futuristic Features
  const [activeMetrics, setActiveMetrics] = useState(['heartRate']); 
  const [takenMeds, setTakenMeds] = useState([]);
  
  // Dynamic Environment Data State
  const [envData, setEnvData] = useState({
    city: "", temp: "--", aqi: "--", status: "Loading", advisory: "Detecting location...", lat: null, lon: null
  });
  
  // AI Chat State
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Hello. I am the Ayulink Triage AI. How are you feeling today?' }
  ]);
  const [showEmergency, setShowEmergency] = useState(false);
  
  // Map State
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Booking State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [bookingForm, setBookingForm] = useState({ doctorId: '', date: '', time: '' });

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('name');

  const metricsConfig = [
    { id: 'heartRate', label: 'Heart Rate', color: '#ef4444' },
    { id: 'oxygenLevel', label: 'Oxygen (SpO2)', color: '#3b82f6' },
    { id: 'bloodPressure', label: 'Blood Pressure', color: '#8b5cf6' },
    { id: 'sugarLevel', label: 'Blood Sugar', color: '#f59e0b' },
    { id: 'temperature', label: 'Temperature', color: '#f97316' },
    { id: 'stressIndex', label: 'Stress Level', color: '#ec4899' },
    { id: 'sleepScore', label: 'Sleep Quality', color: '#10b981' }
  ];

  useEffect(() => {
    if (!token) navigate('/');
    fetchHealthData();
    fetchDynamicLocation();
  }, []);

  const fetchDynamicLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        try {
          // Get City Name
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const geoData = await geoRes.json();
          const rawCity = geoData.address.city || geoData.address.state_district || geoData.address.town || "Your Area";
          const city = rawCity.replace(' District', '').replace(' Zone', '');
          
          // Get Weather & AQI
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`);
          const weatherData = await weatherRes.json();
          const temp = Math.round(weatherData.current.temperature_2m);

          const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`);
          const aqiData = await aqiRes.json();
          const currentAqi = aqiData.current.us_aqi;

          let status = "Good", adv = "Air quality is ideal. Great day for outdoor activities.";
          if (currentAqi > 50) { status = "Moderate"; adv = "Acceptable air quality. Sensitive groups should limit outdoor exertion."; }
          if (currentAqi > 100) { status = "Unhealthy"; adv = "Pollution levels are high. Asthmatic patients should wear a mask outdoors."; }
          if (currentAqi > 150) { status = "Severe"; adv = "🚨 DANGER: Severe air pollution. Remain indoors."; }

          setEnvData({ city, temp, aqi: currentAqi, status, advisory: adv, lat, lon });
        } catch (error) {
          console.error("API Error", error);
          setEnvData(prev => ({ ...prev, city: "Location Found", lat, lon }));
        }
      }, (error) => {
        setEnvData({ city: "Location Denied", temp: "--", aqi: "--", status: "Unknown", advisory: "Enable location for health warnings.", lat: 21.1702, lon: 72.8311 });
      });
    }
  };

  const fetchHealthData = async () => {
    try {
      const reportRes = await axios.get('http://localhost:3000/api/my-reports', { headers: { Authorization: `Bearer ${token}` }});
      const graphData = reportRes.data.map(r => ({
        date: new Date(r.createdAt).toLocaleDateString(),
        oxygenLevel: r.oxygenLevel || Math.floor(Math.random() * (100 - 95) + 95),
        bloodPressure: parseInt(r.bloodPressure?.split('/')[0]) || Math.floor(Math.random() * (130 - 110) + 110),
        sugarLevel: r.sugarLevel || Math.floor(Math.random() * (140 - 90) + 90),
        heartRate: r.heartRate || Math.floor(Math.random() * (90 - 65) + 65),
        temperature: r.temperature || parseFloat((Math.random() * (99.5 - 97.5) + 97.5).toFixed(1)),
        stressIndex: r.stressIndex || Math.floor(Math.random() * (80 - 20) + 20),
        sleepScore: r.sleepScore || Math.floor(Math.random() * (100 - 60) + 60),
      })).reverse();
      setReports(graphData);
      setLoading(false);
    } catch (err) { console.error(err); }
  };

  const toggleMetric = (metricId) => setActiveMetrics(prev => prev.includes(metricId) ? prev.filter(id => id !== metricId) : [...prev, metricId]);
  const toggleMedication = (medId) => setTakenMeds(prev => prev.includes(medId) ? prev.filter(id => id !== medId) : [...prev, medId]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');

    setTimeout(() => {
      let aiResponse = "I've logged your symptoms. Keep monitoring your vitals.";
      const inputLower = newMsg.text.toLowerCase();

      if (inputLower.includes('chest') || inputLower.includes('pain') || inputLower.includes('breath') || inputLower.includes('dizzy')) {
        aiResponse = "🚨 HIGH RISK DETECTED: Your symptoms match severe cardiac distress profiles. Please seek immediate help.";
        setShowEmergency(true);
      }
      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    }, 1000);
  };

  const openBookingModal = async () => {
    setIsBookingOpen(true);
    try {
      const res = await axios.get('http://localhost:3000/api/doctors', { headers: { Authorization: `Bearer ${token}` } });
      setDoctors(res.data);
    } catch (err) { console.error("Failed to load doctors", err); }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/appointments', bookingForm, { headers: { Authorization: `Bearer ${token}` } });
      alert("Appointment Confirmed!");
      setIsBookingOpen(false);
      setBookingForm({ doctorId: '', date: '', time: '' });
    } catch (err) { alert(err.response?.data?.error || "Failed to book appointment."); }
  };

  // Generate dynamic hospitals around user's location
  const getMockHospitals = () => {
    if (!envData.lat) return [];
    return [
      { id: 1, name: "Civil Hospital (Trauma Center)", lat: envData.lat + 0.012, lon: envData.lon + 0.005, type: "Public" },
      { id: 2, name: "Apex Heart Institute", lat: envData.lat - 0.008, lon: envData.lon - 0.015, type: "Private" },
      { id: 3, name: "Sanjivani Multispeciality", lat: envData.lat + 0.005, lon: envData.lon - 0.02, type: "Private" }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-20 selection:bg-blue-500/30">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#0B1120]/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-2 font-black text-2xl text-blue-500 tracking-tight"><Activity className="animate-pulse" /> Ayulink Pro</div>
        <button onClick={() => { localStorage.clear(); navigate('/'); }} className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><LogOut size={18}/> Disconnect</button>
      </nav>

      <main className="max-w-7xl mx-auto p-8 relative">
        
        {/* HEADER */}
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black text-white">Health Command</h1>
            <p className="text-slate-400 font-medium mt-1 tracking-wide">Encrypted biometrics for <span className="text-blue-400">{name}</span></p>
          </div>
          <button onClick={openBookingModal} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95 flex items-center gap-2">
            <Plus size={20}/> Book Appointment
          </button>
        </header>

        {/* ENVIRONMENT WIDGET */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-800 p-4 rounded-2xl mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-700 text-sky-400"><Wind /></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{envData.city ? `${envData.city}` : "Detecting Location..."}</p>
              <p className="text-sm text-slate-300 mt-1 flex items-center gap-3">
                <span><Thermometer size={14} className="inline mr-1 text-orange-400"/> {envData.temp}°C</span>
                <span className={`border px-2 py-0.5 rounded text-xs font-bold ${envData.aqi > 100 ? 'text-red-400 border-red-400/30 bg-red-400/10' : envData.aqi > 50 ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'}`}>
                  AQI: {envData.aqi}
                </span>
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 max-w-md">
            <strong className={envData.aqi > 100 ? "text-red-400" : "text-emerald-400"}>Advisory:</strong> {envData.advisory}
          </div>
        </div>

        {/* GRAPHS & MEDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          
          {/* GRAPH */}
          <div className="lg:col-span-2 bg-slate-900/50 p-8 rounded-[2rem] shadow-2xl border border-slate-800 backdrop-blur-sm flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-100 whitespace-nowrap"><Heart className="text-red-500 animate-pulse" /> Vital Signs Timeline</h3>
              <div className="flex flex-wrap gap-2 justify-end">
                {metricsConfig.map(m => (
                  <button key={m.id} onClick={() => toggleMetric(m.id)} style={{ backgroundColor: activeMetrics.includes(m.id) ? `${m.color}20` : 'transparent', borderColor: activeMetrics.includes(m.id) ? m.color : '#334155', color: activeMetrics.includes(m.id) ? m.color : '#94a3b8' }} className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95">{m.label}</button>
                ))}
              </div>
            </div>
            <div className="h-[300px] w-full flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reports}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" /><XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '12px' }} itemStyle={{ fontWeight: 'bold' }}/>
                  {metricsConfig.map(m => activeMetrics.includes(m.id) && <Line key={m.id} type="monotone" dataKey={m.id} name={m.label} stroke={m.color} strokeWidth={3} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={500} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {activeMetrics.length === 0 && <p className="text-center text-slate-500 text-sm mt-4 italic">Select a metric above to view data.</p>}
          </div>

          {/* MEDS TRACKER */}
          <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 p-8 rounded-[2rem] shadow-2xl border border-blue-900/30 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-blue-200"><Pill className="text-blue-400" /> Daily Medication</h3>
              <p className="text-xs text-slate-400 mb-4">Click to mark as taken today.</p>
              <div className="space-y-3">
                {['Atorvastatin', 'Metformin'].map(med => (
                  <button key={med} onClick={() => toggleMedication(med)} className={`w-full text-left p-4 rounded-2xl border backdrop-blur-md transition-all flex justify-between items-center group ${takenMeds.includes(med) ? 'bg-emerald-900/20 border-emerald-500/30 opacity-60' : 'bg-slate-950/50 border-slate-800/80 hover:border-blue-500/50'}`}>
                    <div>
                      <p className={`font-bold ${takenMeds.includes(med) ? 'text-emerald-500 line-through' : 'text-blue-400'}`}>{med}</p>
                      <p className="text-xs text-slate-400 mt-1">{med === 'Atorvastatin' ? '10mg • Night' : '500mg • After meal'}</p>
                    </div>
                    <CheckCircle className={`transition-all ${takenMeds.includes(med) ? 'text-emerald-500 scale-110' : 'text-slate-700 group-hover:text-blue-400'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 opacity-5 text-blue-500"><Pill size={200} /></div>
          </div>
        </div>

        {/* APPOINTMENTS & LOGS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 shadow-2xl backdrop-blur-sm">
                <h3 className="font-bold mb-6 flex items-center gap-2 text-purple-400"><Calendar className="text-purple-500" /> Scheduled Meetings</h3>
                <div className="p-4 border border-purple-500/20 bg-purple-500/10 rounded-2xl flex justify-between items-center hover:border-purple-500/40 transition-colors">
                    <div>
                        <p className="font-bold text-slate-200">Dr. Aditi Verma</p>
                        <p className="text-xs text-slate-400">Cardiology Specialist</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-purple-400">March 20</p>
                        <p className="text-xs text-purple-500/70">10:30 AM</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 shadow-2xl backdrop-blur-sm">
                <h3 className="font-bold mb-6 flex items-center gap-2 text-orange-400"><Clipboard className="text-orange-500" /> Consult History</h3>
                <p className="text-slate-500 text-sm italic mb-4">Recent medical logs recorded.</p>
                <div className="space-y-3">
                  {reports.length > 0 ? reports.slice(0, 3).map((r, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 flex justify-between items-center hover:border-slate-600 transition-colors cursor-pointer">
                      <span className="text-sm font-medium text-slate-300">Report #{reports.length - i}</span>
                      <span className="text-xs text-slate-500">{r.date}</span>
                    </div>
                  )) : <p className="text-slate-500 text-sm">No reports found.</p>}
                </div>
            </div>
        </div>
      </main>

      {/* AI BOT CHAT */}
      <button onClick={() => setIsAIOpen(!isAIOpen)} className="fixed bottom-8 right-8 bg-indigo-600 text-white p-4 rounded-full shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:bg-indigo-500 transition-all z-50 hover:scale-110">
        {isAIOpen ? <X size={28} /> : <Bot size={28} />}
      </button>

      {isAIOpen && (
        <div className="fixed bottom-24 right-8 w-96 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col">
          <div className="bg-indigo-600 p-4 flex items-center gap-3"><Bot className="text-indigo-200" /><div><h3 className="font-bold text-white">Ayulink AI</h3></div></div>
          
          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-slate-950 flex flex-col">
            {chatMessages.map((msg, idx) => (<div key={idx} className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'ai' ? 'bg-slate-800 text-slate-200 self-start rounded-tl-none' : 'bg-indigo-600 text-white self-end rounded-tr-none'}`}>{msg.text}</div>))}
            
            {showEmergency && envData.lat && (
              <div className="bg-red-950/50 border border-red-500 p-4 rounded-xl mt-4 animate-pulse">
                <p className="text-red-400 text-xs font-bold mb-2 flex items-center gap-2"><AlertOctagon size={14}/> EMERGENCY ROUTING ACTIVATED</p>
                <button onClick={() => setIsMapOpen(true)} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                  <MapPin size={16}/> Find Hospitals near {envData.city || 'you'}
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-indigo-500" placeholder="Type symptoms..."/>
            <button type="submit" className="bg-indigo-600 p-2 rounded-full text-white"><Send size={16} /></button>
          </form>
        </div>
      )}

      {/* EMERGENCY MAP MODAL */}
      {isMapOpen && envData.lat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-4xl rounded-[2rem] shadow-[0_0_50px_rgba(220,38,38,0.4)] border border-red-900/50 p-6 relative overflow-hidden flex flex-col">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2"><AlertOctagon className="text-red-500 animate-pulse"/> Nearest Medical Centers</h2>
              <button onClick={() => setIsMapOpen(false)} className="text-slate-500 hover:text-white transition"><X size={24} /></button>
            </div>

            <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-700 relative z-10">
              <MapContainer center={[envData.lat, envData.lon]} zoom={13} style={{ height: "100%", width: "100%", zIndex: 1 }}>
                
                {/* Dark Mode Map Tiles */}
                <TileLayer 
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                />
                
                {/* User Location */}
                <Marker position={[envData.lat, envData.lon]}>
                  <Popup><div className="text-slate-900 font-bold">You are here</div></Popup>
                </Marker>

                {/* Nearby Hospitals */}
                {getMockHospitals().map(hospital => (
                  <Marker key={hospital.id} position={[hospital.lat, hospital.lon]} icon={hospitalIcon}>
                    <Popup>
                      <div className="text-slate-900">
                        <strong className="block text-sm">{hospital.name}</strong>
                        <span className="text-xs text-red-600 font-bold">{hospital.type} Facility</span>
                        <button 
  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${envData.lat},${envData.lon}&destination=${hospital.lat},${hospital.lon}`, '_blank')}
  className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded flex items-center justify-center gap-1 transition-colors font-bold shadow-lg active:scale-95"
>
  <Navigation size={14}/> Start Route
</button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 p-8 relative">
            <button onClick={() => setIsBookingOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition"><X size={24} /></button>
            <h2 className="text-2xl font-black mb-1 text-white flex items-center gap-2"><Calendar className="text-blue-500"/> Schedule Visit</h2>
            <p className="text-slate-400 text-sm mb-6">Select an available specialist and time slot.</p>
            
            <form onSubmit={handleBookAppointment} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><UserIcon size={14}/> Select Specialist</label>
                <select required className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={bookingForm.doctorId} onChange={(e) => setBookingForm({...bookingForm, doctorId: e.target.value})}>
                  <option value="" disabled>-- Choose a Doctor --</option>
                  {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.name || "Dr. Aditi Verma"} ({doc.specialization})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Calendar size={14}/> Select Date</label>
                <input type="date" required min={new Date().toISOString().split("T")[0]} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:dark]" value={bookingForm.date} onChange={(e) => setBookingForm({...bookingForm, date: e.target.value, time: ''})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Clock size={14}/> Available Slots</label>
                <div className="grid grid-cols-2 gap-3">
                  {["10:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"].map(slot => {
                    let isAvailable = true;
                    if (bookingForm.date) {
                      const now = new Date();
                      const [time, modifier] = slot.split(' ');
                      let [hours, minutes] = time.split(':');
                      hours = parseInt(hours, 10);
                      if (hours === 12 && modifier === 'AM') hours = 0;
                      if (hours < 12 && modifier === 'PM') hours += 12;
                      const slotDate = new Date(bookingForm.date);
                      slotDate.setHours(hours, parseInt(minutes, 10), 0, 0);
                      isAvailable = slotDate > now;
                    }
                    return (
                      <button key={slot} type="button" disabled={!isAvailable || !bookingForm.date} onClick={() => setBookingForm({...bookingForm, time: slot})} className={`p-3 rounded-xl border font-bold text-sm transition-all ${!bookingForm.date ? 'opacity-50 cursor-not-allowed bg-slate-950 border-slate-800 text-slate-600' : !isAvailable ? 'opacity-30 cursor-not-allowed bg-slate-900 border-red-900/30 text-red-500/50 line-through' : bookingForm.time === slot ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'}`}>{slot}</button>
                    );
                  })}
                </div>
              </div>
              <button type="submit" disabled={!bookingForm.time} className={`w-full font-black text-lg py-4 rounded-xl shadow-lg mt-4 transition-all active:scale-[0.98] ${!bookingForm.time ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>Confirm Appointment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;