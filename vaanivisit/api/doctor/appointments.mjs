// GET /api/doctor/appointments
import { corsHeaders } from "../_shared.mjs";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  return res.json({
    appointments: [
      { id: "apt-1", time: "09:00 AM", patientName: "Riya Singh", age: 24, gender: "Female", type: "Follow-up", status: "Completed" },
      { id: "apt-2", time: "10:30 AM", patientName: "Amit Kumar", age: 38, gender: "Male", type: "Consultation", status: "In Progress" },
      { id: "apt-3", time: "12:00 PM", patientName: "Neha Gupta", age: 31, gender: "Female", type: "New Patient", status: "Upcoming" },
      { id: "apt-4", time: "02:30 PM", patientName: "Pooja Sharma", age: 29, gender: "Female", type: "Follow-up", status: "Upcoming" },
      { id: "apt-5", time: "04:00 PM", patientName: "Rajesh Yadav", age: 45, gender: "Male", type: "Consultation", status: "Upcoming" },
    ],
  });
}
