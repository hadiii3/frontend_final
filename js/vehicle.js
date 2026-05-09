const BASE_URL = 'https://api.eightyeightevents.me/api/v1';

async function loadVehicleState() {
  const token = localStorage.getItem('student_token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Set top-nav details
  const studentName = localStorage.getItem('student_name') || '';
  const firstName = studentName.split(' ')[0];
  const avatarInitials = studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const identityNameEls = document.querySelectorAll('.nav-student-name');
  identityNameEls.forEach(el => el.textContent = studentName);

  const avatarEls = document.querySelectorAll('.nav-student-avatar');
  avatarEls.forEach(el => el.textContent = avatarInitials);

  try {
    const response = await fetch(`${BASE_URL}/student/vehicle`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('student_token');
      localStorage.removeItem('student_name');
      window.location.href = 'login.html';
      return;
    }

    const result = await response.json();

    const activeCard = document.getElementById('active-vehicle-card');
    const formCard = document.getElementById('request-vehicle-card');

    // Clear dynamic parts of active card
    activeCard.innerHTML = '';

    if (result.status === 'none') {
        activeCard.style.display = 'none';
        formCard.style.display = 'block';
    } else if (result.status === 'pending') {
        activeCard.style.display = 'block';
        formCard.style.display = 'none';

        activeCard.innerHTML = `
          <div class="section-card-header">
            <div class="section-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/></svg>
              Vehicle Request
            </div>
            <span class="badge" style="background:#fef08a; color:#854d0e;">Pending</span>
          </div>
          <p style="font-size: .875rem; color: var(--col-on-muted); margin-bottom: var(--space-5);">Your request is being reviewed.</p>
          <div style="display:flex; flex-direction:column; gap:var(--space-4); margin-bottom:var(--space-5);">
            <div class="veh-detail-row">
              <span class="veh-detail-label">License Plate</span>
              <span class="veh-detail-value" style="font-family:monospace;letter-spacing:1px;font-size:1.0625rem;color:var(--col-primary);font-weight:700;">${result.data.plate_number}</span>
            </div>
            <div class="veh-detail-row">
              <span class="veh-detail-label">Make &amp; Model</span>
              <span class="veh-detail-value">${result.data.vehicle_type} ${result.data.vehicle_model}</span>
            </div>
            <div class="veh-detail-row">
              <span class="veh-detail-label">Color</span>
              <span class="veh-detail-value">${result.data.vehicle_color}</span>
            </div>
            <div class="veh-detail-row">
              <span class="veh-detail-label">Submitted On</span>
              <span class="veh-detail-value">${result.data.submitted_at}</span>
            </div>
          </div>
        `;
    } else if (result.status === 'approved') {
        activeCard.style.display = 'block';
        formCard.style.display = 'none';

        activeCard.innerHTML = `
          <div class="section-card-header">
            <div class="section-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/></svg>
              Active Vehicle Access
            </div>
            <span class="badge badge-green">Approved Permit</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:var(--space-4); margin-bottom:var(--space-5);">
            <div class="veh-detail-row">
              <span class="veh-detail-label">License Plate</span>
              <span class="veh-detail-value" style="font-family:monospace;letter-spacing:1px;font-size:1.0625rem;color:var(--col-primary);font-weight:700;">${result.data.plate_number}</span>
            </div>
            <div class="veh-detail-row">
              <span class="veh-detail-label">Make &amp; Model</span>
              <span class="veh-detail-value">${result.data.vehicle_type} ${result.data.vehicle_model}</span>
            </div>
            <div class="veh-detail-row">
              <span class="veh-detail-label">Color</span>
              <span class="veh-detail-value">${result.data.vehicle_color}</span>
            </div>
            <div class="veh-detail-row">
              <span class="veh-detail-label">Valid From</span>
              <span class="veh-detail-value">${result.data.valid_from}</span>
            </div>
            <div class="veh-detail-row">
              <span class="veh-detail-label">Valid Until</span>
              <span class="veh-detail-value">${result.data.valid_until}</span>
            </div>
          </div>
        `;
    } else if (result.status === 'rejected') {
        activeCard.style.display = 'block';
        formCard.style.display = 'block'; // allow resubmission

        activeCard.innerHTML = `
          <div class="section-card-header">
            <div class="section-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/></svg>
              Vehicle Request
            </div>
            <span class="badge" style="background:#fee2e2; color:#991b1b;">Rejected</span>
          </div>
          <p style="font-size: .875rem; color: var(--col-on-muted); margin-bottom: var(--space-5);">Your previous request was rejected. Reason: ${result.data.rejection_reason}</p>
        `;
    }

  } catch (error) {
    console.error('Error fetching vehicle state:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadVehicleState);

/* vehicle.js — Live plate preview + form submit */
function updatePlate(val) {
  const display = document.getElementById('plate-display');
  const clean = val.trim().toUpperCase();
  if (clean.length > 0) {
    display.textContent = clean;
    display.classList.remove('empty');
  } else {
    display.textContent = 'ABC · 1234';
    display.classList.add('empty');
  }
}

async function submitVehicle(e) {
  e.preventDefault();
  const token = localStorage.getItem('student_token');
  if (!token) return;

  const btn = document.getElementById('submit-btn');
  const success = document.getElementById('vehicle-success');
  const errEl = document.getElementById('vehicle-error');

  btn.textContent = 'Submitting…';
  btn.disabled = true;
  success.style.display = 'none';
  if(errEl) errEl.style.display = 'none';

  const type = document.getElementById('make').value; // mapping make to type based on html and api
  const model = document.getElementById('model').value;
  const color = document.getElementById('color').value;
  const plate = document.getElementById('plate').value;

  try {
    const response = await fetch(`${BASE_URL}/student/vehicle-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        vehicle_type: type,
        vehicle_model: model,
        vehicle_color: color,
        plate_number: plate,
      }),
    });

    const result = await response.json();

    if (result.success) {
      success.style.display = 'block';
      btn.textContent = 'Submit Access Request';
      btn.disabled = false;
      document.getElementById('vehicle-form').reset();
      document.getElementById('plate-display').textContent = 'ABC · 1234';
      success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Reload state to show pending card
      setTimeout(() => loadVehicleState(), 1000);
    } else {
      if(!errEl) {
          const newErrEl = document.createElement('div');
          newErrEl.id = 'vehicle-error';
          newErrEl.style.cssText = 'display:block; font-size:.875rem; font-weight:600; text-align:center; padding:var(--space-3); border-radius:var(--radius-md); margin-top:var(--space-2); background: #fee2e2; color: #991b1b;';
          newErrEl.textContent = result.message || 'An error occurred';
          success.parentNode.insertBefore(newErrEl, success);
      } else {
          errEl.textContent = result.message || 'An error occurred';
          errEl.style.display = 'block';
      }
      btn.textContent = 'Submit Access Request';
      btn.disabled = false;
    }
  } catch (error) {
    console.error('Error submitting vehicle:', error);
    btn.textContent = 'Submit Access Request';
    btn.disabled = false;
  }
}

function resetForm() {
  document.getElementById('plate-display').textContent = 'ABC · 1234';
  document.getElementById('vehicle-success').style.display = 'none';
}