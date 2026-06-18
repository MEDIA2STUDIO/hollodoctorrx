const API = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(name, email, password, specialization, regNo, hospitalName) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, specialization, regNo, hospitalName }),
  });
}

export function getMe() {
  return request('/auth/me');
}

export function getPrescriptions() {
  return request('/prescriptions');
}

export function getPrescription(id) {
  return request(`/prescriptions/${id}`);
}

export function createPrescription(data) {
  return request('/prescriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePrescription(id, data) {
  return request(`/prescriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deletePrescription(id) {
  return request(`/prescriptions/${id}`, {
    method: 'DELETE',
  });
}

export async function uploadFile(prescriptionId, file) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API}/uploads/${prescriptionId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function deleteFile(prescriptionId, fileId) {
  return request(`/uploads/${prescriptionId}/${fileId}`, { method: 'DELETE' });
}

export function getMedicines() {
  return request('/medicines');
}

export function getMedicine(id) {
  return request(`/medicines/${id}`);
}

export function createMedicine(data) {
  return request('/medicines', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateMedicine(id, data) {
  return request(`/medicines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteMedicine(id) {
  return request(`/medicines/${id}`, {
    method: 'DELETE',
  });
}
