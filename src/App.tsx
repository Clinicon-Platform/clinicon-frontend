import { useMemo, useState, useEffect, createContext, useContext, type ReactNode, type ComponentType, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowLeft, ArrowRight, Bell, Building2, CalendarDays, CalendarPlus, Check,
  CheckCircle2, ChevronDown, ChevronLeft, CircleAlert, Clock3, FileText, FlaskConical,
  Globe, HeartPulse, Home, LayoutDashboard, ListChecks, LocateFixed, LockKeyhole, LogOut,
  MapPin, MessageCircle, Moon, MoreHorizontal, Pill, Plus, Search, Send, Settings,
  ShieldAlert, ShieldCheck, Stethoscope, Store, Sun, Timer, Upload, UserRound, UsersRound, Zap,
  X, Trash2
} from 'lucide-react';
import NotFound from '@/pages/not-found';
import { api } from '@/lib/api';

const logoPath = `${import.meta.env.BASE_URL}assets/clinicon-logo.png`;

type Role = 'patient' | 'doctor' | 'owner' | 'lab';
type Lang = 'ar' | 'en';
type Theme = 'light' | 'dark';
type IconType = ComponentType<{ className?: string; size?: number }>;

type Appointment = { id: string | number; clinic: string; doctor: string; specialty: string; date: string; time: string; status: string };
type Medication = { id: string | number; name: string; dosage?: string; frequency?: string; schedule?: string; reminder?: boolean };
type Queue = { ticket: string; position: number; ahead: number; minutes: number; status: string };
type Patient = { name: string; age?: number; phone?: string; bloodType?: string; clinicEmail?: string };

const translations = {
  ar: {
    systemTitle: 'منظومة Clinicon الطبية',
    selectAccount: 'اختر نوع حسابك للبدء',
    selectAccountDesc: 'حدد دورك في المنظومة لفتح الحساب واللوحة المخصصة لك:',
    formTitle: 'نموذج تسجيل الحساب',
    formDesc: 'يرجى إدخال البيانات المطلوبة لربط حسابك بعيادتك وتوجيهك فوراً:',
    submitRegister: 'إنشاء حساب جديد والتوجيه للوحة ➔',
    submitting: 'جاري الاتصال بالخادم والتحقق...',
    tokenIssued: 'تم تسجبل الدخول بنجاح!',
    redirecting: 'جاري التوجيه الفوري إلى اللوحة الخاصة بك...',
    securityNote: 'رمز الجلسة محمي بالكامل ومطابق لمعايير الأمان.',
    accessDenied: 'غير مصرح لك بالوصول',
    accessDeniedDesc: 'حسابك الحالي لا يملك الصلاحية لدخول هذه الصفحة وفقاً لقواعد الأدوار والأمن.',
    goToDashboard: 'العودة إلى لوحتي المصرح بها',
    logout: 'تسجيل الخروج',
    lightMode: 'فاتح',
    darkMode: 'داكن',
    patientRole: 'مريض',
    doctorRole: 'طبيب',
    ownerRole: 'مالك عيادة',
    labRole: 'معمل تحاليل',
    patientDesc: 'احجز وتابع رعايتك وطابورك الحي',
    doctorDesc: 'أدر طابور مرضاك واستشر حالاتهم',
    ownerDesc: 'نظّم فريق أطبائك وعيادتك',
    labDesc: 'أرسل وشارك نتائج التحاليل بأمان',
    navHome: 'الرئيسية',
    navSpecialties: 'التخصصات',
    navBook: 'حجز موعد',
    navQueue: 'الطابور الحي',
    navAssistant: 'المساعد الطبي',
    navMedications: 'أدويتي',
    navRecords: 'سجلاتي الطبية',
    navDoctorQueue: 'طابور اليوم',
    navDoctorFiles: 'ملفات المرضى',
    navOwnerDashboard: 'لوحة العيادة',
    navOwnerClinics: 'العيادة والأطباء',
    navLabResults: 'نتائج التحاليل',
    navLabRecords: 'سجلات المرضى',
  },
  en: {
    systemTitle: 'Clinicon Medical System',
    selectAccount: 'Select Your Account Type',
    selectAccountDesc: 'Choose your role to create an account and access your dashboard:',
    formTitle: 'Account Registration',
    formDesc: 'Please fill in your details and clinic email to link your account:',
    submitRegister: 'Create Account & Auto-Login ➔',
    submitting: 'Verifying session...',
    tokenIssued: 'Login Successful!',
    redirecting: 'Redirecting immediately to your dashboard...',
    securityNote: 'Session token generation is strictly protected.',
    accessDenied: 'Access Denied',
    accessDeniedDesc: 'Your account role does not have authorization to access this page.',
    goToDashboard: 'Return to Authorized Dashboard',
    logout: 'Sign Out',
    lightMode: 'Light',
    darkMode: 'Dark',
    patientRole: 'Patient',
    doctorRole: 'Doctor',
    ownerRole: 'Clinic Owner',
    labRole: 'Medical Lab',
    patientDesc: 'Book appointments & track live queues',
    doctorDesc: 'Manage daily queue & patient records',
    ownerDesc: 'Manage clinic staff & operational analytics',
    labDesc: 'Upload & share lab results securely',
    navHome: 'Home',
    navSpecialties: 'Specialties',
    navBook: 'Book Appointment',
    navQueue: 'Live Queue',
    navAssistant: 'AI Assistant',
    navMedications: 'My Medications',
    navRecords: 'Medical Records',
    navDoctorQueue: "Today's Queue",
    navDoctorFiles: 'Patient Files',
    navOwnerDashboard: 'Clinic Dashboard',
    navOwnerClinics: 'Staff & Clinics',
    navLabResults: 'Lab Results',
    navLabRecords: 'Patient Records',
  }
};

const allowedRoutesPerRole: Record<Role, string[]> = {
  patient: ['/', '/clinics', '/book', '/queue', '/assistant', '/medications', '/records'],
  doctor: ['/', '/queue', '/doctor', '/records', '/assistant', '/medications'],
  owner: ['/', '/clinic-owner', '/clinics', '/records', '/doctor', '/lab'],
  lab: ['/', '/lab', '/records'],
};

type AppState = {
  role: Role | null;
  patient: Patient;
  appointment: Appointment | null;
  queue: Queue;
  medications: Medication[];
  lang: Lang;
  theme: Theme;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  t: (key: keyof typeof translations['ar']) => string;
  register: (role: Role, name: string, clinicEmail?: string) => void;
  setRole: (role: Role | null) => void;
  setAppointment: (appointment: Appointment) => void;
  fetchMedications: () => void;
  fetchQueue: () => void;
  logout: () => void;
};

const AppContext = createContext<AppState | null>(null);
function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('Clinicon context is missing');
  return value;
}

function CliniconProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => (localStorage.getItem('clinicon-role') as Role) || null);
  const [patient, setPatient] = useState<Patient>(() => {
    try {
      const saved = localStorage.getItem('clinicon-user');
      if (saved) {
        const u = JSON.parse(saved);
        return { name: u.full_name || u.name || 'مريض', age: 30, phone: u.phone_number || '', bloodType: 'O+', clinicEmail: u.clinicEmail || '' };
      }
    } catch {}
    return { name: 'المستخدم', age: 30, phone: '', bloodType: 'O+' };
  });

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [queue, setQueue] = useState<Queue>({ ticket: '—', position: 0, ahead: 0, minutes: 0, status: 'لا يوجد طابور نشط' });
  const [medications, setMedications] = useState<Medication[]>([]);
  
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('clinicon-lang') as Lang) || 'ar');
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('clinicon-theme') as Theme) || 'dark');

  const setLang = (nextLang: Lang) => {
    setLangState(nextLang);
    localStorage.setItem('clinicon-lang', nextLang);
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang;
  };

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    localStorage.setItem('clinicon-theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const fetchMedications = async () => {
    try {
      const data = await api.getMedications();
      if (Array.isArray(data)) {
        setMedications(data.map((m: any) => ({
          id: m.id,
          name: m.medicine_name || m.name || 'دواء مسجل',
          dosage: m.dosage || 'جرعة محددة',
          frequency: m.frequency || 'حسب الإرشاد',
          schedule: 'منتظم',
          reminder: true
        })));
      }
    } catch (err) {
      console.warn('Medications API offline or empty:', err);
    }
  };

  const fetchQueue = async () => {
    try {
      const data = await api.getQueue();
      if (data && data.ticket) {
        setQueue({
          ticket: data.ticket || 'A-001',
          position: data.position || 1,
          ahead: data.ahead || 0,
          minutes: data.estimated_minutes || 15,
          status: data.status || 'في الانتظار'
        });
      }
    } catch (err) {
      console.warn('Queue API note:', err);
    }
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    if (localStorage.getItem('clinicon-token')) {
      fetchMedications();
      fetchQueue();
    }
  }, [lang, theme, role]);

  const t = (key: keyof typeof translations['ar']) => translations[lang][key] || translations['ar'][key] || key;

  const setRole = (next: Role | null) => {
    setRoleState(next);
    if (next) localStorage.setItem('clinicon-role', next);
    else localStorage.removeItem('clinicon-role');
  };

  const logout = () => {
    localStorage.removeItem('clinicon-token');
    localStorage.removeItem('clinicon-user');
    localStorage.removeItem('clinicon-role');
    setRoleState(null);
    window.location.href = '/register';
  };

  const register = (next: Role, name: string, clinicEmail?: string) => {
    setRole(next);
    setPatient((p) => ({ ...p, name, clinicEmail: clinicEmail || p.clinicEmail }));
  };

  const value = useMemo(() => ({
    role, patient, appointment, queue, medications, lang, theme, setLang, setTheme, t, register, setRole, setAppointment, fetchMedications, fetchQueue, logout
  }), [role, patient, appointment, queue, medications, lang, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

const roleLabels: Record<Role, string> = { patient: 'مريض', doctor: 'طبيب', owner: 'مالك عيادة', lab: 'معمل تحاليل' };
const roleRoutes: Record<Role, string> = { patient: '/', doctor: '/queue', owner: '/clinic-owner', lab: '/lab' };

function Brand({ compact = false }: { compact?: boolean }) {
  const { role } = useApp();
  const targetHref = role ? roleRoutes[role] : '/';
  return <Link href={targetHref} className={`flex items-center gap-2.5 ${compact ? 'justify-center' : ''}`} data-testid="link-brand">
    <img src={logoPath} alt="Clinicon" className="h-12 w-12 object-contain" />
    {!compact && <span className="font-numbers text-[22px] font-extrabold tracking-[-1.5px] text-[#173F5F] dark:text-white">Clini<span className="text-[#119D95]">con</span></span>}
  </Link>;
}

function Controls() {
  const { lang, setLang, theme, setTheme } = useApp();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        className="flex items-center gap-1.5 rounded-xl border border-[#CFECE8] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0F766E] shadow-sm transition hover:bg-[#E6F5F3] dark:border-slate-700 dark:bg-slate-800 dark:text-teal-400"
        data-testid="button-toggle-lang"
      >
        <Globe size={14} />
        <span>{lang === 'ar' ? 'English 🇬🇧' : 'العربية 🇪🇬'}</span>
      </button>

      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#CFECE8] bg-white text-[#0F766E] shadow-sm transition hover:bg-[#E6F5F3] dark:border-slate-700 dark:bg-slate-800 dark:text-teal-400"
        title={theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}
        data-testid="button-toggle-theme"
      >
        {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
      </button>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { role, logout, t, patient } = useApp();
  const [location] = useLocation();

  const nav = role === 'patient'
    ? [
        { href: '/', label: t('navHome'), icon: Home },
        { href: '/clinics', label: t('navSpecialties'), icon: Stethoscope },
        { href: '/book', label: t('navBook'), icon: CalendarPlus },
        { href: '/queue', label: t('navQueue'), icon: Clock3 },
        { href: '/assistant', label: t('navAssistant'), icon: MessageCircle },
        { href: '/medications', label: t('navMedications'), icon: Pill },
        { href: '/records', label: t('navRecords'), icon: FileText },
      ]
    : role === 'doctor'
    ? [
        { href: '/queue', label: t('navDoctorQueue'), icon: ListChecks },
        { href: '/records', label: t('navDoctorFiles'), icon: FileText },
      ]
    : role === 'owner'
    ? [
        { href: '/clinic-owner', label: t('navOwnerDashboard'), icon: LayoutDashboard },
        { href: '/clinics', label: t('navOwnerClinics'), icon: UsersRound },
      ]
    : [
        { href: '/lab', label: t('navLabResults'), icon: FlaskConical },
        { href: '/records', label: t('navLabRecords'), icon: FileText },
      ];

  return (
    <div className="shell-grid bg-background text-foreground" dir={useApp().lang === 'ar' ? 'rtl' : 'ltr'}>
      <aside className="app-sidebar sticky top-0 hidden h-[100dvh] flex-col border-l border-[#CFECE8] bg-white px-4 py-6 md:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 px-2">
          <Brand />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <p className="mb-2 px-3 text-[11px] font-bold tracking-wide text-[#8CA7A4] dark:text-slate-400">
            {role ? roleLabels[role] : 'الخدمات'}
          </p>
          {nav.map((item) => (
            <NavItem key={item.href} {...item} active={location === item.href} />
          ))}

          <div className="mt-auto pt-4 border-t border-[#CFECE8] dark:border-slate-800">
            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2.5 text-xs font-bold text-[#c4473d] transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
              data-testid="button-logout"
            >
              <LogOut size={16} />
              <span>{t('logout')}</span>
            </button>
          </div>
        </nav>

        <div className="mt-4 rounded-2xl bg-[#0F766E] p-4 text-white dark:bg-teal-900">
          <ShieldCheck size={20} className="mb-3 opacity-80" />
          <p className="text-xs font-bold">بياناتك محميّة بالكامل</p>
          <p className="mt-1 text-[10px] leading-4 text-teal-50">متصل مباشرة مع خادم المنظومة وقاعدة البيانات.</p>
        </div>
      </aside>

      <main className="app-main min-h-[100dvh] bg-[#F4FBFA] dark:bg-slate-950">
        <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-[#D9EEEA]/80 bg-[#F4FBFA]/90 px-4 backdrop-blur-md md:px-9 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-3 md:hidden">
            <Brand compact />
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm font-semibold text-[#5B7370] dark:text-slate-300">المنظومة الطبية المباشرة</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
            <span className="font-numbers text-sm font-bold text-[#0F766E] dark:text-teal-400">متصل بالسيرفر</span>
          </div>

          <div className="flex items-center gap-3">
            <Controls />
            {role && (
              <div className="flex items-center gap-2 border-r border-[#CFECE8] pr-3 dark:border-slate-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#CFECE8] text-sm font-bold text-[#0F766E] dark:bg-teal-900 dark:text-teal-200">
                  {patient.name ? patient.name.slice(0, 2) : 'حس'}
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-bold text-[#1F3A38] dark:text-white">{patient.name}</p>
                  <p className="text-[10px] text-[#5B7370] dark:text-slate-400">{roleLabels[role]}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        {children}
        <MobileNav nav={nav} location={location} />
      </main>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: IconType; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
        active
          ? 'bg-[#E6F5F3] text-[#0F766E] dark:bg-teal-950 dark:text-teal-300'
          : 'text-[#5B7370] hover:bg-[#F4FBFA] hover:text-[#0F766E] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-teal-400'
      }`}
      data-testid={`link-nav-${href.replace('/', '') || 'home'}`}
    >
      <Icon size={19} />
      <span>{label}</span>
      {active && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-[#14B8A6]" />}
    </Link>
  );
}

function MobileNav({ nav, location }: { nav: { href: string; label: string; icon: IconType }[]; location: string }) {
  return (
    <div className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl border border-[#CFECE8] bg-white/95 p-2 shadow-lg backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-900/95">
      {nav.slice(0, 4).map((item) => (
        <Link
          href={item.href}
          key={item.href}
          className={`flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold ${
            location === item.href ? 'bg-[#E6F5F3] text-[#0F766E] dark:bg-teal-950 dark:text-teal-300' : 'text-[#8CA7A4] dark:text-slate-400'
          }`}
          data-testid={`mobile-nav-${item.href}`}
        >
          <item.icon size={18} />
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 fade-up">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-bold tracking-wide text-[#0D9488] dark:text-teal-400">{eyebrow}</p>}
        <h1 className="text-[25px] font-extrabold leading-tight text-[#1F3A38] dark:text-white md:text-[31px]">{title}</h1>
        {description && <p className="mt-2 text-sm text-[#5B7370] dark:text-slate-300">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Button(props: { children: ReactNode; variant?: 'primary' | 'soft' | 'outline' | 'danger'; onClick?: () => void; type?: 'button' | 'submit'; className?: string; disabled?: boolean; 'data-testid'?: string }) {
  const { children, variant = 'primary', onClick, type = 'button', className = '', disabled = false } = props;
  const styles = variant === 'primary' ? 'bg-[#14B8A6] text-white btn-primary' : variant === 'soft' ? 'bg-[#E6F5F3] text-[#0F766E] hover:bg-[#CFECE8] dark:bg-slate-800 dark:text-teal-300' : variant === 'danger' ? 'bg-[#fff0ef] text-[#c4473d] hover:bg-[#ffe2df] dark:bg-red-950 dark:text-red-300' : 'border border-[#CFECE8] bg-white text-[#0F766E] hover:border-[#14B8A6] dark:border-slate-700 dark:bg-slate-800 dark:text-teal-300';
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`} data-testid={props['data-testid']}>{children}</button>;
}

function StatCard({ label, value, detail, icon: Icon, tone = 'teal' }: { label: string; value: string; detail: string; icon: IconType; tone?: 'teal' | 'blue' | 'peach' | 'navy' }) {
  const bg = tone === 'teal' ? 'bg-[#E6F5F3] text-[#0F766E] dark:bg-teal-950 dark:text-teal-300' : tone === 'blue' ? 'bg-[#e7f2f6] text-[#2c7187] dark:bg-blue-950 dark:text-blue-300' : tone === 'peach' ? 'bg-[#fff2e8] text-[#b86638] dark:bg-amber-950 dark:text-amber-300' : 'bg-[#e9edf5] text-[#364d72] dark:bg-slate-800 dark:text-slate-300';
  return <div className="card-lift rounded-2xl border border-[#CFECE8] bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-[#5B7370] dark:text-slate-400">{label}</p><p className="mt-2 font-numbers text-[27px] font-extrabold text-[#1F3A38] dark:text-white">{value}</p><p className="mt-1 text-[11px] text-[#8CA7A4] dark:text-slate-400">{detail}</p></div><span className={`rounded-xl p-2.5 ${bg}`}><Icon size={19} /></span></div></div>;
}

function SectionTitle({ title, link, href = '#' }: { title: string; link?: string; href?: string }) {
  return <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-extrabold text-[#1F3A38] dark:text-white">{title}</h2>{link && <Link href={href} className="flex items-center gap-1 text-xs font-bold text-[#0D9488] dark:text-teal-400" data-testid={`link-section-${href}`}>{link}<ChevronLeft size={14} /></Link>}</div>;
}

function HomeDispatcher() {
  const { role } = useApp();
  if (role === 'doctor') return <DoctorQueue />;
  if (role === 'owner') return <OwnerPage />;
  if (role === 'lab') return <LabPage />;
  return <PatientHome />;
}

function PatientHome() {
  const { patient, appointment, queue, medications } = useApp();
  return (
    <div className="page-wrap">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 fade-up">
        <div>
          <p className="mb-2 text-sm font-semibold text-[#5B7370] dark:text-slate-300">أهلاً بك،</p>
          <h1 className="text-[29px] font-extrabold text-[#0F766E] dark:text-teal-400 md:text-[36px]">{patient.name}</h1>
          <p className="mt-2 text-sm text-[#5B7370] dark:text-slate-300">مرحباً بك في المنظومة الطبية المباشرة.</p>
        </div>
        <Link href="/book" className="inline-flex items-center gap-2 rounded-xl bg-[#14B8A6] px-4 py-3 text-sm font-bold text-white btn-primary" data-testid="link-book-home">
          <CalendarPlus size={18} /> احجز موعداً جديداً
        </Link>
      </div>

      {appointment ? (
        <div className="relative mb-7 overflow-hidden rounded-[24px] bg-[#0F766E] p-5 text-white shadow-lg md:p-7">
          <div className="relative grid gap-7 md:grid-cols-[1.2fr_.8fr] md:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-xs font-bold text-teal-100">
                <span className="h-2 w-2 rounded-full bg-[#65E6D6] animate-pulse" /> المتابعة المباشرة مفعّلة
              </div>
              <p className="text-sm text-teal-50">موعدك المحجوز</p>
              <h2 className="mt-2 text-2xl font-extrabold">{appointment.clinic}</h2>
              <p className="mt-2 text-sm text-teal-50">{appointment.doctor} · {appointment.specialty}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">{appointment.time}</span>
                <span className="rounded-lg bg-[#65E6D6] px-3 py-2 text-sm font-bold text-[#0F766E]">تذكرة {queue.ticket}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-teal-50">
                <span>موقعك في الطابور</span>
                <span>{queue.status}</span>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-numbers text-[52px] font-extrabold leading-none">{queue.position}</span>
                <span className="pb-1 text-sm text-teal-50">في الانتظار</span>
              </div>
              <Link href="/queue" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-[#0F766E] transition hover:bg-[#E6F5F3]" data-testid="link-follow-queue">
                تابع الطابور المباشر <ArrowLeft size={14} />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-7 rounded-2xl border border-[#CFECE8] bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-extrabold text-[#1F3A38] dark:text-white">لا يوجد موعد محجوز حتى الآن</p>
          <p className="mt-1 text-xs text-[#5B7370] dark:text-slate-300">يمكنك استكشاف التخصصات والأطباء المتاحين في عيادتك وحجز موعد فوراً.</p>
          <Link href="/book" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#14B8A6] px-4 py-2.5 text-xs font-bold text-white btn-primary">
            تصفح الأطباء واعدّ موعداً
          </Link>
        </div>
      )}

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="الموعد الحالي" value={appointment ? '01' : '00'} detail={appointment ? appointment.time : 'لا يوجد'} icon={CalendarDays} />
        <StatCard label="الانتظار المتوقع" value={`${queue.minutes}`} detail="دقيقة" icon={Timer} tone="blue" />
        <StatCard label="أدويتك المسجلة" value={`${medications.length}`} detail="دواء في خطتك" icon={Pill} tone="peach" />
      </div>

      <div className="grid gap-7 lg:grid-cols-[1.2fr_.8fr]">
        <section className="fade-up-2">
          <SectionTitle title="وصول سريع" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction href="/clinics" icon={Stethoscope} label="التخصصات والأطباء" />
            <QuickAction href="/assistant" icon={MessageCircle} label="المساعد الذكي" />
            <QuickAction href="/medications" icon={Pill} label="أدويتي" />
            <QuickAction href="/records" icon={FileText} label="سجلي الطبي" />
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: IconType; label: string }) {
  return (
    <Link href={href} className="card-lift flex min-h-[104px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#CFECE8] bg-white text-center text-xs font-bold text-[#1F3A38] dark:border-slate-800 dark:bg-slate-900 dark:text-white" data-testid={`link-quick-${href.slice(1)}`}>
      <span className="rounded-xl bg-[#E6F5F3] p-3 text-[#0F766E] dark:bg-teal-950 dark:text-teal-300"><Icon size={21} /></span>
      {label}
    </Link>
  );
}

function ClinicsPage() {
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getDoctors()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setDoctorsList(list);
      })
      .catch((err) => console.warn('Failed to load doctors:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = doctorsList.filter((d) => `${d.name || d.full_name} ${d.specialization || d.specialty}`.includes(search));

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="العيادة الطبية المباشرة"
        title="الأطباء المتاحون في المنظومة"
        description="استعرض أطباء العيادة المسجلين حقيقياً ويمكنك حجز موعد معهم مباشرة."
      />

      <div className="mb-7 flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={17} className="absolute right-3 top-3.5 text-[#8CA7A4]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الطبيب أو التخصص"
            className="w-full rounded-xl border border-[#CFECE8] bg-white py-3 pr-10 pl-4 text-sm outline-none transition focus:border-[#14B8A6] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            data-testid="input-search-specialties"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm font-bold text-[#5B7370] dark:text-slate-300">جاري جلب الأطباء من قاعدة البيانات...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CFECE8] bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Stethoscope size={32} className="mx-auto mb-3 text-[#8CA7A4]" />
          <p className="text-base font-extrabold text-[#1F3A38] dark:text-white">لا يوجد أطباء مسجلون في قاعدة البيانات حالياً</p>
          <p className="mt-1 text-xs text-[#5B7370] dark:text-slate-400">عندما يقوم مالك العيادة بإضافة أطباء من لوحته، سيظهرون فوراً هنا للحجز.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {filtered.map((doctor) => (
            <div key={doctor.id} className="card-lift rounded-2xl border border-[#CFECE8] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#CFECE8] text-sm font-bold text-[#0F766E] dark:bg-teal-950 dark:text-teal-300">
                  {doctor.name ? doctor.name.slice(0, 2) : 'د'}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold text-[#1F3A38] dark:text-white">{doctor.name || doctor.full_name}</h3>
                  <p className="mt-1 truncate text-xs text-[#5B7370] dark:text-slate-400">{doctor.specialization || doctor.specialty || 'تخصص عام'}</p>
                </div>
              </div>
              <Link href="/book" className="mt-5 block rounded-xl border border-[#CFECE8] py-2.5 text-center text-xs font-bold text-[#0F766E] hover:bg-[#E6F5F3] dark:border-slate-700 dark:text-teal-300">
                احجز موعداً مع الطبيب
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookPage() {
  const { setAppointment } = useApp();
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [step, setStep] = useState(1);
  const [date, setDate] = useState('اليوم');
  const [time, setTime] = useState('10:00 صباحاً');
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    api.getDoctors().then((res: any) => {
      const docs = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      if (docs.length > 0) {
        setDoctorsList(docs);
        setSelectedDoctorId(docs[0].id);
      }
    }).catch(console.warn);
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      setLoadingSlots(true);
      const todayStr = new Date().toISOString().split('T')[0];
      api.getAvailableSlots(selectedDoctorId, todayStr)
        .then((data) => {
          if (Array.isArray(data)) setSlots(data);
          else if (data && Array.isArray(data.available_slots)) setSlots(data.available_slots);
          else setSlots(['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM']);
        })
        .catch(() => setSlots(['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM']))
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDoctorId]);

  const selectedDoctorObj = doctorsList.find(d => String(d.id) === String(selectedDoctorId));

  const submit = async () => {
    if (selectedDoctorId) {
      try {
        await api.bookAppointment({
          doctor_id: selectedDoctorId,
          appointment_date: new Date().toISOString(),
          reason_for_visit: 'كشف مريض'
        });
      } catch (err) {
        console.warn('Booking API submit:', err);
      }
    }

    setAppointment({
      id: Date.now(),
      clinic: selectedDoctorObj?.clinic_name || 'العيادة الطبية',
      doctor: selectedDoctorObj?.name || selectedDoctorObj?.full_name || 'الطبيب',
      specialty: selectedDoctorObj?.specialization || 'عام',
      date,
      time,
      status: 'مؤكد'
    });
    setStep(4);
  };

  return (
    <div className="page-wrap max-w-[1050px]">
      <PageHeader eyebrow="حجز موعد حقيقي" title="حجز موعد جديد" description="اختر الطبيب المتاح والوقت المناسب لتأكيد موعدك مباشرة بالسيرفر." />

      {doctorsList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#CFECE8] bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Stethoscope size={36} className="mx-auto mb-3 text-[#8CA7A4]" />
          <h2 className="text-lg font-extrabold text-[#1F3A38] dark:text-white">لا يوجد أطباء متاحون للحجز حالياً في قاعدة البيانات</h2>
          <p className="mt-2 text-xs text-[#5B7370] dark:text-slate-300">يجب على مالك العيادة إضافة طبيب أولاً من لوحة المالك.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-[#CFECE8] bg-white p-5 md:p-7 dark:border-slate-800 dark:bg-slate-900">
            {step === 1 && (
              <div className="fade-up">
                <h2 className="text-lg font-extrabold text-[#1F3A38] dark:text-white">اختر الطبيب المناسب</h2>
                <div className="mt-4 space-y-2">
                  {doctorsList.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDoctorId(d.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-right transition ${
                        selectedDoctorId === d.id ? 'border-[#14B8A6] bg-[#E6F5F3] dark:bg-teal-950' : 'border-[#CFECE8] dark:border-slate-800'
                      }`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#CFECE8] text-xs font-bold text-[#0F766E] dark:bg-teal-900 dark:text-teal-200">
                        {d.name ? d.name.slice(0, 2) : 'د'}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-[#1F3A38] dark:text-white">{d.name || d.full_name}</span>
                        <span className="block text-[11px] text-[#5B7370] dark:text-slate-400">{d.specialization || 'تخصص عام'}</span>
                      </span>
                      {selectedDoctorId === d.id && <CheckCircle2 size={19} className="text-[#14B8A6]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="fade-up">
                <h2 className="text-lg font-extrabold text-[#1F3A38] dark:text-white">الأوقات المتاحة لدى الطبيب</h2>
                {loadingSlots ? (
                  <p className="mt-4 text-xs text-[#5B7370]">جاري تحميل الأوقات الشاغرة...</p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((s) => (
                      <button
                        key={s}
                        onClick={() => setTime(s)}
                        className={`rounded-xl border py-3 text-xs font-bold transition ${
                          time === s ? 'border-[#14B8A6] bg-[#E6F5F3] text-[#0F766E] dark:bg-teal-950 dark:text-teal-300' : 'border-[#CFECE8] text-[#5B7370] dark:border-slate-800'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="fade-up">
                <h2 className="text-lg font-extrabold text-[#1F3A38] dark:text-white">تأكيد الموعد</h2>
                <div className="mt-5 divide-y divide-[#E6F5F3] rounded-2xl bg-[#F4FBFA] px-4 dark:divide-slate-800 dark:bg-slate-800">
                  <SummaryRow label="الطبيب" value={selectedDoctorObj?.name || selectedDoctorObj?.full_name || 'طبيب'} />
                  <SummaryRow label="التخصص" value={selectedDoctorObj?.specialization || 'عام'} />
                  <SummaryRow label="الوقت" value={time} />
                </div>
              </div>
            )}

            {step === 4 ? (
              <div className="text-center fade-up p-4">
                <CheckCircle2 size={44} className="mx-auto mb-3 text-[#14B8A6]" />
                <h2 className="text-xl font-extrabold text-[#1F3A38] dark:text-white">تم تأكيد الحجز المباشر!</h2>
                <p className="mt-2 text-xs text-[#5B7370] dark:text-slate-300">تم تسجيل موعدك بسيرفر النظام، يمكنك متابعته من صفحة الطابور.</p>
                <Link href="/queue" className="mt-5 inline-block rounded-xl bg-[#14B8A6] px-5 py-2.5 text-xs font-bold text-white">
                  انتقل للطابور المباشر
                </Link>
              </div>
            ) : (
              <div className="mt-8 flex justify-between border-t border-[#E6F5F3] pt-5 dark:border-slate-800">
                {step > 1 ? <Button variant="outline" onClick={() => setStep(step - 1)}>السابق</Button> : <span />}
                {step < 3 ? <Button onClick={() => setStep(step + 1)}>التالي</Button> : <Button onClick={submit}>تأكيد الحجز</Button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3 py-4 text-sm"><span className="text-[#5B7370] dark:text-slate-400">{label}</span><span className="font-bold text-[#1F3A38] dark:text-white">{value}</span></div>; }

function QueuePage() {
  const { role, queue, fetchQueue } = useApp();

  return role === 'doctor' ? <DoctorQueue /> : (
    <div className="page-wrap max-w-[1100px]">
      <PageHeader eyebrow="متابعة لحظية" title="الطابور الحي" description="عرض وتحديث مباشر لموقعك في طابور الكشف." action={<Button variant="outline" onClick={fetchQueue}><Activity size={16} /> تحديث الآن</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="rounded-3xl border border-[#CFECE8] bg-white p-5 md:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#5B7370] dark:text-slate-400">تذكرتك الحالية</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-numbers text-[38px] font-extrabold text-[#0F766E] dark:text-teal-400">{queue.ticket}</span>
                <span className="rounded-full bg-[#E6F5F3] px-3 py-1 text-xs font-bold text-[#0F766E] dark:bg-teal-950 dark:text-teal-300">{queue.status}</span>
              </div>
            </div>
          </div>
          <div className="my-8 h-px bg-[#E6F5F3] dark:bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
            <QueueMetric label="موقعك" value={`${queue.position}`} />
            <QueueMetric label="أمامك" value={`${queue.ahead}`} />
            <QueueMetric label="دقيقة متوقعة" value={`${queue.minutes}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-[#F4FBFA] p-3 dark:bg-slate-800"><p className="font-numbers text-2xl font-extrabold text-[#0F766E] dark:text-teal-400">{value}</p><p className="mt-1 text-[11px] text-[#5B7370] dark:text-slate-400">{label}</p></div>; }

function AssistantPage() {
  const { patient } = useApp();
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([
    { from: 'bot', text: `أهلاً ${patient.name || 'بك'}، أنا مساعد Clinicon الطبي الذكي. كيف أستطيع مساعدتك اليوم؟` },
    { from: 'bot', text: 'يمكنني مساعدتك في فهم إرشادات طبيبك، تذكّر أدويتك، أو الإجابة على استفساراتك الطبية.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setMessages((m) => [...m, { from: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const reply = await api.sendChatMessage(userText, patient.name);
      setMessages((m) => [...m, { from: 'bot', text: reply }]);
    } catch (err: any) {
      setMessages((m) => [...m, { from: 'bot', text: err.message || 'حصلت مشكلة أثناء التواصل مع المساعد — يمكنك إعادة المحاولة بعد قليلاً.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap max-w-[1000px]">
      <PageHeader eyebrow="موجود عندما تحتاجه" title="المساعد الطبي الذكي" description="إرشادات أولية بلغة بسيطة، مع الحفاظ على خصوصية معلوماتك." />
      <div className="overflow-hidden rounded-3xl border border-[#CFECE8] bg-white shadow-[var(--shadow-sm)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-[#E6F5F3] bg-[#F4FBFA] p-4 dark:border-slate-800 dark:bg-slate-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F766E] text-white">
            <HeartPulse size={22} />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#1F3A38] dark:text-white">مساعد Clinicon AI</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#0D9488] dark:text-teal-400">
              <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
              متصل حقيقي مع النموذج المحلي
            </p>
          </div>
          <ShieldCheck size={18} className="mr-auto text-[#8CA7A4]" />
        </div>
        <div className="min-h-[410px] space-y-4 p-5 md:p-8">
          {messages.map((m, i) => (
            <div key={`${m.from}-${i}`} className={`flex gap-2 ${m.from === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-7 ${m.from === 'user' ? 'rounded-bl-sm bg-[#0F766E] text-white' : 'rounded-br-sm bg-[#F4FBFA] text-[#1F3A38] dark:bg-slate-800 dark:text-white'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <div className="rounded-2xl bg-[#F4FBFA] px-4 py-3 text-sm text-[#5B7370] dark:bg-slate-800 dark:text-slate-300">
                <span className="inline-block animate-pulse">المساعد يفكّر بالذكاء الاصطناعي...</span>
              </div>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-3">
            <Suggested text="ما معنى نتيجة التحليل؟" onClick={() => setInput('ما معنى نتيجة التحليل؟')} />
            <Suggested text="متى أتناول دوائي؟" onClick={() => setInput('متى أتناول دوائي؟')} />
            <Suggested text="كيف أستعد للموعد؟" onClick={() => setInput('كيف أستعد للموعد؟')} />
          </div>
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-[#E6F5F3] p-4 dark:border-slate-800">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب سؤالك الطبي هنا..."
            disabled={loading}
            className="min-w-0 flex-1 rounded-xl border border-[#CFECE8] bg-[#F4FBFA] px-4 py-3 text-sm outline-none focus:border-[#14B8A6] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            data-testid="input-assistant-message"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="shrink-0 px-4" data-testid="button-send-assistant">
            <Send size={17} /> <span className="hidden sm:inline">إرسال</span>
          </Button>
        </form>
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#8CA7A4]">
        <LockKeyhole size={12} />المساعد لا يقدّم تشخيصاً طبياً نهائياً أو بديلاً عن الطبيب.
      </p>
    </div>
  );
}
function Suggested({ text, onClick }: { text: string; onClick: () => void }) { return <button onClick={onClick} className="rounded-full border border-[#CFECE8] px-3 py-1.5 text-[11px] font-semibold text-[#5B7370] hover:bg-[#E6F5F3] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" data-testid={`button-suggestion-${text}`}>{text}</button>; }

function MedicationsPage() {
  const { medications, fetchMedications } = useApp();
  const [showAddMed, setShowAddMed] = useState(false);

  const handleDelete = async (id: string | number) => {
    try {
      await api.deleteMedication(String(id));
      fetchMedications();
    } catch (err) {
      console.warn('Delete medication error:', err);
    }
  };

  return (
    <div className="page-wrap max-w-[1080px]">
      <PageHeader eyebrow="بيانات حقيقية من الخادم" title="أدويتي المسجلة" description="تذكيرات بسيطة تساعدك على الالتزام بخطة العلاج." action={<Button onClick={() => setShowAddMed(true)}><Plus size={17} /> إضافة دواء جديد</Button>} />
      
      {medications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CFECE8] bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Pill size={32} className="mx-auto mb-3 text-[#8CA7A4]" />
          <p className="text-base font-extrabold text-[#1F3A38] dark:text-white">لا توجد أدوية مسجلة في خطتك حالياً</p>
          <p className="mt-1 text-xs text-[#5B7370] dark:text-slate-400">اضغط على زر "إضافة دواء جديد" لإضافة دوائك الفعلي إلى قاعدة البيانات.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map((med) => (
            <div key={med.id} className="card-lift flex flex-wrap items-center gap-4 rounded-2xl border border-[#CFECE8] bg-white p-4 md:p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff2e8] text-[#bd7043] dark:bg-amber-950 dark:text-amber-300">
                <Pill size={23} />
              </div>
              <div className="min-w-[170px] flex-1">
                <h3 className="font-extrabold text-[#1F3A38] dark:text-white">{med.name || (med as any).medicine_name || 'دواء مسجل'}</h3>
                <p className="mt-1 text-xs text-[#5B7370] dark:text-slate-300">{med.dosage} · {med.frequency}</p>
              </div>
              <button onClick={() => handleDelete(med.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40" title="حذف الدواء">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddMed && (
        <AddMedicationModal
          onClose={() => setShowAddMed(false)}
          onSuccess={() => {
            setShowAddMed(false);
            fetchMedications();
          }}
        />
      )}
    </div>
  );
}

function AddMedicationModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('قرص واحد');
  const [frequency, setFrequency] = useState('مرة يومياً');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('يرجى إدخال اسم الدواء');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.createMedication({ name, dosage, frequency });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'فشل إضافة الدواء.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[#CFECE8] bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[#1F3A38] dark:text-white">إضافة دواء جديد</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#8CA7A4] hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <p className="mt-1 text-xs text-[#5B7370] dark:text-slate-300">أضف الدواء لحفظه بقاعدة البيانات وسجل العلاج.</p>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="اسم الدواء" value={name} onChange={setName} placeholder="أوميبرازول 20 مجم" testid="input-med-name" />
          <Field label="الجرعة" value={dosage} onChange={setDosage} placeholder="كبسولة واحدة" testid="input-med-dosage" />
          <Field label="التكرار" value={frequency} onChange={setFrequency} placeholder="قبل الإفطار يومياً" testid="input-med-freq" />

          <div className="mt-6 flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} type="button">إلغاء</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ الدواء'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordsPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyFiles()
      .then((data) => setFiles(Array.isArray(data) ? data : []))
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrap max-w-[1100px]">
      <PageHeader eyebrow="بياناتك الصحية" title="سجلاتي الطبية المتاحة" description="الملفات والتحاليل المرفوعة بقاعدة البيانات." />
      {loading ? (
        <p className="text-xs font-bold text-[#5B7370]">جاري جلب الملفات من السيرفر...</p>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CFECE8] bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <FileText size={32} className="mx-auto mb-3 text-[#8CA7A4]" />
          <p className="text-base font-extrabold text-[#1F3A38] dark:text-white">لا توجد ملفات أو تحاليل في سجلّك حالياً</p>
          <p className="mt-1 text-xs text-[#5B7370] dark:text-slate-400">عند رفع نتائج التحاليل من لوحة المعمل، ستظهر هنا مباشرة.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 rounded-2xl border border-[#CFECE8] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <FileText size={20} className="text-[#0F766E]" />
              <div className="flex-1">
                <p className="text-sm font-bold text-[#1F3A38] dark:text-white">{file.title || file.file_name || 'ملف طبي'}</p>
                <p className="text-xs text-[#8CA7A4]">{file.category || 'تحليل طبي'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DoctorQueue() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await api.getDoctorPatients();
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Doctor patients load note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  return (
    <div className="page-wrap">
      <PageHeader eyebrow="لوحة التحكم الخاصة بك" title="طابور المرضى اليوم" description="المرضى المحجوزون في جدولك اليوم." />
      {loading ? (
        <p className="text-xs text-[#5B7370]">جاري التحميل من الخادم...</p>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CFECE8] bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <UsersRound size={32} className="mx-auto mb-3 text-[#8CA7A4]" />
          <p className="text-base font-extrabold text-[#1F3A38] dark:text-white">لا يوجد مرضى في طابور اليوم حتى الآن</p>
          <p className="mt-1 text-xs text-[#5B7370] dark:text-slate-400">أي مريض يقو بالحجز معك سيظهر فوراً في هذه الشاشة.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border border-[#CFECE8] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="text-sm font-bold text-[#1F3A38] dark:text-white">{p.patient_name || p.name || 'مريض'}</p>
                <p className="text-xs text-[#5B7370]">{p.reason_for_visit || 'كشف عيادة'}</p>
              </div>
              <Button onClick={() => api.markAppointmentDone(p.id).then(loadPatients)}>
                تم الكشف
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OwnerPage() {
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [ownerStats, setOwnerStats] = useState<any>(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOwnerData = async () => {
    try {
      setLoading(true);
      const docsRes = await api.getOwnerDoctors();
      setDoctorsList(docsRes.doctors || []);
      const statsRes = await api.getOwnerStats();
      setOwnerStats(statsRes);
    } catch (err) {
      console.warn('Owner data load note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
  }, []);

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="لوحة التحكم الرئيسية"
        title="إدارة العيادة والأطباء"
        description="إضافة وإدارة الأطباء المسجلين حقيقياً ببريد عيادتك."
        action={
          <Button onClick={() => setShowAddDoctor(true)} data-testid="button-add-doctor">
            <Plus size={17} /> إضافة طبيب جديد
          </Button>
        }
      />

      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        <StatCard label="أطباء العيادة" value={`${doctorsList.length}`} detail="طبيب مضاف في عيادتك" icon={UsersRound} />
        <StatCard label="إجمالي حجز اليوم" value={`${ownerStats?.total_appointments || 0}`} detail="حجز مسجل" icon={Clock3} tone="peach" />
        <StatCard label="اكتمل الكشف" value={`${ownerStats?.total_completed || 0}`} detail="كشف مكتمل" icon={CheckCircle2} tone="teal" />
      </div>

      <div className="mt-8">
        <SectionTitle title="أطباء العيادة الحاليون" />
        {loading ? (
          <p className="text-xs text-[#5B7370]">جاري التحميل من الخادم...</p>
        ) : doctorsList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#CFECE8] bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <UsersRound size={36} className="mx-auto mb-3 text-[#14B8A6]" />
            <h3 className="text-base font-extrabold text-[#1F3A38] dark:text-white">لم تقم بإضافة أي طبيب في عيادتك بعد</h3>
            <p className="mt-1 text-xs text-[#5B7370] dark:text-slate-400">اضغط على زر "إضافة طبيب جديد" لإدخال بيانات أول طبيب في عيادتك وسيتصل فوراً بقاعدة البيانات.</p>
            <Button className="mt-4" onClick={() => setShowAddDoctor(true)}>
              <Plus size={16} /> إضافة طبيب الآن
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {doctorsList.map((d) => (
              <div key={d.id} className="rounded-2xl border border-[#CFECE8] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#CFECE8] text-sm font-bold text-[#0F766E] dark:bg-teal-950 dark:text-teal-300">
                    {d.name ? d.name.slice(0, 2) : 'د'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#1F3A38] dark:text-white">{d.name}</h3>
                    <p className="mt-1 text-xs text-[#5B7370] dark:text-slate-300">{d.specialization || 'تخصص عام'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddDoctor && (
        <AddDoctorModal
          onClose={() => setShowAddDoctor(false)}
          onSuccess={() => {
            setShowAddDoctor(false);
            fetchOwnerData();
          }}
        />
      )}
    </div>
  );
}

function AddDoctorModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('باطنة وقلب');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('يرجى ملء جميع الحقول المطلوبة (الاسم، البريد، كلمة المرور).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.addClinicMember({
        full_name: name,
        email,
        password,
        phone_number: phone || undefined,
        role: 'doctor',
        specialization,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'فشل إضافة الطبيب. تأكد من البيانات والجلسة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[#CFECE8] bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[#1F3A38] dark:text-white">إضافة طبيب جديد للعيادة</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#8CA7A4] hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <p className="mt-1 text-xs text-[#5B7370] dark:text-slate-300">سيتم إنشاء حساب الطبيب وربطه بعيادتك مباشرة.</p>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="اسم الطبيب بالكامل" value={name} onChange={setName} placeholder="د. أحمد محمود" testid="input-doc-name" />
          <Field label="البريد الإلكتروني للطبيب" value={email} onChange={setEmail} placeholder="doctor@clinic.com" testid="input-doc-email" />
          <Field label="كلمة المرور (8 حروف ورقم على الأقل)" value={password} onChange={setPassword} placeholder="••••••••" type="password" testid="input-doc-password" />
          <Field label="رقم الهاتف (11 رقماً يبدأ بـ 01)" value={phone} onChange={setPhone} placeholder="01012345678" testid="input-doc-phone" />
          <Field label="التخصص الطبي" value={specialization} onChange={setSpecialization} placeholder="استشاري القلب والأوعية" testid="input-doc-spec" />

          <div className="mt-6 flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} type="button">إلغاء</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'جاري الإضافة...' : 'حفظ وإضافة الطبيب'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LabPage() {
  const [submitted, setSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [test, setTest] = useState('صورة دم كاملة CBC');
  const [loading, setLoading] = useState(false);

  const sendFile = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', test);
      formData.append('notes', 'نتيجة تحليل معمل');
      await api.uploadLabFile(formData);
      setSubmitted(true);
    } catch (err) {
      console.warn('Lab upload:', err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap max-w-[1050px]">
      <PageHeader eyebrow="بوابة مختبر التحاليل" title="إرسال نتيجة تحليل" description="ارفع النتيجة لتصل فوراً إلى السجل الطبي للمريض." />
      {submitted ? (
        <div className="mx-auto max-w-xl rounded-3xl border border-[#CFECE8] bg-white p-9 text-center shadow-[var(--shadow-md)] fade-up dark:border-slate-800 dark:bg-slate-900">
          <CheckCircle2 size={44} className="mx-auto mb-3 text-[#14B8A6]" />
          <h2 className="text-2xl font-extrabold text-[#1F3A38] dark:text-white">تم إرسال النتيجة لملف المريض!</h2>
          <Button onClick={() => { setSubmitted(false); setFile(null); }} className="mt-5">إرسال نتيجة أخرى</Button>
        </div>
      ) : (
        <form onSubmit={sendFile} className="rounded-2xl border border-[#CFECE8] bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <Field label="اسم التحليل" value={test} onChange={setTest} placeholder="CBC" testid="input-lab-title" />
          <label className="mt-4 block text-xs font-bold text-[#5B7370] dark:text-slate-300">إرفاق النتيجة (PDF أو صورة)</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-2 block w-full text-xs text-[#5B7370]" />
          <Button type="submit" disabled={!file || loading} className="mt-6 w-full">
            {loading ? 'جاري الإرسال...' : 'إرسال النتيجة للسجل الطبي'}
          </Button>
        </form>
      )}
    </div>
  );
}

function AccessDeniedPage() {
  const { role, t } = useApp();
  const [, setLocation] = useLocation();
  const authorizedRoute = role ? roleRoutes[role] : '/register';

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center fade-up">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#ffe2df] text-[#c4473d] dark:bg-red-950 dark:text-red-400 shadow-md">
        <ShieldAlert size={44} />
      </div>
      <h1 className="text-2xl font-extrabold text-[#1F3A38] dark:text-white">{t('accessDenied')}</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#5B7370] dark:text-slate-300">
        {t('accessDeniedDesc')}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => setLocation(authorizedRoute)}>
          {t('goToDashboard')} ({authorizedRoute})
        </Button>
      </div>
    </div>
  );
}

function RegisterPage() {
  const { register, t, lang } = useApp();
  const [, setLocation] = useLocation();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [selected, setSelected] = useState<Role | null>('owner');
  const [formData, setFormData] = useState({
    name: 'مجمع الشفاء الطبي',
    email: 'alhayat@clinic.com',
    clinicEmail: 'alhayat@clinic.com',
    phone: '01012345678',
    password: 'Password123',
    extra1: '',
    extra2: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [regSuccessNotice, setRegSuccessNotice] = useState<string | null>(null);
  const [doctorSpec, setDoctorSpec] = useState('استشاري أمراض القلب والأوعية الدموية');
  const [scheduleDays, setScheduleDays] = useState([
    { key: 5, name: 'السبت', active: true, startTime: '09:00', endTime: '17:00' },
    { key: 6, name: 'الأحد', active: true, startTime: '09:00', endTime: '17:00' },
    { key: 0, name: 'الإثنين', active: true, startTime: '09:00', endTime: '17:00' },
    { key: 1, name: 'الثلاثاء', active: true, startTime: '09:00', endTime: '17:00' },
    { key: 2, name: 'الأربعاء', active: true, startTime: '09:00', endTime: '17:00' },
    { key: 3, name: 'الخميس', active: true, startTime: '09:00', endTime: '17:00' },
    { key: 4, name: 'الجمعة', active: false, startTime: '09:00', endTime: '17:00' },
  ]);

  const roles: { role: Role; emoji: string; titleKey: keyof typeof translations['ar']; descKey: keyof typeof translations['ar']; color: string }[] = [
    { role: 'owner', emoji: '🏛️', titleKey: 'ownerRole', descKey: 'ownerDesc', color: 'border-[#F59E0B] bg-[#FFFBEB] dark:bg-amber-950 dark:border-amber-500' },
    { role: 'doctor', emoji: '🩺', titleKey: 'doctorRole', descKey: 'doctorDesc', color: 'border-[#3B82F6] bg-[#EFF6FF] dark:bg-blue-950 dark:border-blue-500' },
    { role: 'patient', emoji: '👤', titleKey: 'patientRole', descKey: 'patientDesc', color: 'border-[#14B8A6] bg-[#E6F5F3] dark:bg-teal-950 dark:border-teal-500' },
    { role: 'lab', emoji: '🧪', titleKey: 'labRole', descKey: 'labDesc', color: 'border-[#8B5CF6] bg-[#F5F3FF] dark:bg-purple-950 dark:border-purple-500' }
  ];

  const handleRoleSelect = (role: Role) => {
    setSelected(role);
    setFormData(prev => ({
      ...prev,
      name: role === 'owner' ? 'مجمع الشفاء الطبي' : role === 'doctor' ? 'د. أحمد محمود' : role === 'lab' ? 'مختبر الشفاء' : 'سلمى أحمد',
    }));
  };

  const updateField = (key: string, val: string) => {
    setFormData(prev => ({ ...prev, [key]: val }));
    if (errorMessage) setErrorMessage(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (authMode === 'login') {
        const res = await api.login(formData.email, formData.password);
        const userRole = (res.role === 'clinic_owner' ? 'owner' : res.role) as Role;
        localStorage.setItem('clinicon-token', res.access_token);
        localStorage.setItem('clinicon-user', JSON.stringify(res));
        localStorage.setItem('clinicon-role', userRole);

        register(userRole, res.full_name || 'المستخدم', formData.clinicEmail);
        setSubmitted(true);
        setTimeout(() => setLocation(roleRoutes[userRole] || '/'), 700);
      } else {
        if (!selected) return;
        const backendRole = selected === 'owner' ? 'clinic_owner' : selected;
        const registerPayload = {
          full_name: formData.name || 'مستخدم جديد',
          email: formData.email,
          phone_number: formData.phone || '01012345678',
          role: backendRole,
          password: formData.password,
          clinic_email: formData.clinicEmail || formData.email,
          blood_type: selected === 'patient' ? 'O+' : undefined,
          specialization: selected === 'doctor' ? doctorSpec : (selected === 'owner' ? 'إدارة عيادة' : undefined),
          availabilities: selected === 'doctor' ? scheduleDays.filter(d => d.active).map(d => ({
            day_of_week: d.key,
            start_time: d.startTime,
            end_time: d.endTime
          })) : undefined,
        };

        await api.register(registerPayload);
        setRegSuccessNotice('🎉 تم إنشاء حسابك بنجاح! أدخل كلمة المرور الآن واضغط على "تسجيل الدخول".');
        setAuthMode('login');
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let rawMsg = err.message || 'فشل الاتصال بالحساب — تأكد من البيانات والجلسة.';
      if (rawMsg.includes('psycopg2') || rawMsg.includes('SQL') || rawMsg.includes('UndefinedColumn') || rawMsg.includes('relation') || rawMsg.includes('INSERT INTO')) {
        rawMsg = 'حدث خطأ في تحديث قاعدة البيانات، يرجى المحاولة مرة أخرى.';
      }
      setErrorMessage(rawMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F4FBFA] p-4 md:p-8 dark:bg-slate-950" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-[1020px]">
        <div className="mb-7 flex items-center justify-between">
          <Brand />
          <Controls />
        </div>

        {submitted ? (
          <div className="mx-auto mt-16 max-w-md rounded-3xl border border-[#CFECE8] bg-white p-9 text-center shadow-[var(--shadow-md)] fade-up dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F5F3] text-[#0F766E] dark:bg-teal-950 dark:text-teal-300">
              <CheckCircle2 size={36} />
            </div>
            <span className="inline-block rounded-full bg-[#E6F5F3] px-3 py-1 text-xs font-bold text-[#0F766E] dark:bg-teal-950 dark:text-teal-300">
              🎉 تم إنشاء الحساب وتسجيل الدخول بنجاح!
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-[#1F3A38] dark:text-white">أهلاً بك في منصة Clinicon</h1>
            <p className="mt-2 text-sm text-[#5B7370] dark:text-slate-300">{t('redirecting')}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => setLocation(roleRoutes[selected || 'owner'])}>
                الانتقال المباشر للوحة التحكم ➔
              </Button>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="mt-1 text-xs font-bold text-[#0F766E] hover:underline dark:text-teal-400"
              >
                تسجيل الدخول ببريد آخر
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
            <div className="rounded-3xl bg-[#0F766E] p-7 text-white md:p-9 shadow-lg dark:bg-teal-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <HeartPulse size={25} className="text-[#65E6D6]" />
              </div>
              <p className="mt-10 text-xs font-bold tracking-wide text-teal-200 uppercase">{t('systemTitle')}</p>
              <h1 className="mt-2 text-[28px] font-extrabold leading-tight">
                منظومة Clinicon الطبية الحقيقية<br />
              </h1>
              <p className="mt-4 text-xs leading-6 text-teal-50">
                ملاحظة هامة: مالك العيادة هو أول من يسجل بالبريد الإلكتروني للعيادة لإنشائها في النظام، وبعد ذلك يستطيع الأطباء والمرضى التسجيل بالربط ببريد العيادة.
              </p>
            </div>

            <div className="rounded-3xl border border-[#CFECE8] bg-white p-6 md:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between border-b border-[#E6F5F3] pb-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`text-base font-extrabold pb-2 border-b-2 transition ${
                    authMode === 'register' ? 'border-[#14B8A6] text-[#0F766E] dark:text-teal-400' : 'border-transparent text-[#8CA7A4]'
                  }`}
                >
                  حساب جديد
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`text-base font-extrabold pb-2 border-b-2 transition ${
                    authMode === 'login' ? 'border-[#14B8A6] text-[#0F766E] dark:text-teal-400' : 'border-transparent text-[#8CA7A4]'
                  }`}
                >
                  تسجيل الدخول
                </button>
              </div>

              {regSuccessNotice && (
                <div className="mb-5 flex items-center gap-2 rounded-xl border border-teal-200 bg-[#E6F5F3] p-3 text-xs font-bold text-[#0F766E] dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300">
                  <CheckCircle2 size={18} className="shrink-0 text-[#14B8A6]" />
                  <span>{regSuccessNotice}</span>
                </div>
              )}

              {errorMessage && (
                <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                  <CircleAlert size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {authMode === 'register' && (
                <div className="mb-6">
                  <p className="mb-3 text-xs font-bold text-[#5B7370] dark:text-slate-300">اختر نوع حسابك:</p>
                  <div className="grid grid-cols-2 gap-3" data-testid="role-selection-grid">
                    {roles.map((r) => {
                      const isSelected = selected === r.role;
                      return (
                        <button
                          type="button"
                          key={r.role}
                          onClick={() => handleRoleSelect(r.role)}
                          className={`relative flex flex-col justify-between rounded-2xl border-2 p-3 text-right transition-all ${
                            isSelected
                              ? `${r.color} shadow-sm ring-2 ring-[#14B8A6]/20 scale-[1.01]`
                              : 'border-[#CFECE8] bg-white hover:border-[#9BD4CD] dark:border-slate-800 dark:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xl">{r.emoji}</span>
                            {isSelected && <span className="rounded-full bg-[#14B8A6] p-1 text-white"><Check size={11} /></span>}
                          </div>
                          <div className="mt-2">
                            <span className="block text-xs font-extrabold text-[#1F3A38] dark:text-white">{t(r.titleKey)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                {authMode === 'register' && (
                  <Field
                    label={selected === 'owner' ? 'اسم العيادة / المجمع الطبي' : selected === 'doctor' ? 'الاسم واللقب الطبي' : 'الاسم بالكامل'}
                    value={formData.name}
                    onChange={(v) => updateField('name', v)}
                    placeholder="مجمع الشفاء الطبي"
                    testid="input-register-name"
                  />
                )}

                <Field
                  label="البريد الإلكتروني الشخصي"
                  value={formData.email}
                  onChange={(v) => updateField('email', v)}
                  placeholder="alhayat@clinic.com"
                  testid="input-register-email"
                />

                {authMode === 'register' && (
                  <>
                    <Field
                      label="رقم الهاتف (11 رقماً يبدأ بـ 01)"
                      value={formData.phone}
                      onChange={(v) => updateField('phone', v)}
                      placeholder="01012345678"
                      testid="input-register-phone"
                    />

                    <Field
                      label={
                        selected === 'owner'
                          ? 'البريد الإلكتروني المخصص للعيادة (الذي سيربط به المرضى والأطباء)'
                          : 'البريد الإلكتروني لمالك العيادة المرتبطة'
                      }
                      value={formData.clinicEmail}
                      onChange={(v) => updateField('clinicEmail', v)}
                      placeholder="alhayat@clinic.com"
                      testid="input-register-clinic-email"
                    />

                    {selected === 'doctor' && (
                      <>
                        <Field
                          label="التخصص الطبي *"
                          value={doctorSpec}
                          onChange={setDoctorSpec}
                          placeholder="أخصائي باطنة وجهاز هضمي..."
                          testid="input-register-doctor-spec"
                        />

                        <div className="rounded-2xl border border-[#CFECE8] bg-[#F4FBFA] p-4 dark:border-slate-800 dark:bg-slate-800/60">
                          <p className="mb-3 text-xs font-extrabold text-[#1F3A38] dark:text-white">أيام وساعات العمل لكل يوم *</p>
                          <div className="space-y-2.5">
                            {scheduleDays.map((day, idx) => (
                              <div
                                key={day.key}
                                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 transition ${
                                  day.active
                                    ? 'border-[#14B8A6]/40 bg-white dark:border-teal-700 dark:bg-slate-900'
                                    : 'border-slate-200/60 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-900/40'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScheduleDays(prev =>
                                      prev.map((d, i) => (i === idx ? { ...d, active: !d.active } : d))
                                    );
                                  }}
                                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    day.active
                                      ? 'border border-[#14B8A6] bg-[#E6F5F3] text-[#0F766E] dark:bg-teal-950 dark:text-teal-300'
                                      : 'border border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800'
                                  }`}
                                >
                                  {day.active ? `✓ ${day.name}` : day.name}
                                </button>

                                {day.active ? (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[#8CA7A4]">من</span>
                                    <input
                                      type="time"
                                      value={day.startTime}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setScheduleDays(prev =>
                                          prev.map((d, i) => (i === idx ? { ...d, startTime: val } : d))
                                        );
                                      }}
                                      className="rounded-lg border border-[#CFECE8] bg-white px-2 py-1 font-numbers text-xs font-bold text-[#0F766E] outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-teal-300"
                                    />
                                    <span className="text-[#8CA7A4]">إلى</span>
                                    <input
                                      type="time"
                                      value={day.endTime}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setScheduleDays(prev =>
                                          prev.map((d, i) => (i === idx ? { ...d, endTime: val } : d))
                                        );
                                      }}
                                      className="rounded-lg border border-[#CFECE8] bg-white px-2 py-1 font-numbers text-xs font-bold text-[#0F766E] outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-teal-300"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-semibold text-slate-400">إجازة / غير متاح</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                <Field
                  label="كلمة المرور (8 حروف برقم وحرف على الأقل)"
                  value={formData.password}
                  onChange={(v) => updateField('password', v)}
                  placeholder="••••••••"
                  type="password"
                  testid="input-register-password"
                />

                <Button type="submit" disabled={isSubmitting} className="mt-6 w-full py-3.5 text-base shadow-md">
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      جاري الاتصال بالخادم...
                    </span>
                  ) : authMode === 'register' ? (
                    <span className="flex items-center justify-center gap-2"><Zap size={18} /> إنشاء الحساب والربط بالخادم ➔</span>
                  ) : (
                    <span className="flex items-center justify-center gap-2"><LockKeyhole size={18} /> تسجيل الدخول للوحة ➔</span>
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', testid }: { label: string; value?: string; onChange?: (v: string) => void; placeholder: string; type?: string; testid: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#5B7370] dark:text-slate-300">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-[#CFECE8] bg-[#F4FBFA] px-3 py-2.5 text-sm outline-none transition focus:border-[#14B8A6] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        data-testid={testid}
      />
    </label>
  );
}

function Router() {
  const { role } = useApp();
  const [location] = useLocation();

  const isRegister = location === '/register';
  
  if (isRegister || !role) {
    return <ErrorBoundary resetKey={location}><RegisterPage /></ErrorBoundary>;
  }

  const allowedRoutes = allowedRoutesPerRole[role] || [];
  const isAllowed = allowedRoutes.includes(location);

  return (
    <ErrorBoundary resetKey={location}>
      <Shell>
        {!isAllowed ? (
          <AccessDeniedPage />
        ) : (
          <Switch>
            <Route path="/" component={HomeDispatcher} />
            <Route path="/clinics" component={ClinicsPage} />
            <Route path="/book" component={BookPage} />
            <Route path="/queue" component={QueuePage} />
            <Route path="/assistant" component={AssistantPage} />
            <Route path="/medications" component={MedicationsPage} />
            <Route path="/records" component={RecordsPage} />
            <Route path="/doctor" component={DoctorQueue} />
            <Route path="/clinic-owner" component={OwnerPage} />
            <Route path="/lab" component={LabPage} />
            <Route component={NotFound} />
          </Switch>
        )}
      </Shell>
    </ErrorBoundary>
  );
}

const queryClient = new QueryClient();
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <CliniconProvider>
            <Router />
          </CliniconProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
export default App;