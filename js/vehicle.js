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

function submitVehicle(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  const success = document.getElementById('vehicle-success');

  btn.textContent = 'Submitting…';
  btn.disabled = true;

  setTimeout(() => {
    success.style.display = 'flex';
    btn.textContent = 'Submit Registration';
    btn.disabled = false;
    document.getElementById('vehicle-form').reset();
    document.getElementById('plate-display').textContent = 'ABC · 1234';
    success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 900);
}

function resetForm() {
  document.getElementById('plate-display').textContent = 'ABC · 1234';
  document.getElementById('vehicle-success').style.display = 'none';
}
