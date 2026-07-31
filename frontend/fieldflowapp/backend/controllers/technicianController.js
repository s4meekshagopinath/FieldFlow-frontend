const Technician = require("../models/Technician");
const Booking = require("../models/Booking");
const JobTracking = require("../models/JobTracking");
const pool = require("../config/db");

async function getMyProfile(req, res) {
  try {
    const result = await Technician.findById(req.user.id);
    if (!result.rows.length)
      return res.status(404).json({ error: "Technician not found." });
    const u = result.rows[0];
    res.json({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      category: u.category,
      experience: u.experience,
      workingArea: u.working_area,
      availableToday: u.available_today,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAllTechnicians(req, res) {
  try {
    const result = await Technician.findAll();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTechnicianById(req, res) {
  try {
    const result = await Technician.findById(req.params.id);
    if (!result.rows.length) return res.status(404).json({ error: "Technician not found." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function toggleAvailability(req, res) {
  try {
    const result = await Technician.toggleAvailability(req.params.id, req.body.available);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getDashboard(req, res) {
  try {
    const technicianId = req.user.id;

    // Reuse existing model — joins dispatcher_assignments → bookings
    const { rows: allJobs } = await Booking.findByTechnician(technicianId);

    // Counts from bookings.status
    const assignedJobs = allJobs.filter((b) => b.status === "Assigned").length;
    const completed    = allJobs.filter((b) => b.status === "Completed").length;

    // In-progress count from job_tracking.current_status (source of truth)
    const { rows: inProgressRows } = await pool.query(
      `SELECT COUNT(*) FROM job_tracking
       WHERE technician_id = $1 AND current_status = 'In Progress'`,
      [technicianId]
    );
    const inProgress = parseInt(inProgressRows[0].count, 10);

    // Next upcoming job — nearest future booking_date assigned to this technician
    const { rows: nextRows } = await pool.query(
      `SELECT
         b.id           AS "bookingId",
         s.name         AS service,
         u.name         AS customer,
         b.address      AS location,
         b.booking_date AS "scheduledDate",
         b.booking_time AS "scheduledTime"
       FROM dispatcher_assignments da
       JOIN bookings b  ON b.id  = da.booking_id
       JOIN services s  ON s.id  = b.service_id
       JOIN users u     ON u.id  = b.user_id
       WHERE da.technician_id = $1
         AND b.booking_date >= CURRENT_DATE
         AND b.status NOT IN ('Completed', 'Cancelled')
       ORDER BY b.booking_date ASC, b.booking_time ASC
       LIMIT 1`,
      [technicianId]
    );

    res.json({
      assignedJobs,
      inProgress,
      completed,
      nextJob: nextRows[0] ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getMyJobs(req, res) {
  try {
    const result = await Booking.findByTechnicianWithDetails(req.user.id);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getJobById(req, res) {
  try {
    const result = await Booking.findByIdForTechnician(req.params.id, req.user.id);
    if (!result.rows.length)
      return res.status(404).json({ error: "Job not found or not assigned to you." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const ALLOWED_STATUSES = ["Assigned", "Accepted", "On The Way", "In Progress", "Completed", "Cancelled"];

async function updateJobStatus(req, res) {
  const { status } = req.body;
  if (!ALLOWED_STATUSES.includes(status))
    return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` });

  try {
    const check = await Booking.findByIdForTechnician(req.params.id, req.user.id);
    if (!check.rows.length)
      return res.status(404).json({ error: "Job not found or not assigned to you." });

    const updated = await Booking.updateBookingStatus(req.params.id, status);

    try {
      await JobTracking.upsert(req.params.id, req.user.id, status);
    } catch (_) {
      // job_tracking update is best-effort
    }

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateAvailability(req, res) {
  try {
    const result = await Technician.updateAvailability(req.user.id, req.body.available);
    if (!result.rows.length)
      return res.status(404).json({ error: "Technician not found." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getMyProfile, getAllTechnicians, getTechnicianById, toggleAvailability, getDashboard, getMyJobs, getJobById, updateJobStatus, updateAvailability };
