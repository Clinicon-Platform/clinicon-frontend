const BACKEND_BASE = '/api';
const AGENT_BASE = '/agent';

function getToken(): string | null {
  return localStorage.getItem('clinicon-token');
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = BACKEND_BASE
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'حدث خطأ في الاتصال بالخادم';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || errorJson.error || errorDetail;
    } catch {
      // fallback
    }
    throw new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return (await response.text()) as unknown as T;
}

export const api = {
  // Auth
  login: async (email: string, pass: string) => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
  },

  register: async (userData: any) => {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // AI Chatbot Agent
  sendChatMessage: async (message: string, userName?: string, sessionId: string = 'default') => {
    try {
      const data = await request(
        '/chat',
        {
          method: 'POST',
          body: JSON.stringify({
            message,
            session_id: sessionId,
            user_name: userName,
          }),
        },
        AGENT_BASE
      );
      return data.reply || data.response || 'لم يتوفر رد حالياً';
    } catch (err) {
      console.warn('Agent server unreachable, trying fallback chatbot endpoint...', err);
      try {
        const fallback = await request('/chatbot/query', {
          method: 'POST',
          body: JSON.stringify({ message }),
        });
        return fallback.response || fallback.reply || 'تم استلام استفسارك وسيتم الرد عليك قريباً.';
      } catch (fallbackErr) {
        throw new Error('تعذر الاتصال بالمساعد الطبي الذكي حالياً.');
      }
    }
  },

  // Doctors & Appointments
  getDoctors: async () => {
    return request('/appointments/doctors');
  },

  getAvailableSlots: async (doctorId: string, dateStr: string) => {
    return request(`/appointments/doctors/${doctorId}/available-slots?date=${dateStr}`);
  },

  bookAppointment: async (payload: {
    doctor_id: string;
    appointment_date: string;
    reason_for_visit?: string;
    patient_name?: string;
    patient_phone?: string;
  }) => {
    return request('/appointments/book', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getQueue: async () => {
    return request('/appointments/queue');
  },

  getDoctorPatients: async () => {
    return request('/appointments/patients');
  },

  getDoctorStats: async () => {
    return request('/appointments/stats');
  },

  markAppointmentDone: async (appointmentId: string) => {
    return request(`/appointments/patient/${appointmentId}/done`, {
      method: 'PUT',
    });
  },

  // Medications
  getMedications: async () => {
    return request('/medications/');
  },

  createMedication: async (payload: {
    name: string;
    medicine_name?: string;
    dosage?: string;
    frequency?: string;
    start_date?: string;
    end_date?: string;
    doctor_notes?: string;
  }) => {
    return request('/medications/', {
      method: 'POST',
      body: JSON.stringify({
        medicine_name: payload.medicine_name || payload.name,
        name: payload.name,
        dosage: payload.dosage,
        frequency: payload.frequency,
      }),
    });
  },

  deleteMedication: async (id: string) => {
    return request(`/medications/${id}`, {
      method: 'DELETE',
    });
  },

  getTelegramStatus: async () => {
    return request('/medications/telegram-status');
  },

  linkTelegram: async (chatId: string) => {
    return request('/medications/telegram-link', {
      method: 'POST',
      body: JSON.stringify({ telegram_chat_id: chatId }),
    });
  },

  // Medical Records & Files
  getMyFiles: async () => {
    return request('/files/my');
  },

  getMyVisits: async () => {
    return request('/visit/my');
  },

  uploadLabFile: async (formData: FormData) => {
    return request('/files/lab-upload', {
      method: 'POST',
      body: formData,
    });
  },

  uploadMedicalFile: async (formData: FormData) => {
    return request('/files/upload-file', {
      method: 'POST',
      body: formData,
    });
  },

  // Clinic Owner
  getOwnerStats: async () => {
    return request('/clinic/stats');
  },

  getOwnerDoctors: async () => {
    return request('/clinic/my-doctors');
  },

  getOwnerLabs: async () => {
    return request('/clinic/my-labs');
  },

  addClinicMember: async (payload: {
    full_name: string;
    email: string;
    phone_number?: string;
    role: 'doctor' | 'lab';
    password: string;
    specialization?: string;
    clinic_email?: string;
  }) => {
    return request('/clinic/add-member', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  addLab: async (data: any) => {
    return request('/clinic/add-member', {
      method: 'POST',
      body: JSON.stringify({
        role: 'lab',
        full_name: data.full_name || data.name,
        email: data.email,
        password: data.password || 'Lab@123456',
        phone_number: data.phone_number || data.contact_info || '',
      }),
    });
  },

  resetChatSession: async (sessionId: string = 'default') => {
    try {
      return await request(
        '/reset',
        {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId }),
        },
        AGENT_BASE
      );
    } catch (err) {
      console.warn('Agent reset failed:', err);
    }
  },
};
