// Shared API helpers and small pure utilities. API request/response contracts are unchanged.

export const roleLabels = {
  doctor: 'Clinician',
  patient: 'Patient',
  caregiver: 'Caregiver',
  admin: 'Administrator',
  receptionist: 'Receptionist',
  nurse: 'Nurse',
  lab_technician: 'Lab technician',
  pharmacist: 'Pharmacist',
  billing: 'Billing'
};

/** Error carrying the HTTP status so views can show precise messages. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const friendly = (status, fallback) => {
  if (status === 413) return 'The file is larger than the 100 MB upload limit.';
  if (status === 503 || status === 502) return 'The EEG model service is unavailable. Please try again once it is running.';
  if (status === 504) return 'The EEG model service took too long to respond.';
  return fallback;
};

export const api = async (path, opts = {}, tokenArg) => {
  const { token: optToken, responseType, body, ...rest } = opts;
  const authToken = tokenArg || optToken;
  const isFormData = body instanceof FormData;
  const serializedBody =
    body && !isFormData && typeof body === 'object' ? JSON.stringify(body) : body;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(rest.headers || {})
  };
  let response;
  try {
    response = await fetch(path, { ...rest, body: serializedBody, headers });
  } catch {
    throw new ApiError('Cannot reach the NeuroTwin server. Check that the backend is running.', 0);
  }
  if (responseType === 'blob') {
    if (!response.ok) {
      throw new ApiError(friendly(response.status, 'Failed to download file.'), response.status);
    }
    return response.blob();
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || data.error || friendly(response.status, 'Request failed. Please try again.'), response.status);
  }
  return data;
};

/**
 * Multipart upload with genuine byte-level progress (XMLHttpRequest upload events).
 * Supports both uploadWithProgress(path, { formData, token, onProgress }) and
 * uploadWithProgress(path, formData, token, { onProgress, onSent }).
 */
export const uploadWithProgress = (path, arg2, tokenArg, opts = {}) =>
  new Promise((resolve, reject) => {
    const isObjStyle = arg2 && !(arg2 instanceof FormData) && typeof arg2 === 'object' && arg2.formData;
    const formData = isObjStyle ? arg2.formData : arg2;
    const token = isObjStyle ? arg2.token : tokenArg;
    const onProgress = isObjStyle ? arg2.onProgress : opts.onProgress;
    const onSent = isObjStyle ? arg2.onSent : opts.onSent;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', path);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress(pct, { loaded: event.loaded, total: event.total });
      }
    };
    xhr.upload.onload = () => onSent?.();
    xhr.onerror = () => reject(new ApiError('Cannot reach the NeuroTwin server. Check that the backend is running.', 0));
    xhr.ontimeout = () => reject(new ApiError('The upload timed out.', 504));
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || '{}'); } catch { /* non-JSON error body */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data.message || data.error || friendly(xhr.status, 'Upload failed. Please try again.'), xhr.status));
    };
    xhr.send(formData);
  });

/* ---------- formatting ---------- */
export const dateLabel = (value) =>
  value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
export const dayLabel = (value) =>
  value ? new Date(value).toLocaleDateString([], { dateStyle: 'medium' }) : '—';
export const fileSize = (bytes = 0) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
export const percent = (value, digits = 1) => `${(Number(value || 0) * 100).toFixed(digits)}%`;
export const clock = (seconds = 0) => {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
};
export const initials = (name = '') => (name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('') || 'N').toUpperCase();

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // matches the multer limit in server/src/app.js
export const WINDOW_SECONDS = 10; // model window length (services/ml metadata)

