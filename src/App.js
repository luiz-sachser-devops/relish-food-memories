import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Clock, Users, CheckCircle, BookOpen, Utensils, MapPin, Lightbulb, FileText, Play, Pause, RotateCcw, Timer, UserPlus, Pencil, Trash2, Upload, Download, X, Images, Camera, Maximize2, XCircle, Eye, EyeOff, Plus } from 'lucide-react';
import './App.css';
import relishLineArt from './img/relish-lineart.svg';
import logoPng from './img/logo.png';
import img1 from './img/img1.png';
import img2 from './img/img2.png';
import img3 from './img/img3.png';
import img4 from './img/img4.png';
import coverImg from './img/cover.png';

const CHECKLIST_STORAGE_KEY = 'food-memories-checklist';
const PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit per requirements
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const SPLASH_TRANSITION_MS = 2000;
const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const CHECKLIST_SECTIONS = [
  {
    id: 'before-workshop',
    title: 'Before the Workshop',
    containerClass: 'bg-relish-paper border border-relish-linen shadow-sm',
    items: [
      { id: 'before-purpose', label: 'Engage with participants about purpose and expectations' },
      { id: 'before-agreement', label: 'Create "Community Agreement" ground rules' },
      { id: 'before-space', label: 'Prepare comfortable and welcoming space' },
      { id: 'before-consent', label: 'Precirculate consent forms' },
      { id: 'before-needs', label: 'Gather participant needs via pre-workshop forms' }
    ]
  },
  {
    id: 'day1-materials',
    title: 'Day 1 Materials',
    containerClass: 'bg-white border border-relish-warm shadow-sm',
    items: [
      { id: 'day1-paper', label: 'Large paper sheets for mapping' },
      { id: 'day1-art', label: 'Colored pens, markers, art supplies' },
      { id: 'day1-journals', label: 'Journals or notebooks' },
      { id: 'day1-prompts', label: 'Printed prompts and vocabulary cards' }
    ]
  },
  {
    id: 'day2-setup',
    title: 'Day 2 Kitchen Setup',
    containerClass: 'bg-relish-paper-deep border border-relish-clay shadow-sm',
    items: [
      { id: 'day2-ingredients', label: 'All ingredients for Future Recipe' },
      { id: 'day2-equipment', label: 'Kitchen equipment and utensils' },
      { id: 'day2-safety', label: 'Safety equipment (first aid, aprons, gloves)' },
      { id: 'day2-recording', label: 'Recording devices (camera, audio, video)' },
      { id: 'day2-documentation', label: 'Documentation materials for observer' }
    ]
  }
];

const createDefaultChecklistState = () => {
  const base = {};
  CHECKLIST_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      base[item.id] = false;
    });
  });
  return base;
};

const WorkshopTool = () => {
  const [currentDay, setCurrentDay] = useState(1);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentModule, setCurrentModule] = useState(0);
  const [completedModules, setCompletedModules] = useState(new Set());
  const [showNotes, setShowNotes] = useState(false);
  const [facilitatorNotes, setFacilitatorNotes] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistState, setChecklistState] = useState(() => {
    const defaults = createDefaultChecklistState();
    try {
      const stored = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...defaults, ...parsed };
        }
      }
    } catch (error) {
      console.error('Failed to load checklist state', error);
    }
    return defaults;
  });
  
  // Timer states
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerMode, setTimerMode] = useState('countdown');
  const [customTime, setCustomTime] = useState('');
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participantAccounts, setParticipantAccounts] = useState([]);
  const [participantAccountsLoading, setParticipantAccountsLoading] = useState(false);
  const [participantAccountsError, setParticipantAccountsError] = useState(null);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
  const [assigningParticipantId, setAssigningParticipantId] = useState(null);
  const [assigningAccountId, setAssigningAccountId] = useState(null);
  const [workshops, setWorkshops] = useState([]);
  const [workshopsLoading, setWorkshopsLoading] = useState(false);
  const [workshopsError, setWorkshopsError] = useState(null);
  const [showWorkshops, setShowWorkshops] = useState(false);
  const [showWorkshopDetail, setShowWorkshopDetail] = useState(false);
  const [activeWorkshopId, setActiveWorkshopId] = useState(null);
  const [workshopForm, setWorkshopForm] = useState({ name: '', facilitatorId: '' });
  const [facilitators, setFacilitators] = useState([]);
  const [facilitatorsLoading, setFacilitatorsLoading] = useState(false);
  const [facilitatorsError, setFacilitatorsError] = useState(null);
  const [showWorkshopDeleteConfirm, setShowWorkshopDeleteConfirm] = useState(false);
  const [pendingWorkshopDelete, setPendingWorkshopDelete] = useState(null);
  const [showFacilitatorWorkshopDeleteConfirm, setShowFacilitatorWorkshopDeleteConfirm] = useState(false);
  const [workshopEditName, setWorkshopEditName] = useState('');
  const [workshopSaving, setWorkshopSaving] = useState(false);
  const [isEditingWorkshopName, setIsEditingWorkshopName] = useState(false);
  const [assigningWorkshopEditId, setAssigningWorkshopEditId] = useState(null);
  const [workshopEditNameAdmin, setWorkshopEditNameAdmin] = useState('');
  const [showWorkshopSwitcher, setShowWorkshopSwitcher] = useState(false);
  const [participantForm, setParticipantForm] = useState({
    name: '',
    email: '',
    dietary: '',
    cultural: '',
    notes: ''
  });
  const [editingParticipantId, setEditingParticipantId] = useState(null);
  const [editingParticipantUserId, setEditingParticipantUserId] = useState(null);
  const fileInputRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);
  const [showPhotoDeleteConfirm, setShowPhotoDeleteConfirm] = useState(false);
  const [pendingDeletePhotoId, setPendingDeletePhotoId] = useState(null);
  const photoInputRef = useRef(null);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const [splashState, setSplashState] = useState('visible');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'participant',
    resetEmail: '',
    resetToken: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [authUser, setAuthUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const accessTokenRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [photoPreviews, setPhotoPreviews] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [signupPasswordError, setSignupPasswordError] = useState('');
  const [signupConfirmError, setSignupConfirmError] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetConfirmError, setResetConfirmError] = useState('');

  const isAuthenticated = Boolean(authUser && accessToken);
  const isFacilitator = authUser?.role === 'facilitator';
  const isAdmin = authUser?.role === 'admin';

  const dismissSplashScreen = useCallback(() => {
    setSplashState((prev) => (prev === 'visible' ? 'hiding' : prev));
  }, []);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    if (splashState === 'hiding') {
      const timer = setTimeout(() => setSplashState('hidden'), SPLASH_TRANSITION_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [splashState]);

  const isAppVisible = splashState === 'hidden' && isAuthenticated;
  const shouldShowAuth = splashState === 'hidden' && !isAuthenticated && !authChecking;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const originalOverflow = document.body.style.overflow;
    if (splashState !== 'hidden' || shouldShowAuth) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [splashState, shouldShowAuth]);

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      if (payload?.accessToken && payload?.user) {
        setAccessToken(payload.accessToken);
        accessTokenRef.current = payload.accessToken;
        setAuthUser(payload.user);
        return payload.accessToken;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, []);

  const authFetch = useCallback(async (input, init = {}, retry = true) => {
    const headers = new Headers(init.headers || {});
    const token = accessTokenRef.current;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(input, {
      ...init,
      headers,
      credentials: 'include'
    });

    if (response.status === 401 && retry) {
      const refreshedToken = await refreshAccessToken();
      if (!refreshedToken) {
        return response;
      }

      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
      return fetch(input, {
        ...init,
        headers: retryHeaders,
        credentials: 'include'
      });
    }

    return response;
  }, [refreshAccessToken]);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setAuthError('');
    setAuthInfo('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setSignupPasswordError('');
    setSignupConfirmError('');
    setResetPasswordError('');
    setResetConfirmError('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthInfo('');
    setAuthLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: authForm.email.trim(),
          password: authForm.password
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to sign in');
      }

      setAccessToken(payload.accessToken);
      accessTokenRef.current = payload.accessToken;
      setAuthUser(payload.user);
      setAuthForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (error) {
      setAuthError(error.message || 'Unable to sign in');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthInfo('');

    if (authForm.password !== authForm.confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    if (!PASSWORD_RULES.test(authForm.password)) {
      setAuthError('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.');
      return;
    }

    setAuthLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: authForm.name.trim(),
          email: authForm.email.trim(),
          password: authForm.password,
          role: authForm.role
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to create account');
      }

      setAccessToken(payload.accessToken);
      accessTokenRef.current = payload.accessToken;
      setAuthUser(payload.user);
      setAuthForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'participant'
      });
    } catch (error) {
      setAuthError(error.message || 'Unable to create account');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      // ignore
    } finally {
      setAccessToken(null);
      accessTokenRef.current = null;
      setAuthUser(null);
      setShowWorkshops(false);
      setShowWorkshopDetail(false);
      setActiveWorkshopId(null);
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      await refreshAccessToken();
      if (isMounted) {
        setAuthChecking(false);
      }
    };
    initSession();
    return () => {
      isMounted = false;
    };
  }, [refreshAccessToken]);

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthInfo('');
    setAuthLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.resetEmail.trim() })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to start password reset');
      }

      if (payload?.resetToken) {
        setAuthInfo(`Reset token (dev only): ${payload.resetToken}`);
      } else {
        setAuthInfo('If an account exists, reset instructions will be sent.');
      }
    } catch (error) {
      setAuthError(error.message || 'Unable to start password reset');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthInfo('');

    if (resetPasswordError || resetConfirmError) {
      setAuthError('Please resolve the password requirements first.');
      return;
    }

    setAuthLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authForm.resetEmail.trim(),
          token: authForm.resetToken.trim(),
          password: authForm.newPassword
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to reset password');
      }

      setAuthInfo('Password updated. Please log in with your new password.');
      setAuthForm((prev) => ({
        ...prev,
        resetToken: '',
        newPassword: '',
        confirmNewPassword: ''
      }));
      switchAuthMode('login');
    } catch (error) {
      setAuthError(error.message || 'Unable to reset password');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (authMode !== 'signup') {
      setSignupPasswordError('');
      setSignupConfirmError('');
      return;
    }

    const password = authForm.password || '';
    const confirmPassword = authForm.confirmPassword || '';

    if (password.length > 0 && !PASSWORD_RULES.test(password)) {
      setSignupPasswordError('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.');
    } else {
      setSignupPasswordError('');
    }

    if (confirmPassword.length > 0 && password !== confirmPassword) {
      setSignupConfirmError('Passwords do not match.');
    } else {
      setSignupConfirmError('');
    }
  }, [authForm.password, authForm.confirmPassword, authMode]);

  useEffect(() => {
    if (authMode !== 'reset') {
      setResetPasswordError('');
      setResetConfirmError('');
      return;
    }

    const password = authForm.newPassword || '';
    const confirmPassword = authForm.confirmNewPassword || '';

    if (password.length > 0 && !PASSWORD_RULES.test(password)) {
      setResetPasswordError('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.');
    } else {
      setResetPasswordError('');
    }

    if (confirmPassword.length > 0 && password !== confirmPassword) {
      setResetConfirmError('Passwords do not match.');
    } else {
      setResetConfirmError('');
    }
  }, [authForm.newPassword, authForm.confirmNewPassword, authMode]);

  const workshopData = {
    day1: {
      title: "Day 1: Mapping and Writing",
      subtitle: "Narrative Session",
      phases: [
        {
          name: "Memory Activation and Mapping",
          icon: MapPin,
          color: "bg-relish-paper border-relish-linen",
          modules: [
            {
              id: "1-1",
              title: "My Madeleine: A Proustian Memory Activation",
              duration: "30 min",
              purpose: "To activate autobiographical memory and create emotional safety through personal connection",
              steps: [
                "Welcome participants and create a safe, comfortable environment",
                "Share your own food memory example as facilitator",
                "Invite participants to identify a food/dish that evokes a strong memory",
                "Encourage description of sensory, emotional, and cultural dimensions",
                "Optional: Show-and-tell with real foods, utensils, or images"
              ],
              materials: ["Real food items (optional)", "Images/photos", "Projector or printed visuals"],
              tips: ["Model vulnerability by sharing first", "Allow silence for reflection", "Encourage but don't pressure sharing"]
            },
            {
              id: "1-2",
              title: "Food Memory Map / Culinary Landscape",
              duration: "45 min",
              purpose: "To facilitate access to food memories and identify what participants want to write about",
              steps: [
                "Provide large paper sheets and creative materials",
                "Ask participants to list foodstuffs from their home/origin",
                "Encourage drawing connections between elements",
                "Prompt for sensory details: colors, aromas, shapes, textures",
                "Use vocabulary cards to support description",
                "Identify which aspects relate to Intangible Cultural Heritage",
                "Optional: Collaborative evaluation of maps"
              ],
              materials: ["Large paper sheets", "Colored pens/markers", "Vocabulary cards", "Collage materials (magazines, scissors, glue)"],
              tips: ["Encourage creativity and personal style", "Sharing is optional but encouraged", "Focus on relationships between elements"]
            }
          ]
        },
        {
          name: "Writing as Inquiry",
          icon: FileText,
          color: "bg-relish-paper border-relish-warm",
          modules: [
            {
              id: "1-3",
              title: "Sensory-Rich Reflective Writing: 'Taste of Home'",
              duration: "45 min",
              purpose: "To develop detailed emotional and sensory narratives around a food memory",
              steps: [
                "Participants select an aspect from their culinary map",
                "Encourage automatic writing (raw, unedited narratives)",
                "Provide guiding questions: Who prepared? When eaten? What emotions?",
                "Focus on sensory details: smells, textures, sounds, atmosphere",
                "Explore meaning: past vs. present significance",
                "If multi-day workshop: assign continued writing as homework"
              ],
              materials: ["Journals/notebooks", "Pens", "Printed prompts", "Quiet writing space"],
              tips: ["Emphasize no judgment—write freely", "Provide optional guiding questions", "Allow flexible pacing"]
            },
            {
              id: "1-4",
              title: "Everyday Eating",
              duration: "30 min",
              purpose: "To highlight contrast between Heritage Food and contemporary habits; prepare for speculative exercise",
              steps: [
                "Participants write contrasting micro-essay about a detail from previous writing",
                "Pair work: discussion and mutual critique (5-10 min)",
                "Solitary writing: focus on convenience, health, sustainability",
                "Share micro-essays with the group",
                "Facilitator establishes common themes across participants",
                "Identify shared elements (dish, ingredient, custom) for co-creation"
              ],
              materials: ["Writing materials", "Sharing circle setup"],
              tips: ["Highlight commonalities", "Prepare transition to future recipe", "Celebrate diverse perspectives"]
            }
          ]
        },
        {
          name: "Co-creation of the Future Recipe",
          icon: Lightbulb,
          color: "bg-relish-paper border-relish-clay",
          modules: [
            {
              id: "1-5",
              title: "The Future Evolution of a Recipe",
              duration: "60 min",
              purpose: "To reflect on culinary continuity and change; consider future challenges and adaptations",
              steps: [
                "Identify common points in participants' maps and memories",
                "Choose a shared recipe or dish",
                "Visualize the dish (sketching or collage encouraged)",
                "Research ingredients, traditions, sustainability concerns",
                "Imagine future conditions: social/environmental changes",
                "Draft the future recipe with clear steps",
                "Connect each change to participants' stories",
                "This recipe becomes the focus of Day 2"
              ],
              materials: ["Large paper for collaborative work", "Markers", "Recipe template", "Research materials"],
              tips: ["Foster creative speculation", "Ground changes in real concerns", "Document the co-creation process"]
            }
          ]
        }
      ]
    },
    day2: {
      title: "Day 2: Cooking, Sharing and Co-creation",
      subtitle: "Cooking Session",
      phases: [
        {
          name: "Recap and Sharing Reflections",
          icon: BookOpen,
          color: "bg-relish-paper border-relish-linen",
          modules: [
            {
              id: "2-1",
              title: "Where Did We Start and Where Are We Going?",
              duration: "30 min",
              purpose: "To reactivate emotional/sensory material from Day 1; bridge speculative work and embodied practice",
              steps: [
                "Sit together informally as a group",
                "Share reflections on key memories from Day 1",
                "Discuss insights from writing and mapping exercises",
                "Express expectations for the cooking session",
                "Review the 'Future Recipe' created yesterday",
                "Discuss ingredients, steps, and story behind co-creation",
                "Clarify roles, tasks, and sequence for cooking"
              ],
              materials: ["Day 1 materials", "Future Recipe document", "Seating arrangement"],
              tips: ["Create comfortable atmosphere", "Ensure everyone's voice is heard", "Build excitement for cooking"]
            }
          ]
        },
        {
          name: "Collaborative Cooking and Guided Conversation",
          icon: Utensils,
          color: "bg-relish-paper border-relish-warm",
          modules: [
            {
              id: "2-2",
              title: "Cooking as Heritage Practice",
              duration: "45 min",
              purpose: "To understand cooking as cultural practice weaving habits, family learning, and collective identity",
              steps: [
                "Begin collaborative cooking of the Future Recipe",
                "Facilitate conversation about everyday cooking relationships",
                "Prompts: Do you use recipes daily? How do you use them?",
                "Discuss: Do you write down new recipes?",
                "Explore: How do you interact with the kitchen?",
                "Observer takes detailed field notes",
                "Document embodied practices and gestures"
              ],
              materials: ["All cooking equipment", "Ingredients", "Recording devices", "Observer notebook"],
              tips: ["Let participants lead cooking", "Ask open-ended questions", "Observe tacit knowledge"]
            },
            {
              id: "2-3",
              title: "The Memory-Aroma Connection",
              duration: "30 min",
              purpose: "To explore how senses function as memory repositories and tools for decision-making",
              steps: [
                "Continue cooking while focusing on sensory dimensions",
                "Prompt participants to notice smells, textures, sounds",
                "Ask: What do these smells evoke for you?",
                "Discuss: Which sensory cues guide your cooking decisions?",
                "Explore: How do you know when something is 'done'?",
                "Help participants verbalize tacit sensory criteria",
                "Link sensory experiences to memories and emotions"
              ],
              materials: ["Ongoing cooking setup", "Recording equipment"],
              tips: ["Slow down to notice details", "Validate intuitive knowledge", "Connect senses to memory"]
            },
            {
              id: "2-4",
              title: "Dialogue on Intangible Culinary Heritage",
              duration: "30 min",
              purpose: "To prompt critical reflection on personal and collective relationship with culinary heritage",
              steps: [
                "Continue cooking while discussing heritage concepts",
                "Ask: What does culinary heritage mean to you?",
                "Explore: Do you feel connected to specific traditions?",
                "Discuss: Should heritage be preserved? How? By whom?",
                "Reflect: What's your role in preservation or transformation?",
                "Frame heritage as living practice, not fixed tradition",
                "Allow space for questioning and reinterpretation"
              ],
              materials: ["Cooking in progress", "Recording devices"],
              tips: ["Embrace complexity and ambivalence", "Avoid imposing single narrative", "Value diverse relationships to heritage"]
            },
            {
              id: "2-5",
              title: "Future and Culinary Innovation",
              duration: "30 min",
              purpose: "To explore future imaginaries and position participants as agents of change",
              steps: [
                "Continue cooking while looking forward",
                "Ask: How do you imagine culinary heritage evolving?",
                "Discuss: What hopes or concerns about future changes?",
                "Explore: What role will you play in transformation?",
                "Reflect: What legacy for future generations?",
                "Connect current cooking to future possibilities",
                "Document participant visions and expectations"
              ],
              materials: ["Cooking equipment", "Recording devices"],
              tips: ["Encourage imaginative thinking", "Balance optimism and realism", "Recognize agency"]
            }
          ]
        },
        {
          name: "Plating and Collective Tasting",
          icon: CheckCircle,
          color: "bg-relish-paper border-relish-accent",
          modules: [
            {
              id: "2-6",
              title: "Tasting Memory in Evolution",
              duration: "45 min",
              purpose: "To build bridges between past and future through collective reflection",
              steps: [
                "Plate the prepared dish together",
                "Share the meal among all participants",
                "Discuss how dish relates to shared narrative",
                "Reflect on aspects of innovation, change, or future",
                "Compare expected vs. actual results",
                "Gather final reflections and evaluations",
                "Thank participants and close the workshop",
                "Optional: Collect materials and photographs"
              ],
              materials: ["Plates and serving items", "Camera", "Evaluation forms (optional)"],
              tips: ["Create celebratory atmosphere", "Honor the collective work", "Document final reflections"]
            }
          ]
        }
      ]
    }
  };


  const currentDayData = currentDay === 1 ? workshopData.day1 : workshopData.day2;
  const phase = currentDayData.phases[currentPhase];
  const module = phase.modules[currentModule];

  // Parse duration string to minutes
  const parseDuration = (duration) => {
    const match = duration.match(/(\d+)/);
    return match ? parseInt(match[0]) : 30;
  };

  // Timer functionality
  useEffect(() => {
    let interval;
    if (timerActive && timeRemaining !== null) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (timerMode === 'countdown') {
            if (prev <= 1) {
              setTimerActive(false);
              playTimerSound();
              return 0;
            }
            return prev - 1;
          } else {
            // Stopwatch mode
            return prev + 1;
          }
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining, timerMode]);

  const playTimerSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const startTimer = (minutes = null) => {
    const mins = minutes || parseDuration(module.duration);
    setTimeRemaining(mins * 60);
    setTimerActive(true);
    setTimerMode('countdown');
    setShowTimerSettings(false);
  };

  const startStopwatch = () => {
    setTimeRemaining(0);
    setTimerActive(true);
    setTimerMode('stopwatch');
    setShowTimerSettings(false);
  };

  const pauseTimer = () => {
    setTimerActive(false);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimeRemaining(null);
  };

  const toggleChecklistItem = (itemId) => {
    setChecklistState((prev) => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const normalizePhoto = useCallback((photo) => {
    if (!photo) {
      return null;
    }
    const storagePath = typeof photo.storagePath === 'string' ? photo.storagePath.replace(/\\/g, '/') : '';
    return {
      id: photo._id || photo.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      storagePath,
      fileUrl: photo.fileUrl || null,
      originalName: photo.originalName || photo.filename || 'Workshop photo',
      caption: photo.caption || '',
      notes: photo.notes || '',
      day: Number.isInteger(photo.day) ? photo.day : currentDay,
      phaseIndex: Number.isInteger(photo.phaseIndex) ? photo.phaseIndex : currentPhase,
      moduleId: typeof photo.moduleId === 'string' && photo.moduleId.trim().length > 0 ? photo.moduleId : null,
      participantIds: Array.isArray(photo.participantIds) ? photo.participantIds : [],
      uploadedBy: photo.uploadedBy || null,
      workshopId: photo.workshopId || null,
      createdAt: photo.createdAt || new Date().toISOString(),
      updatedAt: photo.updatedAt || photo.createdAt || null,
      mimeType: photo.mimeType || '',
      size: photo.size || 0
    };
  }, [currentDay, currentPhase]);

  const getPhotoId = (photo) => photo?.id || photo?._id || null;

  const buildPhotoUrl = (photo) => {
    const id = getPhotoId(photo);
    if (id && photoPreviews[id]) {
      return photoPreviews[id];
    }
    if (photo?.fileUrl) {
      const base = API_BASE_URL.replace(/\/+$/, '');
      const path = photo.fileUrl.startsWith('/') ? photo.fileUrl : `/${photo.fileUrl}`;
      return `${base}${path}`;
    }
    if (photo?.storagePath) {
      const base = API_BASE_URL.replace(/\/+$/, '');
      const path = photo.storagePath.replace(/^\/+/, '');
      return `${base}/${path}`;
    }
    return '';
  };

  const uploadPhotoFile = async (file) => {
    if (!isAuthenticated) {
      throw new Error('Please sign in to upload photos.');
    }
    const formData = new FormData();
    formData.append('day', String(currentDay));
    formData.append('phaseIndex', String(currentPhase));
    if (module?.id) {
      formData.append('moduleId', module.id);
    }
    if ((isFacilitator || isAdmin) && activeWorkshopId) {
      formData.append('workshopId', activeWorkshopId);
    }
    // Placeholder for participant tagging; currently no participants are selected but
    // the backend expects the field to exist in the payload.
    formData.append('participantIds', '');
    formData.append('photo', file);

    const response = await authFetch(`${API_BASE_URL}/api/photos`, {
      method: 'POST',
      body: formData
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      const message = payload?.message || 'Failed to upload photo';
      throw new Error(message);
    }

    const normalized = normalizePhoto(payload);
    if (!normalized) {
      throw new Error('Photo upload response was empty');
    }
    return normalized;
  };

  const handlePhotoUploadChange = async (event) => {
    const fileList = Array.from(event.target.files || []);
    if (fileList.length === 0) return;

    const oversize = fileList.find((file) => file.size > PHOTO_MAX_SIZE_BYTES);
    if (oversize) {
      setPhotosError(`"${oversize.name}" exceeds the ${Math.round(PHOTO_MAX_SIZE_BYTES / (1024 * 1024))}MB limit. Please choose a smaller file.`);
      event.target.value = '';
      return;
    }

    const invalidType = fileList.find((file) => !file.type.startsWith('image/'));
    if (invalidType) {
      setPhotosError(`"${invalidType.name}" is not an image. Please choose image files only.`);
      event.target.value = '';
      return;
    }

    setPhotosError(null);
    setPhotoUploading(true);

    try {
      const uploaded = [];
      for (const file of fileList) {
        const photo = await uploadPhotoFile(file);
        uploaded.push(photo);
      }
      if (uploaded.length) {
        setPhotos((prev) => [...uploaded, ...prev]);
      }
    } catch (error) {
      console.error('Photo upload failed', error);
      setPhotosError(error.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
      event.target.value = '';
    }
  };

  const openPhotoUploader = () => {
    setPhotosError(null);
    photoInputRef.current?.click();
  };

  const openPhotoPreview = (index) => {
    setActivePhotoIndex(index);
  };

  const closePhotoPreview = () => {
    setActivePhotoIndex(null);
    setShowPhotoDeleteConfirm(false);
    setPendingDeletePhotoId(null);
  };

  const closePhotoManager = () => {
    setShowPhotoManager(false);
    setActivePhotoIndex(null);
    setShowPhotoDeleteConfirm(false);
    setPendingDeletePhotoId(null);
    setPhotosError(null);
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraCapture(false);
    setCameraError(null);
  };

  const openCameraCapture = async () => {
    setCameraError(null);
    setPhotosError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported on this device.');
      setShowCameraCapture(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setCameraStream(stream);
      setShowCameraCapture(true);
    } catch (error) {
      console.error('Unable to access camera', error);
      setCameraError('Unable to access camera. Please check permissions and try again.');
      setShowCameraCapture(true);
    }
  };

  const closeCameraCapture = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraCapture(false);
    setCameraError(null);
  };

  const capturePhotoFromCamera = async () => {
    const videoElement = cameraVideoRef.current;
    const canvasElement = cameraCanvasRef.current;
    if (!videoElement || !canvasElement) return;

    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    if (!width || !height) return;

    canvasElement.width = width;
    canvasElement.height = height;
    const context = canvasElement.getContext('2d');
    if (!context) return;

    context.drawImage(videoElement, 0, 0, width, height);
    const blob = await new Promise((resolve) => {
      canvasElement.toBlob(resolve, 'image/jpeg', 0.92);
    });

    let finalBlob = blob;
    if (!finalBlob) {
      try {
        const fallbackDataUrl = canvasElement.toDataURL('image/jpeg', 0.92);
        const response = await fetch(fallbackDataUrl);
        finalBlob = await response.blob();
      } catch (error) {
        finalBlob = null;
      }
    }

    if (!finalBlob) {
      setPhotosError('Unable to capture photo from camera. Please try again.');
      return;
    }

    const fileName = `Captured-${new Date().toISOString()}.jpg`;
    const captureFile = new File([finalBlob], fileName, { type: finalBlob.type || 'image/jpeg' });

    setPhotosError(null);
    setPhotoUploading(true);

    try {
      const uploaded = await uploadPhotoFile(captureFile);
      setPhotos((prev) => [uploaded, ...prev]);
      setActivePhotoIndex(0);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
      setShowCameraCapture(false);
    } catch (error) {
      console.error('Unable to upload captured photo', error);
      setPhotosError(error.message || 'Failed to upload captured photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const showNextPhoto = (direction) => {
    setActivePhotoIndex((prev) => {
      if (prev === null) return prev;
      const total = visiblePhotos.length;
      if (total === 0) return null;
      const nextIndex = (prev + direction + total) % total;
      return nextIndex;
    });
    setShowPhotoDeleteConfirm(false);
    setPendingDeletePhotoId(null);
  };

  const requestPhotoDelete = (photoId) => {
    if (!photoId) return;
    setPendingDeletePhotoId(photoId);
    setShowPhotoDeleteConfirm(true);
  };

  const cancelPhotoDelete = () => {
    setShowPhotoDeleteConfirm(false);
    setPendingDeletePhotoId(null);
  };

  const confirmPhotoDelete = async () => {
    if (!pendingDeletePhotoId) return;
    await removePhoto(pendingDeletePhotoId);
    setShowPhotoDeleteConfirm(false);
    setPendingDeletePhotoId(null);
  };

  const removePhoto = async (photoId) => {
    if (!photoId) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/photos/${photoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        let message = 'Failed to delete photo';
        try {
          const payload = await response.json();
          message = payload?.message || message;
        } catch (parseError) {
          try {
            const text = await response.text();
            if (text) message = text;
          } catch (textError) {
            // ignore
          }
        }
        throw new Error(message);
      }

      setPhotos((prev) => prev.filter((photo) => getPhotoId(photo) !== photoId));
      setActivePhotoIndex(null);
      setPhotosError(null);
    } catch (error) {
      console.error('Failed to delete photo', error);
      setPhotosError(error.message || 'Failed to delete photo');
    }
  };

  const updatePhotoCaption = (photoId, caption) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        getPhotoId(photo) === photoId
          ? {
              ...photo,
              caption,
              updatedAt: new Date().toISOString()
            }
          : photo
      )
    );
  };

  const formatPhotoTimestamp = (value) => {
    if (!value) return 'Timestamp unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Timestamp unavailable';
    return date.toLocaleString();
  };

  const describePhotoContext = (photo) => {
    if (!photo) return '';
    const parts = [];
    if (photo.day) parts.push(`Day ${photo.day}`);
    if (photo.moduleId) parts.push(`Module ${photo.moduleId}`);
    return parts.length ? parts.join(' • ') : 'Captured during workshop';
  };

  const getUploaderLabel = (photo) => {
    if (!photo?.uploadedBy) return 'Unknown uploader';
    if (photo.uploadedBy.role === 'facilitator') return `Facilitator: ${photo.uploadedBy.name}`;
    if (photo.uploadedBy.role === 'participant') return `Participant: ${photo.uploadedBy.name}`;
    if (photo.uploadedBy.role === 'admin') return 'Workshop Admin';
    return photo.uploadedBy.name || 'Unknown uploader';
  };

  const getWorkshopLabel = (workshopId) => {
    if (!workshopId) return 'Unassigned';
    const workshop = workshops.find((item) => (item._id || item.id) === String(workshopId))
      || workshops.find((item) => String(item._id || item.id) === String(workshopId));
    return workshop?.name || 'Unknown workshop';
  };

  const getWorkshopParticipantCount = (workshopId) =>
    participants.filter((participant) => String(participant.workshopId || '') === String(workshopId)).length;

  const getWorkshopPhotoCount = (workshopId) =>
    photos.filter((photo) => String(photo.workshopId || '') === String(workshopId)).length;

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining === null) return 'text-relish-ink-muted';
    if (timerMode === 'stopwatch') return 'text-relish-smoke';
    if (timeRemaining < 60) return 'text-relish-accent';
    if (timeRemaining < 300) return 'text-relish-ink';
    return 'text-relish-smoke';
  };

  const toggleModuleComplete = (moduleId) => {
    const newCompleted = new Set(completedModules);
    if (newCompleted.has(moduleId)) {
      newCompleted.delete(moduleId);
    } else {
      newCompleted.add(moduleId);
    }
    setCompletedModules(newCompleted);
  };

  const nextModule = () => {
    resetTimer(); // Reset timer when changing modules
    if (currentModule < phase.modules.length - 1) {
      setCurrentModule(currentModule + 1);
    } else if (currentPhase < currentDayData.phases.length - 1) {
      setCurrentPhase(currentPhase + 1);
      setCurrentModule(0);
    } else if (currentDay === 1) {
      setCurrentDay(2);
      setCurrentPhase(0);
      setCurrentModule(0);
    }
  };

  const prevModule = () => {
    resetTimer(); // Reset timer when changing modules
    if (currentModule > 0) {
      setCurrentModule(currentModule - 1);
    } else if (currentPhase > 0) {
      setCurrentPhase(currentPhase - 1);
      setCurrentModule(currentDayData.phases[currentPhase - 1].modules.length - 1);
    } else if (currentDay === 2) {
      setCurrentDay(1);
      const day1Phases = workshopData.day1.phases;
      setCurrentPhase(day1Phases.length - 1);
      setCurrentModule(day1Phases[day1Phases.length - 1].modules.length - 1);
    }
  };

  const PhaseIcon = phase.icon;
  const participantCount = participants.length;
  const participantCountForButton = useMemo(() => {
    if (!isFacilitator) return participantCount;
    if (!activeWorkshopId) return 0;
    return participants.filter((participant) => String(participant.workshopId || '') === String(activeWorkshopId)).length;
  }, [participants, activeWorkshopId, isFacilitator, participantCount]);
  const overlayStateClass = splashState === 'visible' ? 'splash-overlay-visible' : splashState === 'hiding' ? 'splash-overlay-hiding' : '';

  const activeWorkshop = useMemo(
    () => workshops.find((workshop) => (workshop._id || workshop.id) === activeWorkshopId) || null,
    [activeWorkshopId, workshops]
  );

  useEffect(() => {
    if (activeWorkshop?.name) {
      setWorkshopEditName(activeWorkshop.name);
      setIsEditingWorkshopName(false);
    }
  }, [activeWorkshop]);

  const visibleParticipants = useMemo(() => {
    if (!activeWorkshopId) return participants;
    return participants.filter((participant) => {
      const workshopId = participant.workshopId || participant.workshop || null;
      return String(workshopId || '') === String(activeWorkshopId);
    });
  }, [participants, activeWorkshopId]);

  const visibleParticipantsForFacilitator = useMemo(() => {
    if (!isFacilitator) return participants;
    if (!activeWorkshopId) {
      return participants.filter((participant) => !participant.workshopId);
    }
    const scopedParticipants = participants.filter((participant) =>
      !participant.workshopId || String(participant.workshopId) === String(activeWorkshopId)
    );
    const assigned = scopedParticipants.filter((participant) => participant.workshopId);
    const unassigned = scopedParticipants.filter((participant) => !participant.workshopId);
    return [...assigned, ...unassigned];
  }, [participants, activeWorkshopId, isFacilitator]);

  const unassignedParticipants = useMemo(() =>
    participants.filter((participant) => !participant.workshopId),
    [participants]
  );

  const adminUnassignedPhotos = useMemo(
    () => photos.filter((photo) => !photo.workshopId),
    [photos]
  );

  const workshopScopedPhotos = useMemo(() => {
    if (!activeWorkshopId) return [];
    return photos.filter((photo) => String(photo.workshopId || '') === String(activeWorkshopId));
  }, [photos, activeWorkshopId]);

  const visiblePhotos = useMemo(() => {
    if (isAdmin) {
      return activeWorkshopId ? workshopScopedPhotos : adminUnassignedPhotos;
    }
    if (!activeWorkshopId) return photos;
    return photos.filter((photo) => String(photo.workshopId || '') === String(activeWorkshopId));
  }, [photos, activeWorkshopId, isAdmin, adminUnassignedPhotos, workshopScopedPhotos]);

  const photoCountForButton = isAdmin
    ? adminUnassignedPhotos.length + workshopScopedPhotos.length
    : visiblePhotos.length;

  useEffect(() => {
    try {
      window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklistState));
    } catch (error) {
      console.error('Failed to save checklist state', error);
    }
  }, [checklistState]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchParticipants = async () => {
      if (!isAuthenticated || (!isFacilitator && !isAdmin)) {
        if (isMounted) {
          setParticipants([]);
          setParticipantsLoading(false);
          setParticipantsError(null);
        }
        return;
      }
      if (isMounted) {
        setParticipantsLoading(true);
        setParticipantsError(null);
      }
      try {
        const response = await authFetch(`${API_BASE_URL}/api/participants`, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error('Failed to load participants');
        }
        const data = await response.json();
        if (isMounted) {
          setParticipants(data);
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to load participants', error);
        if (isMounted) {
          setParticipantsError(error.message || 'Failed to load participants');
        }
      } finally {
        if (isMounted) {
          setParticipantsLoading(false);
        }
      }
    };

    fetchParticipants();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [authFetch, isFacilitator, isAdmin, isAuthenticated]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchFacilitators = async () => {
      if (!isAuthenticated || !isAdmin) {
        if (isMounted) {
          setFacilitators([]);
          setFacilitatorsLoading(false);
          setFacilitatorsError(null);
        }
        return;
      }

      if (isMounted) {
        setFacilitatorsLoading(true);
        setFacilitatorsError(null);
      }

      try {
        const response = await authFetch(`${API_BASE_URL}/api/users?role=facilitator`, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error('Failed to load facilitators');
        }
        const data = await response.json();
        if (isMounted) {
          setFacilitators(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to load facilitators', error);
        if (isMounted) {
          setFacilitatorsError(error.message || 'Failed to load facilitators');
        }
      } finally {
        if (isMounted) {
          setFacilitatorsLoading(false);
        }
      }
    };

    fetchFacilitators();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [authFetch, isAdmin, isAuthenticated]);

  const loadParticipantAccounts = useCallback(async (signal) => {
    if (!isAuthenticated || (!isAdmin && !isFacilitator)) {
      setParticipantAccounts([]);
      setParticipantAccountsLoading(false);
      setParticipantAccountsError(null);
      return;
    }

    setParticipantAccountsLoading(true);
    setParticipantAccountsError(null);

    try {
      const response = await authFetch(`${API_BASE_URL}/api/users?role=participant`, {
        signal
      });
      if (!response.ok) {
        throw new Error('Failed to load participant accounts');
      }
      const data = await response.json();
      setParticipantAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Failed to load participant accounts', error);
      setParticipantAccountsError(error.message || 'Failed to load participant accounts');
    } finally {
      setParticipantAccountsLoading(false);
    }
  }, [authFetch, isAdmin, isFacilitator, isAuthenticated]);

  useEffect(() => {
    const controller = new AbortController();
    loadParticipantAccounts(controller.signal);
    return () => controller.abort();
  }, [loadParticipantAccounts]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchWorkshops = async () => {
      if (!isAuthenticated || (!isFacilitator && !isAdmin)) {
        if (isMounted) {
          setWorkshops([]);
          setWorkshopsLoading(false);
          setWorkshopsError(null);
          setActiveWorkshopId(null);
        }
        return;
      }

      if (isMounted) {
        setWorkshopsLoading(true);
        setWorkshopsError(null);
      }

      try {
        const response = await authFetch(`${API_BASE_URL}/api/workshops`, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error('Failed to load workshops');
        }
        const data = await response.json();
        if (isMounted) {
          const workshopList = Array.isArray(data) ? data : [];
          setWorkshops(workshopList);
          if (isFacilitator && workshopList.length > 0) {
            const currentId = String(activeWorkshopId || '');
            const hasCurrent = workshopList.some((workshop) => String(workshop._id || workshop.id) === currentId);
            if (!hasCurrent) {
              setActiveWorkshopId(workshopList[0]._id || workshopList[0].id || null);
            }
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to load workshops', error);
        if (isMounted) {
          setWorkshopsError(error.message || 'Failed to load workshops');
        }
      } finally {
        if (isMounted) {
          setWorkshopsLoading(false);
        }
      }
    };

    fetchWorkshops();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [authFetch, isFacilitator, isAdmin, isAuthenticated]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchPhotos = async () => {
      if (!isAuthenticated) {
        if (isMounted) {
          setPhotos([]);
          setPhotosLoading(false);
          setPhotosError(null);
        }
        return;
      }
      if (isMounted) {
        setPhotosLoading(true);
        setPhotosError(null);
      }

      try {
        const response = await authFetch(`${API_BASE_URL}/api/photos`, {
          signal: controller.signal
        });

        let payload = null;
        try {
          payload = await response.json();
        } catch (error) {
          payload = null;
        }

        if (!response.ok) {
          throw new Error(payload?.message || 'Failed to load photos');
        }

        if (isMounted && Array.isArray(payload)) {
          setPhotos(payload.map((item) => normalizePhoto(item)).filter(Boolean));
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to load photos', error);
        if (isMounted) {
          setPhotosError(error.message || 'Failed to load photos');
        }
      } finally {
        if (isMounted) {
          setPhotosLoading(false);
        }
      }
    };

    fetchPhotos();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [normalizePhoto, isAuthenticated, authFetch]);

  useEffect(() => {
    setPhotoPreviews((prev) => {
      const next = {};
      photos.forEach((photo) => {
        const id = getPhotoId(photo);
        if (id && prev[id]) {
          next[id] = prev[id];
        }
      });

      Object.entries(prev).forEach(([id, url]) => {
        if (!next[id]) {
          URL.revokeObjectURL(url);
        }
      });

      return next;
    });
  }, [photos]);

  useEffect(() => {
    if (!isAuthenticated || photos.length === 0) return undefined;
    let isMounted = true;
    const controller = new AbortController();

    const loadPreviews = async () => {
      const pending = photos.filter((photo) => photo.fileUrl && !photoPreviews[getPhotoId(photo)]);
      for (const photo of pending) {
        const id = getPhotoId(photo);
        if (!id) continue;
        try {
          const response = await authFetch(`${API_BASE_URL}${photo.fileUrl}`, {
            method: 'GET',
            signal: controller.signal
          });
          if (!response.ok) {
            continue;
          }
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          if (isMounted) {
            setPhotoPreviews((prev) => ({ ...prev, [id]: url }));
          } else {
            URL.revokeObjectURL(url);
          }
        } catch (error) {
          if (error.name === 'AbortError') return;
        }
      }
    };

    loadPreviews();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [photos, isAuthenticated, authFetch, photoPreviews]);

  useEffect(() => {
    const videoElement = cameraVideoRef.current;
    if (videoElement && cameraStream) {
      videoElement.srcObject = cameraStream;
      videoElement.play().catch((error) => {
        console.error('Unable to start camera preview', error);
      });
    }
    return () => {
      if (videoElement && videoElement.srcObject) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (activePhotoIndex === null) return;
    if (activePhotoIndex >= visiblePhotos.length) {
      setActivePhotoIndex(null);
    }
  }, [activePhotoIndex, visiblePhotos.length]);

  const resetParticipantForm = () => {
    setParticipantForm({
      name: '',
      email: '',
      dietary: '',
      cultural: '',
      notes: ''
    });
    setEditingParticipantId(null);
    setEditingParticipantUserId(null);
  };

  const handleParticipantChange = (event) => {
    const { name, value } = event.target;
    setParticipantForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleParticipantSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = participantForm.name.trim();
    if (!trimmedName) return;

    const payload = {
      name: trimmedName,
      dietary: participantForm.dietary.trim(),
      cultural: participantForm.cultural.trim(),
      notes: participantForm.notes.trim()
    };

    if (!editingParticipantId || !editingParticipantUserId) {
      payload.email = participantForm.email.trim();
    }

    if (isAdmin && selectedWorkshopId) {
      payload.workshopId = selectedWorkshopId;
    } else if (activeWorkshopId) {
      payload.workshopId = activeWorkshopId;
    }

    const isEditing = Boolean(editingParticipantId);
    const endpoint = isEditing
      ? `${API_BASE_URL}/api/participants/${editingParticipantId}`
      : `${API_BASE_URL}/api/participants`;

    try {
      const response = await authFetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save participant');
      }

      const savedParticipant = await response.json();
      const savedId = savedParticipant._id || savedParticipant.id;

      setParticipants((prev) => {
        if (isEditing) {
          return prev.map((participant) =>
            (participant._id || participant.id) === savedId ? savedParticipant : participant
          );
        }
        return [savedParticipant, ...prev];
      });

      resetParticipantForm();
    } catch (error) {
      console.error('Failed to save participant', error);
      window.alert('Could not save participant. Please try again.');
    }
  };

  const handleEditParticipant = (participant) => {
    if (!participant) return;
    setParticipantForm({
      name: participant.name ?? '',
      email: participant.email ?? '',
      dietary: participant.dietary ?? '',
      cultural: participant.cultural ?? '',
      notes: participant.notes ?? ''
    });
    setEditingParticipantId(participant._id || participant.id || null);
    setEditingParticipantUserId(participant.userId || null);
  };

  const handleDeleteParticipant = async (participant) => {
    const participantId = participant?._id || participant?.id;
    const name = participant?.name || 'this participant';
    if (!participantId) {
      window.alert('Unable to delete participant: missing identifier.');
      return;
    }
    if (!window.confirm(`Remove ${name}?`)) {
      return;
    }

    try {
      const response = await authFetch(`${API_BASE_URL}/api/participants/${participantId}`, {
        method: 'DELETE'
      });
      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete participant');
      }

      setParticipants((prev) => prev.filter((item) => (item._id || item.id) !== participantId));
      if (editingParticipantId === participantId) {
        resetParticipantForm();
      }
      if (participant?.userId) {
        loadParticipantAccounts();
      }
    } catch (error) {
      console.error('Failed to delete participant', error);
      window.alert('Could not delete participant. Please try again.');
    }
  };

  const handleAssignParticipant = async (participant) => {
    if (!activeWorkshopId) return;
    const participantId = participant?._id || participant?.id;
    if (!participantId) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/participants/${participantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workshopId: activeWorkshopId })
      });

      if (!response.ok) {
        throw new Error('Failed to assign participant');
      }

      const updatedParticipant = await response.json();
      setParticipants((prev) =>
        prev.map((item) => ((item._id || item.id) === participantId ? updatedParticipant : item))
      );
      setAssigningParticipantId(null);
    } catch (error) {
      console.error('Failed to assign participant', error);
      window.alert('Could not assign participant. Please try again.');
    }
  };

  const requestDeleteOwnWorkshop = () => {
    if (!activeWorkshopId || !activeWorkshop) return;
    setShowFacilitatorWorkshopDeleteConfirm(true);
  };

  const cancelDeleteOwnWorkshop = () => {
    setShowFacilitatorWorkshopDeleteConfirm(false);
  };

  const confirmDeleteOwnWorkshop = async () => {
    if (!activeWorkshopId || !activeWorkshop) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/workshops/${activeWorkshopId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete workshop');
      }

      setWorkshops((prev) => prev.filter((item) => (item._id || item.id) !== activeWorkshopId));
      setParticipants((prev) =>
        prev.map((participant) =>
          String(participant.workshopId || '') === String(activeWorkshopId)
            ? { ...participant, workshopId: null }
            : participant
        )
      );
      setActiveWorkshopId(null);
      setIsEditingWorkshopName(false);
      setWorkshopEditName('');
      setShowFacilitatorWorkshopDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete workshop', error);
      window.alert('Could not delete workshop. Please try again.');
    }
  };

  const handleWorkshopFormChange = (event) => {
    const { name, value } = event.target;
    setWorkshopForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateWorkshop = async (event) => {
    event.preventDefault();
    if (!workshopForm.name.trim()) return;

    try {
      const payload = {
        name: workshopForm.name.trim()
      };
      if (isAdmin) {
        payload.facilitatorId = workshopForm.facilitatorId || null;
      }
      const response = await authFetch(`${API_BASE_URL}/api/workshops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to create workshop');
      }

      const createdWorkshop = await response.json();
      setWorkshops((prev) => [createdWorkshop, ...prev]);
      setWorkshopForm({ name: '', facilitatorId: '' });
    } catch (error) {
      console.error('Failed to create workshop', error);
      window.alert('Could not create workshop. Please try again.');
    }
  };

  const handleAssignWorkshopFacilitator = async (workshop, facilitatorId) => {
    if (!workshop || !facilitatorId) return;
    const workshopId = workshop._id || workshop.id;
    try {
      const response = await authFetch(`${API_BASE_URL}/api/workshops/${workshopId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ facilitatorId })
      });

      if (!response.ok) {
        throw new Error('Failed to assign facilitator');
      }

      const updatedWorkshop = await response.json();
      setWorkshops((prev) =>
        prev.map((item) => ((item._id || item.id) === (updatedWorkshop._id || updatedWorkshop.id) ? updatedWorkshop : item))
      );
    } catch (error) {
      console.error('Failed to assign facilitator', error);
      window.alert('Could not assign facilitator. Please try again.');
    }
  };

  const handleUpdateWorkshopName = async () => {
    if (!activeWorkshopId || !workshopEditName.trim()) return;
    setWorkshopSaving(true);
    try {
      const response = await authFetch(`${API_BASE_URL}/api/workshops/${activeWorkshopId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: workshopEditName.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to update workshop');
      }

      const updatedWorkshop = await response.json();
      setWorkshops((prev) =>
        prev.map((item) => ((item._id || item.id) === (updatedWorkshop._id || updatedWorkshop.id) ? updatedWorkshop : item))
      );
    } catch (error) {
      console.error('Failed to update workshop', error);
      window.alert('Could not update workshop name. Please try again.');
    } finally {
      setWorkshopSaving(false);
    }
  };

  const beginWorkshopNameEdit = (workshop) => {
    const workshopId = workshop?._id || workshop?.id;
    if (!workshopId) return;
    setAssigningWorkshopEditId(workshopId);
    setWorkshopEditNameAdmin(workshop.name || '');
  };

  const cancelWorkshopNameAdmin = () => {
    setAssigningWorkshopEditId(null);
    setWorkshopEditNameAdmin('');
  };

  const handleSaveWorkshopNameAdmin = async (workshop) => {
    if (!workshop) return;
    const workshopId = workshop._id || workshop.id;
    if (!workshopId || !workshopEditNameAdmin.trim()) return;
    setWorkshopSaving(true);
    try {
      const response = await authFetch(`${API_BASE_URL}/api/workshops/${workshopId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: workshopEditNameAdmin.trim() })
      });
      if (!response.ok) {
        throw new Error('Failed to update workshop');
      }
      const updatedWorkshop = await response.json();
      setWorkshops((prev) =>
        prev.map((item) => ((item._id || item.id) === (updatedWorkshop._id || updatedWorkshop.id) ? updatedWorkshop : item))
      );
      cancelWorkshopNameAdmin();
    } catch (error) {
      console.error('Failed to update workshop', error);
      window.alert('Could not update workshop name. Please try again.');
    } finally {
      setWorkshopSaving(false);
    }
  };

  const handleSetParticipantWorkshop = async (participant, workshopId) => {
    const participantId = participant?._id || participant?.id;
    if (!participantId) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/participants/${participantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workshopId: workshopId || null })
      });

      if (!response.ok) {
        throw new Error('Failed to update participant');
      }

      const updatedParticipant = await response.json();
      setParticipants((prev) =>
        prev.map((item) => ((item._id || item.id) === participantId ? updatedParticipant : item))
      );
    } catch (error) {
      console.error('Failed to update participant workshop', error);
      window.alert('Could not update participant. Please try again.');
    }
  };

  const beginAssignParticipant = (participant) => {
    const participantId = participant?._id || participant?.id;
    if (!participantId) return;
    setAssigningParticipantId(participantId);
  };

  const cancelAssignParticipant = () => {
    setAssigningParticipantId(null);
  };

  const confirmAssignParticipant = (participant) => {
    if (!selectedWorkshopId) return;
    handleSetParticipantWorkshop(participant, selectedWorkshopId);
    setAssigningParticipantId(null);
  };

  const beginAssignAccount = (account) => {
    const accountId = account?._id || account?.id;
    if (!accountId) return;
    setAssigningAccountId(accountId);
    setSelectedWorkshopId('');
  };

  const cancelAssignAccount = () => {
    setAssigningAccountId(null);
    setSelectedWorkshopId('');
  };

  const confirmAssignAccount = async (account) => {
    const targetWorkshopId = isAdmin ? selectedWorkshopId : activeWorkshopId;
    if (!targetWorkshopId) return;
    const name = (account?.name || '').trim() || (account?.email ? account.email.split('@')[0] : 'Participant');
    const email = (account?.email || '').trim();

    try {
      const response = await authFetch(`${API_BASE_URL}/api/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          workshopId: targetWorkshopId,
          userId: account._id || account.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register participant');
      }

      const createdParticipant = await response.json();
      setParticipants((prev) => [createdParticipant, ...prev]);
      setParticipantAccounts((prev) =>
        prev.filter((item) => (item._id || item.id) !== (account._id || account.id))
      );
      setAssigningAccountId(null);
      if (isAdmin) {
        setSelectedWorkshopId('');
      }
    } catch (error) {
      console.error('Failed to register participant from account', error);
      window.alert('Could not assign this account. Please try again.');
    }
  };

  const handleDeleteWorkshop = async (workshop) => {
    if (!workshop) return;
    setPendingWorkshopDelete(workshop);
    setShowWorkshopDeleteConfirm(true);
  };

  const cancelWorkshopDelete = () => {
    setPendingWorkshopDelete(null);
    setShowWorkshopDeleteConfirm(false);
  };

  const confirmWorkshopDelete = async () => {
    if (!pendingWorkshopDelete) return;
    const workshopId = pendingWorkshopDelete._id || pendingWorkshopDelete.id;
    if (!workshopId) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/workshops/${workshopId}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete workshop');
      }

      setWorkshops((prev) => prev.filter((item) => (item._id || item.id) !== workshopId));
      setPhotos((prev) => prev.filter((photo) => String(photo.workshopId || '') !== String(workshopId)));
      if (String(activeWorkshopId || '') === String(workshopId)) {
        setActiveWorkshopId(null);
      }
      setPendingWorkshopDelete(null);
      setShowWorkshopDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete workshop', error);
      window.alert('Could not delete workshop. Please try again.');
    }
  };

  const handleExportParticipants = () => {
    const workshopById = new Map(
      workshops.map((workshop) => [String(workshop._id || workshop.id), workshop])
    );
    const facilitatorsWithWorkshops = facilitators.map((facilitator) => {
      const facilitatorId = facilitator._id || facilitator.id;
      const assignedWorkshops = workshops.filter(
        (workshop) => String(workshop.facilitatorId?._id || workshop.facilitatorId || '') === String(facilitatorId)
      );
      return {
        ...facilitator,
        workshops: assignedWorkshops.map((workshop) => ({
          _id: workshop._id || workshop.id,
          name: workshop.name,
          archivedAt: workshop.archivedAt || null
        }))
      };
    });
    const participantsWithWorkshops = participants.map((participant) => {
      const workshop = participant.workshopId
        ? workshopById.get(String(participant.workshopId))
        : null;
      const facilitator = workshop?.facilitatorId || null;
      return {
        ...participant,
        workshop: workshop
          ? { _id: workshop._id || workshop.id, name: workshop.name, archivedAt: workshop.archivedAt || null }
          : null,
        facilitator: facilitator
          ? { _id: facilitator._id || facilitator.id, name: facilitator.name, email: facilitator.email }
          : null
      };
    });
    const payload = isAdmin
      ? {
          facilitators: facilitatorsWithWorkshops,
          registeredParticipants: participantsWithWorkshops,
          participantAccounts: participantAccounts
        }
      : participants;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = isAdmin ? 'participants-export.json' : 'participants.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportParticipants = (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const parsed = JSON.parse(result);
        if (!Array.isArray(parsed)) {
          window.alert('Import failed: JSON must be an array.');
        } else {
          const base = Date.now();
          const normalised = parsed
            .map((entry, idx) => ({
              id: entry?.id ?? base + idx,
              name: entry?.name ?? '',
              email: entry?.email ?? '',
              dietary: entry?.dietary ?? '',
              cultural: entry?.cultural ?? '',
              notes: entry?.notes ?? ''
            }))
            .filter((entry) => entry.name.trim().length > 0);
          setParticipants(normalised);
          resetParticipantForm();
        }
      } catch (error) {
        console.error('Import error', error);
        window.alert('Import failed: invalid JSON.');
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleCloseParticipants = () => {
    setShowParticipants(false);
    resetParticipantForm();
    setAssigningParticipantId(null);
    setAssigningAccountId(null);
    setSelectedWorkshopId('');
  };

  const openWorkshopCreator = () => {
    handleCloseParticipants();
    setWorkshopForm({ name: '', facilitatorId: '' });
    setShowWorkshops(true);
  };

  const openWorkshopDetail = (workshopId) => {
    setActiveWorkshopId(workshopId);
    setShowWorkshopDetail(true);
    setShowWorkshops(false);
  };

  const closeWorkshopDetail = () => {
    setShowWorkshopDetail(false);
    if (isAdmin) {
      setActiveWorkshopId(null);
    }
    resetParticipantForm();
  };

  return (
    <div className="relish-shell">
      {splashState !== 'hidden' && (
        <div
          role="button"
          tabIndex={0}
          onClick={dismissSplashScreen}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              dismissSplashScreen();
            }
          }}
          className={`splash-overlay ${overlayStateClass} fixed inset-0 z-[80] flex flex-col items-center justify-center px-6 text-center cursor-pointer bg-relish-paper`}
        >
          <img
            src={img1}
            alt=""
            className="splash-img-right absolute top-[20%] right-0"
          />
          <img
            src={img4}
            alt=""
            className="splash-img-left absolute bottom-[20%] left-0"
          />
          <div className="flex flex-col items-center gap-10">
            <div className="splash-logo-frame">
              <img
                src={logoPng}
                alt="Food Memories Workshop logo"
                className="splash-logo"
              />
            </div>
            <div className="splash-text-block max-w-2xl space-y-4 mt-16 md:mt-20">
              <p className="text-xs uppercase tracking-[0.4em] text-relish-smoke">Relish methodology</p>
              <p className="text-3xl md:text-5xl font-display text-relish-ink">Food Memories Workshop</p>
              <p className="text-base md:text-lg text-relish-ink-muted">
                An embodied archive of culinary memory, crafted for facilitators guiding speculative recipes and narrative care.
              </p>
            </div>
            <div className="splash-text-block text-sm text-relish-ink-muted flex items-center gap-3 splash-prompt">
              <span className="h-px w-16 bg-relish-ink/40" />
              Tap anywhere to enter
              <span className="h-px w-16 bg-relish-ink/40" />
            </div>
          </div>
        </div>
      )}
      {splashState === 'hidden' && authChecking && (
        <div className="min-h-screen flex items-center justify-center bg-relish-paper px-6">
          <div className="bg-white/90 border border-relish-linen rounded-[28px] p-8 shadow-relish-card text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-relish-smoke">Relish methodology</p>
            <p className="mt-3 text-xl font-display text-relish-ink">Checking your session…</p>
            <p className="text-sm text-relish-ink-muted mt-2">Please wait while we confirm your access.</p>
          </div>
        </div>
      )}
      {shouldShowAuth && (
        <div className="h-screen bg-relish-paper flex items-start justify-center px-6 py-8 relative overflow-hidden">
          <img
            src={img2}
            alt=""
            aria-hidden="true"
            className="absolute top-[15%] right-0 w-[28vw] max-w-[300px] pointer-events-none"
          />
          <img
            src={img3}
            alt=""
            aria-hidden="true"
            className="absolute bottom-[10%] left-0 w-[30vw] max-w-[320px] pointer-events-none"
          />
          <div className="relative z-10 w-full max-w-5xl max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex justify-center mb-12">
              <div className="auth-logo-frame">
                <img
                  src={logoPng}
                  alt="Food Memories Workshop logo"
                  className="splash-logo"
                />
              </div>
            </div>
            <div className="grid gap-8 md:grid-cols-[1.2fr,1fr] mt-8">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-relish-smoke font-semibold">Relish methodology</p>
              <h2 className="text-4xl font-display text-relish-ink">Welcome back to the Food Memories Workshop</h2>
              <p className="text-base text-relish-ink-muted">
                Sign in to continue documenting culinary memory, or create a secure account to start uploading your own workshop photos.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-relish-linen bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.3em] text-relish-smoke">
                Preserved recipes • Protected memories
              </div>
            </div>
            <div className="bg-white/95 border border-relish-linen rounded-[28px] shadow-relish-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => switchAuthMode('login')}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    authMode === 'login'
                      ? 'bg-relish-ink text-white'
                      : 'border border-relish-linen text-relish-ink hover:bg-relish-paper'
                  }`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => switchAuthMode('signup')}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    authMode === 'signup'
                      ? 'bg-relish-ink text-white'
                      : 'border border-relish-linen text-relish-ink hover:bg-relish-paper'
                  }`}
                >
                  Sign up
                </button>
              </div>
              {authError && (
                <div className="mb-4 px-4 py-3 bg-relish-paper border border-relish-accent text-relish-ink rounded-2xl">
                  {authError}
                </div>
              )}
              {authInfo && (
                <div className="mb-4 px-4 py-3 bg-white/80 border border-relish-linen text-relish-ink rounded-2xl">
                  {authInfo}
                </div>
              )}
              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-email">
                      Email
                    </label>
                    <input
                      id="auth-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={authForm.email}
                      onChange={handleAuthChange}
                      placeholder="name@email.com"
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-password">
                      Password
                    </label>
                    <input
                      id="auth-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={authForm.password}
                      onChange={handleAuthChange}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full px-5 py-3 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authLoading ? 'Signing in…' : 'Log in'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchAuthMode('forgot')}
                    className="w-full text-sm text-relish-ink-muted hover:text-relish-ink"
                  >
                    Forgot your password?
                  </button>
                </form>
              ) : authMode === 'signup' ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-name">
                      Full name
                    </label>
                    <input
                      id="auth-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={authForm.name}
                      onChange={handleAuthChange}
                      placeholder="Your name"
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-signup-email">
                      Email
                    </label>
                    <input
                      id="auth-signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={authForm.email}
                      onChange={handleAuthChange}
                      placeholder="name@email.com"
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-role">
                      Account role
                    </label>
                    <select
                      id="auth-role"
                      name="role"
                      value={authForm.role}
                      onChange={handleAuthChange}
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                    >
                      <option value="participant">Participant</option>
                      <option value="facilitator">Facilitator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-signup-password">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="auth-signup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={authForm.password}
                        onChange={handleAuthChange}
                        placeholder="Create a strong password"
                        className={`w-full px-4 py-3 border rounded-2xl bg-white/90 text-relish-ink focus:outline-none ${
                          signupPasswordError
                            ? 'border-relish-accent focus:border-relish-accent'
                            : 'border-relish-linen focus:border-relish-ink'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-relish-ink-muted hover:text-relish-ink"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-relish-ink-muted">
                      Minimum 8 characters, with uppercase, lowercase, number, and symbol.
                    </p>
                    {signupPasswordError && (
                      <p className="mt-2 text-xs text-relish-accent">{signupPasswordError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-confirm-password">
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="auth-confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={authForm.confirmPassword}
                        onChange={handleAuthChange}
                        placeholder="Re-enter your password"
                        className={`w-full px-4 py-3 border rounded-2xl bg-white/90 text-relish-ink focus:outline-none ${
                          signupConfirmError
                            ? 'border-relish-accent focus:border-relish-accent'
                            : 'border-relish-linen focus:border-relish-ink'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-relish-ink-muted hover:text-relish-ink"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    {signupConfirmError && (
                      <p className="mt-2 text-xs text-relish-accent">{signupConfirmError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading || Boolean(signupPasswordError) || Boolean(signupConfirmError)}
                    className="w-full px-5 py-3 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authLoading ? 'Creating account…' : 'Create account'}
                  </button>
                </form>
              ) : authMode === 'forgot' ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-forgot-email">
                      Email
                    </label>
                    <input
                      id="auth-forgot-email"
                      name="resetEmail"
                      type="email"
                      autoComplete="email"
                      value={authForm.resetEmail}
                      onChange={handleAuthChange}
                      placeholder="name@email.com"
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full px-5 py-3 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authLoading ? 'Sending…' : 'Send reset instructions'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchAuthMode('reset')}
                    className="w-full text-sm text-relish-ink-muted hover:text-relish-ink"
                  >
                    I already have a reset code
                  </button>
                  <button
                    type="button"
                    onClick={() => switchAuthMode('login')}
                    className="w-full text-sm text-relish-ink-muted hover:text-relish-ink"
                  >
                    Back to log in
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-reset-email">
                      Email
                    </label>
                    <input
                      id="auth-reset-email"
                      name="resetEmail"
                      type="email"
                      autoComplete="email"
                      value={authForm.resetEmail}
                      onChange={handleAuthChange}
                      placeholder="name@email.com"
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-reset-token">
                      Reset code
                    </label>
                    <input
                      id="auth-reset-token"
                      name="resetToken"
                      type="text"
                      autoComplete="one-time-code"
                      value={authForm.resetToken}
                      onChange={handleAuthChange}
                      placeholder="Enter reset code"
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-new-password">
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="auth-new-password"
                        name="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={authForm.newPassword}
                        onChange={handleAuthChange}
                        placeholder="Create a strong password"
                        className={`w-full px-4 py-3 border rounded-2xl bg-white/90 text-relish-ink focus:outline-none ${
                          resetPasswordError
                            ? 'border-relish-accent focus:border-relish-accent'
                            : 'border-relish-linen focus:border-relish-ink'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-relish-ink-muted hover:text-relish-ink"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    {resetPasswordError && (
                      <p className="mt-2 text-xs text-relish-accent">{resetPasswordError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="auth-confirm-new-password">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <input
                        id="auth-confirm-new-password"
                        name="confirmNewPassword"
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={authForm.confirmNewPassword}
                        onChange={handleAuthChange}
                        placeholder="Re-enter your password"
                        className={`w-full px-4 py-3 border rounded-2xl bg-white/90 text-relish-ink focus:outline-none ${
                          resetConfirmError
                            ? 'border-relish-accent focus:border-relish-accent'
                            : 'border-relish-linen focus:border-relish-ink'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-relish-ink-muted hover:text-relish-ink"
                        aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    {resetConfirmError && (
                      <p className="mt-2 text-xs text-relish-accent">{resetConfirmError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading || Boolean(resetPasswordError) || Boolean(resetConfirmError)}
                    className="w-full px-5 py-3 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authLoading ? 'Updating…' : 'Reset password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchAuthMode('login')}
                    className="w-full text-sm text-relish-ink-muted hover:text-relish-ink"
                  >
                    Back to log in
                  </button>
                </form>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
      <div
        className={`main-app-shell transition-opacity duration-500 ${
          isAppVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isAppVisible}
      >
      {/* Background cover image */}
      <img
        src={coverImg}
        alt=""
        aria-hidden="true"
        className="absolute top-[105px] right-0 w-[54%] max-w-[731px] h-auto opacity-100 pointer-events-none z-0"
      />
      {/* Background img2 */}
      <img
        src={img2}
        alt=""
        aria-hidden="true"
        className="absolute bottom-[20vh] left-0 w-[34vw] max-w-[423px] min-w-[203px] h-auto opacity-75 pointer-events-none z-0"
      />
      {/* Header */}
      <div className="bg-white/90 backdrop-blur border-b border-relish-linen">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-relish-smoke font-semibold">Relish methodology</p>
              <h1 className="text-4xl font-display text-relish-ink mt-2">Food Memories Workshop</h1>
              <p className="text-sm text-relish-ink-muted">Interactive field guide for facilitators</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowPhotoManager(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors"
              >
                <Images size={18} />
                Photos ({photoCountForButton})
              </button>
              {(isFacilitator || isAdmin) && (
                <button
                  onClick={() => {
                    resetParticipantForm();
                    setShowParticipants(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-relish-warm bg-white text-relish-ink shadow-sm hover:bg-relish-paper transition-colors"
                >
                  <UserPlus size={18} />
                  Participants ({participantCountForButton})
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowWorkshops(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-relish-warm bg-white text-relish-ink shadow-sm hover:bg-relish-paper transition-colors"
                >
                  <UserPlus size={18} />
                  Workshops ({workshops.length})
                </button>
              )}
              <button
                onClick={() => setShowTimerSettings(!showTimerSettings)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm transition-colors ${
                  timerActive
                    ? 'bg-relish-ink text-white border-relish-ink'
                    : 'bg-white text-relish-ink border-relish-linen hover:bg-relish-paper'
                }`}
              >
                <Timer size={18} />
                Timer
              </button>
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-relish-warm bg-white text-relish-ink shadow-sm hover:bg-relish-paper transition-colors"
              >
                <FileText size={18} />
                Notes
              </button>
              <button
                onClick={() => setShowChecklist(!showChecklist)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-relish-warm bg-white text-relish-ink shadow-sm hover:bg-relish-paper transition-colors"
              >
                <CheckCircle size={18} />
                Checklist
              </button>
              {authUser && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-2 rounded-full border border-relish-linen bg-white text-relish-ink shadow-sm">
                  {isAdmin ? (
                    <span className="text-sm font-semibold">Workshop Admin</span>
                  ) : (
                    <>
                      <span className="text-xs uppercase tracking-[0.25em] text-relish-smoke">{authUser.role}</span>
                      <span className="text-sm font-semibold">{authUser.name}</span>
                    </>
                  )}
                  {isFacilitator && activeWorkshop && (
                    <span className="ml-1 px-3 py-1 rounded-full bg-relish-paper text-relish-ink text-xs uppercase tracking-[0.2em]">
                      Active workshop: {activeWorkshop.name}
                    </span>
                  )}
                  {isFacilitator && workshops.length > 1 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowWorkshopSwitcher((prev) => !prev)}
                        className="px-3 py-1 rounded-full border border-relish-ink text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-ink hover:text-white transition-colors"
                      >
                        Change
                      </button>
                      {showWorkshopSwitcher && (
                        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-relish-linen bg-white shadow-relish-card p-2 z-50">
                          <select
                            value={activeWorkshopId || ''}
                            onChange={(event) => {
                              setActiveWorkshopId(event.target.value);
                              setShowWorkshopSwitcher(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-relish-linen bg-white text-relish-ink text-xs uppercase tracking-[0.2em] focus:border-relish-ink focus:outline-none"
                          >
                            {workshops.map((workshop) => (
                              <option key={workshop._id || workshop.id} value={workshop._id || workshop.id}>
                                {workshop.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    disabled={authLoading}
                    className="ml-2 px-3 py-1 rounded-full border border-relish-ink text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-ink hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="relative mb-10 overflow-hidden rounded-[32px] border border-relish-linen bg-white/80 shadow-relish-card">
            <div className="absolute inset-0 opacity-60 mix-blend-multiply pointer-events-none">
              <img src={relishLineArt} alt="" aria-hidden="true" className="h-full w-full object-cover" />
            </div>
            <div className="relative grid gap-6 p-8 md:grid-cols-[2.2fr,1fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-relish-smoke font-semibold">Memory, method, material</p>
                <h2 className="text-3xl md:text-4xl font-display text-relish-ink mt-3 mb-4">
                  Guide intimate food narratives with academic care
                </h2>
                <p className="text-base text-relish-ink-muted max-w-2xl">
                  This facilitator console mirrors the RELISH manual’s serif typography, coral accents, and archival tactility. Track phases,
                  cue timers, organize participants, and document culinary heritage within a single scholarly surface.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm text-relish-ink">
                  <span className="px-3 py-1 rounded-full border border-relish-linen bg-white/80">Narrative practice</span>
                  <span className="px-3 py-1 rounded-full border border-relish-linen bg-white/80">Speculative recipes</span>
                  <span className="px-3 py-1 rounded-full border border-relish-linen bg-white/80">Embodied archives</span>
                </div>
              </div>
              <div className="rounded-3xl border border-relish-warm bg-white/90 p-6 shadow-inner">
                <p className="text-xs uppercase tracking-[0.25em] text-relish-smoke">Current focus</p>
                <div className="mt-3 text-2xl font-display text-relish-ink">{currentDayData.title}</div>
                <p className="text-sm text-relish-ink-muted">{currentDayData.subtitle}</p>
                <div className="mt-4 space-y-2 text-sm text-relish-ink">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{module.duration} • {module.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>Day {currentDay} · Phase {currentPhase + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{phase.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Timer Display - Fixed position when active */}
        {timeRemaining !== null && (
          <div className="fixed top-24 right-6 z-40 min-w-[280px] rounded-2xl border border-relish-linen bg-white/95 p-6 shadow-relish-card">
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.4em] text-relish-smoke mb-3">
                {timerMode === 'countdown' ? 'Time Remaining' : 'Elapsed Time'}
              </div>
              <div className={`text-5xl font-display mb-4 ${getTimerColor()} transition-colors`}>
                {formatTime(timeRemaining)}
              </div>
              <div className="flex gap-2 justify-center text-sm">
                {timerActive ? (
                  <button
                    onClick={pauseTimer}
                    className="flex items-center gap-2 rounded-full border border-relish-ink px-4 py-2 text-relish-ink hover:bg-relish-ink hover:text-white transition-colors"
                  >
                    <Pause size={16} />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={() => setTimerActive(true)}
                    className="flex items-center gap-2 rounded-full bg-relish-accent px-4 py-2 text-white shadow-sm hover:bg-relish-accent-dark transition-colors"
                  >
                    <Play size={16} />
                    Resume
                  </button>
                )}
                <button
                  onClick={resetTimer}
                  className="flex items-center gap-2 rounded-full border border-relish-linen px-4 py-2 text-relish-ink hover:bg-relish-paper transition-colors"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              </div>
              {timerMode === 'countdown' && timeRemaining < 60 && timeRemaining > 0 && (
                <div className="mt-3 text-relish-accent font-semibold tracking-wide">
                  ⚠️ Less than 1 minute remaining
                </div>
              )}
              {timerMode === 'countdown' && timeRemaining === 0 && (
                <div className="mt-3 text-relish-accent font-semibold">
                  ⏰ Time's up
                </div>
              )}
            </div>
          </div>
        )}

        {/* Day Selector */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => { setCurrentDay(1); setCurrentPhase(0); setCurrentModule(0); }}
            className={`flex-1 rounded-2xl border px-6 py-6 transition-all ${
              currentDay === 1
                ? 'bg-white shadow-relish-card border-relish-ink'
                : 'bg-transparent border-relish-linen hover:bg-white/70'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl font-display text-relish-ink mb-1">Day 1</div>
              <div className="text-sm text-relish-ink-muted">Mapping & Writing</div>
              <div className="text-xs uppercase tracking-[0.3em] text-relish-smoke mt-3">Narrative session</div>
            </div>
          </button>
          <button
            onClick={() => { setCurrentDay(2); setCurrentPhase(0); setCurrentModule(0); }}
            className={`flex-1 rounded-2xl border px-6 py-6 transition-all ${
              currentDay === 2
                ? 'bg-white shadow-relish-card border-relish-ink'
                : 'bg-transparent border-relish-linen hover:bg-white/70'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl font-display text-relish-ink mb-1">Day 2</div>
              <div className="text-sm text-relish-ink-muted">Cooking & Sharing</div>
              <div className="text-xs uppercase tracking-[0.3em] text-relish-smoke mt-3">Cooking session</div>
            </div>
          </button>
        </div>

        {/* Phase Navigation */}
        <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-3">
          {currentDayData.phases.map((p, idx) => {
            const PIcon = p.icon;
            return (
              <button
                key={idx}
                onClick={() => { setCurrentPhase(idx); setCurrentModule(0); }}
                className={`rounded-2xl border px-5 py-5 text-left transition-all ${
                  currentPhase === idx
                    ? 'bg-white shadow-relish-card border-relish-ink'
                    : 'bg-transparent border-relish-linen hover:bg-white/70'
                }`}
              >
                <div className="mb-4 flex justify-start">
                  <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-relish-linen bg-white/70">
                    <img
                      src={relishLineArt}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-multiply"
                    />
                    <PIcon size={22} className="relative text-relish-ink" />
                  </span>
                </div>
                <div className="text-sm font-semibold text-relish-ink">{p.name}</div>
                <p className="mt-1 text-xs uppercase tracking-[0.3em] text-relish-smoke">Phase {idx + 1}</p>
              </button>
            );
          })}
        </div>

        {/* Main Module Card */}
        <div className="bg-white/95 rounded-[28px] shadow-relish-card border border-relish-linen overflow-hidden mb-8">
          {/* Module Header */}
          <div className={`${phase.color} border-b p-6`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-relish-linen bg-white/70">
                  <img
                    src={relishLineArt}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-multiply"
                  />
                  <PhaseIcon size={28} className="relative text-relish-ink" />
                </span>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-relish-smoke mb-2">
                    Phase {currentPhase + 1} • Module {currentModule + 1}
                  </div>
                  <h2 className="text-3xl font-display text-relish-ink">{module.title}</h2>
                </div>
              </div>
              <button
                onClick={() => toggleModuleComplete(module.id)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
                  completedModules.has(module.id)
                    ? 'border-relish-ink bg-relish-ink text-white shadow-sm'
                    : 'border-relish-ink text-relish-ink hover:bg-relish-ink hover:text-white'
                }`}
              >
                <CheckCircle size={20} className={completedModules.has(module.id) ? 'text-green-400' : ''} />
                {completedModules.has(module.id) ? 'Marked Complete' : 'Mark Complete'}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-relish-ink">
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span className="font-semibold">{module.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>Small groups recommended</span>
              </div>
              {!timerActive && timeRemaining === null && (
                <button
                  onClick={() => startTimer()}
                  className="ml-auto flex items-center gap-2 rounded-full bg-relish-accent px-4 py-2 text-white shadow-sm text-sm font-semibold hover:bg-relish-accent-dark"
                >
                  <Play size={16} />
                  Start Timer ({module.duration})
                </button>
              )}
            </div>
          </div>

          {/* Module Content */}
          <div className="p-6">
            {/* Purpose */}
            <div className="bg-relish-paper border-l-4 border-relish-accent/70 p-4 rounded-2xl mb-6">
              <div className="font-semibold text-relish-ink mb-2 flex items-center gap-2">
                <Lightbulb size={18} />
                Purpose
              </div>
              <p className="text-relish-ink-muted">{module.purpose}</p>
            </div>

            {/* Steps */}
            <div className="mb-6">
              <h3 className="font-display text-2xl text-relish-ink mb-4">Steps to Follow</h3>
              <div className="space-y-3">
                {module.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-relish-accent text-white rounded-full flex items-center justify-center font-semibold">
                      {idx + 1}
                    </div>
                    <p className="text-relish-ink-muted pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials */}
            <div className="mb-6">
              <h3 className="font-display text-2xl text-relish-ink mb-3 flex items-center gap-2">
                <BookOpen size={20} />
                Materials Needed
              </h3>
              <div className="flex flex-wrap gap-2">
                {module.materials.map((material, idx) => (
                  <span key={idx} className="px-3 py-1 bg-relish-paper text-relish-ink rounded-full text-sm border border-relish-linen">
                    {material}
                  </span>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-relish-paper border border-relish-linen p-4 rounded-2xl">
              <div className="font-semibold text-relish-ink mb-2">💡 Facilitation Tips</div>
              <ul className="space-y-1">
                {module.tips.map((tip, idx) => (
                  <li key={idx} className="text-relish-ink-muted text-sm">• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            onClick={prevModule}
            disabled={currentDay === 1 && currentPhase === 0 && currentModule === 0}
            className="flex items-center gap-2 rounded-full border border-relish-linen px-6 py-3 text-relish-ink hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          <div className="text-center text-sm text-relish-ink-muted">
            <div className="font-semibold text-relish-ink">
              Day {currentDay} • Phase {currentPhase + 1} of {currentDayData.phases.length} • Module {currentModule + 1} of {phase.modules.length}
            </div>
            <div className="text-xs mt-1">
              {completedModules.size} modules completed
            </div>
          </div>

          <button
            onClick={nextModule}
            disabled={currentDay === 2 && currentPhase === currentDayData.phases.length - 1 && currentModule === phase.modules.length - 1}
            className="flex items-center gap-2 rounded-full bg-relish-accent px-6 py-3 text-white shadow-sm hover:bg-relish-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
        </div>

      {/* Timer Settings Modal */}
      {showTimerSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 rounded-3xl shadow-relish-card max-w-md w-full border border-relish-linen">
            <div className="p-6 border-b border-relish-linen">
              <h3 className="text-2xl font-display text-relish-ink">Timer Settings</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold mb-3 text-relish-ink">Quick Start</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => startTimer()}
                    className="w-full px-4 py-3 bg-relish-accent text-white rounded-2xl hover:bg-relish-accent-dark transition-colors text-left font-semibold"
                  >
                    ⏱️ Countdown Timer ({module.duration})
                  </button>
                  <button
                    onClick={startStopwatch}
                    className="w-full px-4 py-3 rounded-2xl border border-relish-ink text-left text-relish-ink hover:bg-relish-ink hover:text-white transition-colors font-semibold"
                  >
                    ⏰ Stopwatch (Count Up)
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-relish-ink">Custom Countdown</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    placeholder="Minutes"
                    min="1"
                    max="240"
                    className="flex-1 px-4 py-2 border border-relish-linen rounded-2xl focus:border-relish-ink focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const mins = parseInt(customTime);
                      if (mins > 0) {
                        startTimer(mins);
                        setCustomTime('');
                      }
                    }}
                    disabled={!customTime || parseInt(customTime) <= 0}
                    className="px-4 py-2 rounded-2xl bg-relish-ink text-white hover:bg-relish-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 text-relish-ink">Preset Durations</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {[5, 10, 15, 20, 30, 45, 60, 90, 120].map(mins => (
                    <button
                      key={mins}
                      onClick={() => startTimer(mins)}
                      className="px-3 py-2 rounded-2xl border border-relish-linen bg-white/80 text-relish-ink hover:bg-relish-paper transition-colors font-medium"
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-relish-linen flex justify-end">
              <button
                onClick={() => setShowTimerSettings(false)}
                className="px-6 py-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Manager Modal */}
      {showPhotoManager && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white/95 rounded-[32px] shadow-relish-card max-w-6xl w-full max-h-[90vh] flex flex-col border border-relish-linen overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply">
              <img src={relishLineArt} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-relish-paper" />
            </div>
            <div className="relative p-6 border-b border-relish-linen flex items-center justify-between bg-white/80">
              <div>
                <h3 className="text-2xl font-display text-relish-ink">Workshop Photo Library</h3>
                <p className="text-sm text-relish-ink-muted">Document memory maps, cooking sessions, and collaborative moments.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openCameraCapture}
                  disabled={photoUploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-relish-accent text-white hover:bg-relish-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera size={18} />
                  Live Capture
                </button>
                <button
                  onClick={openPhotoUploader}
                  disabled={photoUploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-relish-linen bg-white text-relish-ink hover:bg-relish-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={18} />
                  {photoUploading ? 'Uploading...' : 'Upload Photos'}
                </button>
                <button
                  onClick={closePhotoManager}
                  className="flex items-center gap-2 px-3 py-2 rounded-full border border-relish-linen bg-white text-relish-ink hover:bg-relish-paper"
                >
                  <X size={18} />
                  Close
                </button>
              </div>
            </div>
            <div className="relative p-6 flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="text-sm text-relish-ink font-semibold">
                  {visiblePhotos.length} photo{visiblePhotos.length === 1 ? '' : 's'} stored
                </div>
                <div className="text-xs text-relish-ink-muted">
                  Accepts JPG, PNG, WebP, HEIC • Max {Math.round(PHOTO_MAX_SIZE_BYTES / (1024 * 1024))}MB per image
                  {photoUploading && <span className="ml-2 text-relish-accent font-semibold">Uploading...</span>}
                </div>
              </div>
              {photosError && (
                <div className="px-4 py-3 bg-relish-paper border border-relish-accent text-relish-ink rounded-2xl">
                  {photosError}
                </div>
              )}
              <div className="flex-1 overflow-auto">
                {isAdmin && (
                  <div className="mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-display text-relish-ink">Workshops</h4>
                        <p className="text-sm text-relish-ink-muted">Select a workshop to view its archive.</p>
                      </div>
                    </div>
                    {workshopsLoading && workshops.length === 0 ? (
                      <div className="px-4 py-3 bg-white/70 border border-dashed border-relish-linen text-relish-ink rounded-2xl">
                        Loading workshops...
                      </div>
                    ) : workshops.length === 0 ? (
                      <div className="bg-white/80 border border-dashed border-relish-linen rounded-2xl p-8 text-center text-relish-ink shadow-inner">
                        <p className="text-sm">No workshops available yet.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {workshops.map((workshop) => {
                          const workshopId = workshop._id || workshop.id;
                          const isActive = String(activeWorkshopId || '') === String(workshopId || '');
                          const facilitatorName = workshop.facilitatorId?.name || 'Facilitator';
                          return (
                            <button
                              key={workshopId}
                              type="button"
                              onClick={() => setActiveWorkshopId(isActive ? null : workshopId)}
                              className={`bg-white/90 border rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left p-4 ${
                                isActive ? 'border-relish-ink' : 'border-relish-linen'
                              }`}
                            >
                              <p className="text-xs uppercase tracking-[0.3em] text-relish-smoke">Workshop</p>
                              <div className="flex items-start justify-between gap-3 mt-2">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="text-lg font-display text-relish-ink">{workshop.name}</h5>
                                    {workshop.archivedAt && (
                                      <span className="px-2.5 py-1 rounded-full bg-relish-paper text-relish-ink text-[10px] uppercase tracking-[0.2em]">
                                        Archived
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-relish-ink-muted">{facilitatorName}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteWorkshop(workshop);
                                  }}
                                  className="px-3 py-1 rounded-full border border-relish-accent text-relish-accent text-xs hover:bg-relish-accent hover:text-white"
                                >
                                  Delete
                                </button>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {photosLoading && visiblePhotos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-relish-ink border-2 border-dashed border-relish-linen rounded-2xl p-10">
                    <Images size={48} className="mb-4 animate-pulse" />
                    <p className="text-lg font-semibold">Loading photos...</p>
                    <p className="text-sm mt-2 text-relish-ink-muted">Fetching your workshop gallery from the server.</p>
                  </div>
                ) : visiblePhotos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-relish-ink border-2 border-dashed border-relish-linen rounded-2xl p-10">
                    <Images size={48} className="mb-4" />
                    <p className="text-lg font-semibold">No photos yet</p>
                    <p className="text-sm mt-2 text-relish-ink-muted">Capture memory maps, cooking sessions, and group moments to build a visual archive.</p>
                    {!isAdmin && (
                      <button
                        onClick={openPhotoUploader}
                        className="mt-6 flex items-center gap-2 px-5 py-2 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark"
                      >
                        <Camera size={18} />
                        Add your first photo
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {isAdmin && activeWorkshopId && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xl font-display text-relish-ink">Workshop photos</h4>
                          <button
                            onClick={() => setActiveWorkshopId(null)}
                            className="text-sm text-relish-ink-muted hover:text-relish-ink"
                          >
                            Clear selection
                          </button>
                        </div>
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                          {workshopScopedPhotos.map((photo, index) => (
                            <button
                              key={getPhotoId(photo) || index}
                              type="button"
                              onClick={() => openPhotoPreview(index)}
                              className="bg-white/90 border border-relish-linen rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left"
                            >
                              <div className="relative aspect-video overflow-hidden rounded-t-xl">
                                <img
                                  src={buildPhotoUrl(photo)}
                                  alt={photo.caption || photo.originalName || 'Workshop photo'}
                                  className="h-full w-full object-cover"
                                />
                                <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                  <Maximize2 size={14} /> View
                                </span>
                              </div>
                              <div className="p-4 space-y-1">
                                <div className="font-semibold text-sm text-relish-ink truncate">{photo.caption || photo.originalName || 'Workshop photo'}</div>
                                <div className="text-xs text-relish-ink-muted">{formatPhotoTimestamp(photo.createdAt)}</div>
                                <div className="text-xs text-relish-ink-muted">{describePhotoContext(photo)}</div>
                                {photo.uploadedBy && (
                                  <div className="text-xs text-relish-ink">{getUploaderLabel(photo)}</div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isAdmin && !activeWorkshopId && adminUnassignedPhotos.length > 0 && (
                      <div>
                        <h4 className="text-xl font-display text-relish-ink mb-4">Other uploads</h4>
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                          {adminUnassignedPhotos.map((photo, index) => (
                            <button
                              key={getPhotoId(photo) || index}
                              type="button"
                              onClick={() => openPhotoPreview(index)}
                              className="bg-white/90 border border-relish-linen rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left"
                            >
                              <div className="relative aspect-video overflow-hidden rounded-t-xl">
                                <img
                                  src={buildPhotoUrl(photo)}
                                  alt={photo.caption || photo.originalName || 'Workshop photo'}
                                  className="h-full w-full object-cover"
                                />
                                <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                  <Maximize2 size={14} /> View
                                </span>
                              </div>
                              <div className="p-4 space-y-1">
                                <div className="font-semibold text-sm text-relish-ink truncate">{photo.caption || photo.originalName || 'Workshop photo'}</div>
                                <div className="text-xs text-relish-ink-muted">{formatPhotoTimestamp(photo.createdAt)}</div>
                                <div className="text-xs text-relish-ink-muted">{describePhotoContext(photo)}</div>
                                {photo.uploadedBy && (
                                  <div className="text-xs text-relish-ink">{getUploaderLabel(photo)}</div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isAdmin && (
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {visiblePhotos.map((photo, index) => (
                          <button
                            key={getPhotoId(photo) || index}
                            type="button"
                            onClick={() => openPhotoPreview(index)}
                            className="bg-white/90 border border-relish-linen rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left"
                          >
                            <div className="relative aspect-video overflow-hidden rounded-t-xl">
                              <img
                                src={buildPhotoUrl(photo)}
                                alt={photo.caption || photo.originalName || 'Workshop photo'}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <Maximize2 size={14} /> View
                              </span>
                            </div>
                            <div className="p-4 space-y-1">
                              <div className="font-semibold text-sm text-relish-ink truncate">{photo.caption || photo.originalName || 'Workshop photo'}</div>
                              <div className="text-xs text-relish-ink-muted">{formatPhotoTimestamp(photo.createdAt)}</div>
                              <div className="text-xs text-relish-ink-muted">{describePhotoContext(photo)}</div>
                              {photo.uploadedBy && (
                                <div className="text-xs text-relish-ink">{getUploaderLabel(photo)}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoUploadChange}
              className="hidden"
            />
          </div>
        </div>
      )}

      {showWorkshops && (isAdmin || isFacilitator) && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white/95 rounded-[32px] shadow-relish-card max-w-5xl w-full max-h-[85vh] flex flex-col border border-relish-linen overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply">
              <img src={relishLineArt} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-relish-paper" />
            </div>
            <div className="relative p-6 border-b border-relish-linen flex items-center justify-between bg-white/80 backdrop-blur">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-relish-smoke font-semibold">Workshop directory</p>
                <h3 className="text-3xl font-display text-relish-ink">Workshops</h3>
                <p className="text-sm text-relish-ink-muted">Browse workshops and open participant archives.</p>
              </div>
              <button
                onClick={() => setShowWorkshops(false)}
                className="p-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                aria-label="Close workshops"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative p-6 space-y-4 overflow-y-auto">
              {(isAdmin || isFacilitator) && (
                <form onSubmit={handleCreateWorkshop} className="bg-white/85 border border-relish-linen rounded-[28px] p-5 space-y-4 shadow-inner">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="workshop-name">
                      Workshop name
                    </label>
                    <input
                      id="workshop-name"
                      name="name"
                      value={workshopForm.name}
                      onChange={handleWorkshopFormChange}
                      placeholder="e.g. Coastal Memories"
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      required
                    />
                  </div>
                  {isAdmin && (
                    <div>
                      <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="workshop-facilitator">
                        Facilitator
                      </label>
                      <select
                        id="workshop-facilitator"
                        name="facilitatorId"
                        value={workshopForm.facilitatorId}
                        onChange={handleWorkshopFormChange}
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      >
                        <option value="">Select facilitator</option>
                        {facilitators.map((facilitator) => (
                          <option key={facilitator._id || facilitator.id} value={facilitator._id || facilitator.id}>
                            {facilitator.name || facilitator.email}
                          </option>
                        ))}
                      </select>
                      {facilitatorsLoading && (
                        <p className="mt-2 text-xs text-relish-ink-muted">Loading facilitators...</p>
                      )}
                      {facilitatorsError && (
                        <p className="mt-2 text-xs text-relish-accent">{facilitatorsError}</p>
                      )}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark"
                  >
                    Create workshop
                  </button>
                </form>
              )}
              {workshopsError && (
                <div className="px-4 py-3 bg-relish-paper border border-relish-accent text-relish-ink rounded-2xl">
                  {workshopsError}
                </div>
              )}
              {workshopsLoading && workshops.length === 0 && (
                <div className="px-4 py-3 bg-white/70 border border-dashed border-relish-linen text-relish-ink rounded-2xl">
                  Loading workshops...
                </div>
              )}
              {workshops.length === 0 ? (
                <div className="bg-white/80 border border-dashed border-relish-linen rounded-2xl p-10 text-center text-relish-ink shadow-inner">
                  <p className="text-lg font-semibold">No workshops yet.</p>
                  <p className="text-sm mt-2 text-relish-ink-muted">Workshops appear here once facilitators log in.</p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-2">
                    {workshops.map((workshop) => {
                    const workshopId = workshop._id || workshop.id;
                    const facilitatorName = workshop.facilitatorId?.name || 'Facilitator';
                    const participantTotal = getWorkshopParticipantCount(workshopId);
                    const photoTotal = getWorkshopPhotoCount(workshopId);
                      const isEditing = assigningWorkshopEditId === workshopId;
                    return (
                      <div
                        key={workshopId}
                        className="bg-white/90 border border-relish-linen rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.3em] text-relish-smoke">Workshop</p>
                              {isEditing ? (
                                <input
                                  value={workshopEditNameAdmin}
                                  onChange={(event) => setWorkshopEditNameAdmin(event.target.value)}
                                  className="mt-2 w-full px-3 py-2 border border-relish-linen rounded-2xl bg-white text-relish-ink focus:border-relish-ink focus:outline-none"
                                />
                              ) : (
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <h4 className="text-2xl font-display text-relish-ink break-words">{workshop.name}</h4>
                                  {workshop.archivedAt && (
                                    <span className="px-2.5 py-1 rounded-full bg-relish-paper text-relish-ink text-xs uppercase tracking-[0.2em]">
                                      Archived
                                    </span>
                                  )}
                                </div>
                              )}
                              <p className="text-sm text-relish-ink-muted mt-1">
                                {workshop.facilitatorId ? facilitatorName : 'Unassigned'}
                              </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isEditing && (
                              <button
                                onClick={() => beginWorkshopNameEdit(workshop)}
                                className="p-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                                title="Edit workshop name"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteWorkshop(workshop)}
                              className="px-3 py-1 rounded-full border border-relish-accent text-relish-accent text-xs hover:bg-relish-accent hover:text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                          {isEditing && (
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={() => handleSaveWorkshopNameAdmin(workshop)}
                                disabled={workshopSaving || !workshopEditNameAdmin.trim()}
                                className="px-3 py-1 rounded-full border border-relish-ink text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-ink hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {workshopSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={cancelWorkshopNameAdmin}
                                className="px-3 py-1 rounded-full border border-relish-linen text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-paper"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          {!workshop.facilitatorId && (
                            <div className="mt-4 space-y-2">
                              <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke">Assign facilitator</label>
                              <select
                                onChange={(event) => handleAssignWorkshopFacilitator(workshop, event.target.value)}
                                defaultValue=""
                                className="w-full px-4 py-2 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                              >
                                <option value="">Select facilitator</option>
                                {facilitators.map((facilitator) => (
                                  <option key={facilitator._id || facilitator.id} value={facilitator._id || facilitator.id}>
                                    {facilitator.name || facilitator.email}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        <button
                          type="button"
                          onClick={() => openWorkshopDetail(workshopId)}
                          className="mt-4 w-full text-left"
                        >
                          <div className="flex flex-wrap gap-2 text-xs text-relish-ink">
                            <span className="px-3 py-1 rounded-full border border-relish-linen bg-white/80">
                              {participantTotal} participant{participantTotal === 1 ? '' : 's'}
                            </span>
                            <span className="px-3 py-1 rounded-full border border-relish-linen bg-white/80">
                              {photoTotal} photo{photoTotal === 1 ? '' : 's'}
                            </span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showWorkshopDetail && activeWorkshop && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white/95 rounded-[32px] shadow-relish-card max-w-6xl w-full max-h-[90vh] flex flex-col border border-relish-linen overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply">
              <img src={relishLineArt} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-relish-paper" />
            </div>
            <div className="relative p-6 border-b border-relish-linen flex items-center justify-between bg-white/80 backdrop-blur">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-relish-smoke font-semibold">Workshop archive</p>
                <h3 className="text-3xl font-display text-relish-ink">{activeWorkshop.name}</h3>
                <p className="text-sm text-relish-ink-muted">
                  {activeWorkshop.facilitatorId?.name || 'Facilitator'}
                </p>
              </div>
              <button
                onClick={closeWorkshopDetail}
                className="p-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                aria-label="Close workshop"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative p-6 space-y-8 overflow-y-auto">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-display text-relish-ink">Participants</h4>
                    <p className="text-sm text-relish-ink-muted">Add or manage participants linked to this workshop.</p>
                  </div>
                  <div className="text-sm text-relish-ink font-semibold">
                    {visibleParticipants.length} linked
                  </div>
                </div>
                {participantsError && (
                  <div className="px-4 py-3 bg-relish-paper border border-relish-accent text-relish-ink rounded-2xl">
                    {participantsError}
                  </div>
                )}
                <form onSubmit={handleParticipantSubmit} className="bg-white/85 border border-relish-linen rounded-[28px] p-6 space-y-4 shadow-inner">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-name-workshop">
                        Name <span className="text-relish-accent">*</span>
                      </label>
                      <input
                        id="participant-name-workshop"
                        name="name"
                        value={participantForm.name}
                        onChange={handleParticipantChange}
                        required
                        placeholder="Participant full name"
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-email-workshop">
                        Email
                      </label>
                      <input
                        id="participant-email-workshop"
                        name="email"
                        type="email"
                        value={participantForm.email}
                        onChange={handleParticipantChange}
                        disabled={Boolean(editingParticipantId && editingParticipantUserId)}
                        placeholder="example@email.com"
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      {editingParticipantId && editingParticipantUserId && (
                        <p className="mt-2 text-xs text-relish-ink-muted">Email is locked to the participant account.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-dietary-workshop">
                        Dietary needs
                      </label>
                      <input
                        id="participant-dietary-workshop"
                        name="dietary"
                        value={participantForm.dietary}
                        onChange={handleParticipantChange}
                        placeholder="Vegetarian, allergies, etc."
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-cultural-workshop">
                        Cultural background
                      </label>
                      <input
                        id="participant-cultural-workshop"
                        name="cultural"
                        value={participantForm.cultural}
                        onChange={handleParticipantChange}
                        placeholder="Region, heritage, influences"
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-notes-workshop">
                      Notes
                    </label>
                    <textarea
                      id="participant-notes-workshop"
                      name="notes"
                      value={participantForm.notes}
                      onChange={handleParticipantChange}
                      placeholder="Observations, accessibility needs, preferred pronouns, etc."
                      rows={3}
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors"
                    >
                      {editingParticipantId ? 'Update Participant' : 'Add Participant'}
                    </button>
                    {editingParticipantId && (
                      <button
                        type="button"
                        onClick={resetParticipantForm}
                        className="px-5 py-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {unassignedParticipants.length > 0 && (
                  <div className="bg-white/80 border border-dashed border-relish-linen rounded-2xl p-6">
                    <p className="text-sm font-semibold text-relish-ink mb-3">Unassigned participants</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      {unassignedParticipants.map((participant, index) => (
                        <div
                          key={participant._id || participant.id || `${participant.name}-${index}`}
                          className="bg-white/90 border border-relish-linen rounded-2xl p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="text-lg font-display text-relish-ink">{participant.name}</h5>
                              {participant.email && (
                                <p className="text-xs text-relish-ink-muted">{participant.email}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleAssignParticipant(participant)}
                              className="px-3 py-1 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors text-xs"
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {visibleParticipants.length === 0 ? (
                  <div className="bg-white/80 border border-dashed border-relish-linen rounded-2xl p-10 text-center text-relish-ink shadow-inner">
                    <p className="text-lg font-semibold">No participants linked yet.</p>
                    <p className="text-sm mt-2 text-relish-ink-muted">Add participants above to build this workshop roster.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {visibleParticipants.map((participant, index) => (
                      <div
                        key={participant._id || participant.id || `${participant.name}-${index}`}
                        className="bg-white/90 border border-relish-linen rounded-2xl p-5 shadow-sm backdrop-blur"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-xl font-display text-relish-ink">{participant.name}</h4>
                            {participant.email && (
                              <p className="text-sm text-relish-ink-muted">{participant.email}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditParticipant(participant)}
                              className="p-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                              title="Edit participant"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteParticipant(participant)}
                              className="p-2 rounded-full border border-relish-accent text-relish-accent hover:bg-relish-accent hover:text-white"
                              title="Remove participant"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {participant.dietary && (
                          <div className="mb-2 text-sm">
                            <span className="font-semibold text-relish-ink">Dietary:</span>{' '}
                            <span className="text-relish-ink-muted">{participant.dietary}</span>
                          </div>
                        )}
                        {participant.cultural && (
                          <div className="mb-2 text-sm">
                            <span className="font-semibold text-relish-ink">Cultural Background:</span>{' '}
                            <span className="text-relish-ink-muted">{participant.cultural}</span>
                          </div>
                        )}
                        {participant.notes && (
                          <div className="text-sm text-relish-ink-muted bg-relish-paper rounded-2xl p-3">
                            {participant.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-display text-relish-ink">Photos</h4>
                    <p className="text-sm text-relish-ink-muted">Uploads tied to this workshop.</p>
                  </div>
                  <div className="text-sm text-relish-ink font-semibold">
                    {visiblePhotos.length} stored
                  </div>
                </div>
                {photosLoading && visiblePhotos.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center text-relish-ink border-2 border-dashed border-relish-linen rounded-2xl p-6">
                    <Images size={32} className="mb-3 animate-pulse" />
                    <p className="text-sm">Loading photos...</p>
                  </div>
                ) : visiblePhotos.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center text-relish-ink border-2 border-dashed border-relish-linen rounded-2xl p-6">
                    <Images size={32} className="mb-3" />
                    <p className="text-sm">No photos yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {visiblePhotos.map((photo, index) => (
                      <button
                        key={getPhotoId(photo) || index}
                        type="button"
                        onClick={() => openPhotoPreview(index)}
                        className="bg-white/90 border border-relish-linen rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left"
                      >
                        <div className="relative aspect-video overflow-hidden rounded-t-xl">
                          <img
                            src={buildPhotoUrl(photo)}
                            alt={photo.caption || photo.originalName || 'Workshop photo'}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Maximize2 size={14} /> View
                          </span>
                        </div>
                        <div className="p-4 space-y-1">
                          <div className="font-semibold text-sm text-relish-ink truncate">{photo.caption || photo.originalName || 'Workshop photo'}</div>
                          <div className="text-xs text-relish-ink-muted">{formatPhotoTimestamp(photo.createdAt)}</div>
                          <div className="text-xs text-relish-ink-muted">{describePhotoContext(photo)}</div>
                          {photo.uploadedBy && (
                            <div className="text-xs text-relish-ink">{getUploaderLabel(photo)}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {showWorkshopDeleteConfirm && pendingWorkshopDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70]">
          <div className="relative bg-white/95 rounded-[28px] shadow-relish-card max-w-md w-full border border-relish-linen overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply">
              <img src={relishLineArt} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-relish-paper" />
            </div>
            <div className="relative p-6 border-b border-relish-linen bg-white/90">
              <h4 className="text-xl font-display text-relish-ink">Delete this workshop?</h4>
              <p className="text-sm text-relish-ink-muted mt-2">This will remove the workshop and all associated photos.</p>
            </div>
            <div className="relative p-6 flex items-center justify-end gap-3 bg-white/90">
              <button
                onClick={cancelWorkshopDelete}
                className="px-5 py-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
              >
                Cancel
              </button>
              <button
                onClick={confirmWorkshopDelete}
                className="px-5 py-2 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark"
              >
                Delete workshop
              </button>
            </div>
          </div>
        </div>
      )}

      {showFacilitatorWorkshopDeleteConfirm && activeWorkshop && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70]">
          <div className="relative bg-white/95 rounded-[28px] shadow-relish-card max-w-md w-full border border-relish-linen overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply">
              <img src={relishLineArt} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-relish-paper" />
            </div>
            <div className="relative p-6 border-b border-relish-linen bg-white/90">
              <h4 className="text-xl font-display text-relish-ink">Archive this workshop?</h4>
              <p className="text-sm text-relish-ink-muted mt-2">
                Participants will be unassigned and the workshop will move to the admin archive. Photos remain with the workshop.
              </p>
            </div>
            <div className="relative p-6 flex items-center justify-end gap-3 bg-white/90">
              <button
                onClick={cancelDeleteOwnWorkshop}
                className="px-5 py-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteOwnWorkshop}
                className="px-5 py-2 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark"
              >
                Archive workshop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 rounded-[28px] shadow-relish-card max-w-2xl w-full max-h-[80vh] flex flex-col border border-relish-linen">
            <div className="p-6 border-b border-relish-linen">
              <h3 className="text-2xl font-display text-relish-ink">Facilitator Notes</h3>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <textarea
                value={facilitatorNotes}
                onChange={(e) => setFacilitatorNotes(e.target.value)}
                placeholder="Add your notes, observations, or reminders here..."
                className="w-full h-full min-h-[300px] p-4 border border-relish-linen rounded-2xl focus:border-relish-ink focus:outline-none resize-none bg-white/80 text-relish-ink"
              />
            </div>
            <div className="p-6 border-t border-relish-linen flex justify-end">
              <button
                onClick={() => setShowNotes(false)}
                className="px-6 py-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Modal */}
      {showChecklist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 rounded-[28px] shadow-relish-card max-w-2xl w-full max-h-[80vh] flex flex-col border border-relish-linen">
            <div className="p-6 border-b border-relish-linen">
              <h3 className="text-2xl font-display text-relish-ink">Pre-Workshop Checklist</h3>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <div className="space-y-4">
                {CHECKLIST_SECTIONS.map((section) => (
                  <div key={section.id} className={`${section.containerClass} p-4 rounded-lg`}>
                    <h4 className="font-semibold mb-3">{section.title}</h4>
                    <div className="space-y-2">
                      {section.items.map((item) => (
                        <label key={item.id} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="w-5 h-5"
                            checked={Boolean(checklistState[item.id])}
                            onChange={() => toggleChecklistItem(item.id)}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-relish-linen flex justify-end">
              <button
                onClick={() => setShowChecklist(false)}
                className="px-6 py-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipants && (isFacilitator || isAdmin) && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white/95 rounded-[32px] shadow-relish-card max-w-5xl w-full max-h-[85vh] flex flex-col border border-relish-linen overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply">
              <img src={relishLineArt} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-relish-paper" />
            </div>
            <div className="relative flex flex-col flex-1 min-h-0">
              <div className="p-6 border-b border-relish-linen flex items-center justify-between bg-white/80 backdrop-blur">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-relish-smoke font-semibold">Participant registry</p>
                  <h3 className="text-3xl font-display text-relish-ink">Roster & care notes</h3>
                  <p className="text-sm text-relish-ink-muted">Track attendees, sensitivities, and cultural frames in one scholarly sheet.</p>
                </div>
                <div className="flex items-center gap-3">
                  {isFacilitator && (
                    <button
                      onClick={openWorkshopCreator}
                      className="flex items-center gap-2 px-5 py-2 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors"
                    >
                      <Plus size={18} />
                      Create Workshop
                    </button>
                  )}
                  <button
                    onClick={handleCloseParticipants}
                    className="p-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                    aria-label="Close participant modal"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                {isFacilitator && (
                  <div className="bg-white/85 border border-relish-linen rounded-[24px] p-4 shadow-inner space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="facilitator-workshop-select">
                        Active workshop
                      </label>
                      <select
                        id="facilitator-workshop-select"
                        value={activeWorkshopId || ''}
                        onChange={(event) => setActiveWorkshopId(event.target.value)}
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      >
                        <option value="">Select workshop</option>
                        {workshops.map((workshop) => (
                          <option key={workshop._id || workshop.id} value={workshop._id || workshop.id}>
                            {workshop.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {activeWorkshop && (
                      <div className="bg-white/90 border border-relish-linen rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-relish-smoke">Active workshop</p>
                            {isEditingWorkshopName ? (
                              <input
                                id="facilitator-workshop-name"
                                value={workshopEditName}
                                onChange={(event) => setWorkshopEditName(event.target.value)}
                                className="mt-2 w-full px-3 py-2 border border-relish-linen rounded-2xl bg-white text-relish-ink focus:border-relish-ink focus:outline-none"
                              />
                            ) : (
                              <h5 className="text-xl font-display text-relish-ink mt-2">{activeWorkshop.name}</h5>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {isEditingWorkshopName ? (
                              <button
                                onClick={handleUpdateWorkshopName}
                                disabled={workshopSaving || !workshopEditName.trim()}
                                className="px-3 py-1 rounded-full border border-relish-ink text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-ink hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {workshopSaving ? 'Saving…' : 'Save'}
                              </button>
                            ) : (
                              <button
                                onClick={() => setIsEditingWorkshopName(true)}
                                className="p-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                                title="Edit workshop name"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {isEditingWorkshopName && (
                              <button
                                onClick={() => setIsEditingWorkshopName(false)}
                                className="px-3 py-1 rounded-full border border-relish-linen text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-paper"
                              >
                                Cancel
                              </button>
                            )}
                            {!isEditingWorkshopName && (
                              <button
                                onClick={requestDeleteOwnWorkshop}
                                className="p-2 rounded-full border border-relish-accent text-relish-accent hover:bg-relish-accent hover:text-white"
                                title="Delete workshop"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {isAdmin && (
                  <div className="bg-white/85 border border-relish-linen rounded-[24px] p-4 shadow-inner">
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-assign-workshop">
                      Assign to workshop
                    </label>
                    <select
                      id="participant-assign-workshop"
                      value={selectedWorkshopId}
                      onChange={(event) => setSelectedWorkshopId(event.target.value)}
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                    >
                      <option value="">Select workshop</option>
                      {workshops.map((workshop) => (
                        <option key={workshop._id || workshop.id} value={workshop._id || workshop.id}>
                          {workshop.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {participantsError && (
                  <div className="px-4 py-3 bg-relish-paper border border-relish-accent text-relish-ink rounded-2xl">
                    {participantsError}
                  </div>
                )}
                {participantsLoading && participants.length === 0 && (
                  <div className="px-4 py-3 bg-white/70 border border-dashed border-relish-linen text-relish-ink rounded-2xl">
                    Loading participants...
                  </div>
                )}
                <form onSubmit={handleParticipantSubmit} className="bg-white/85 border border-relish-linen rounded-[28px] p-6 space-y-4 shadow-inner">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-name">
                        Name <span className="text-relish-accent">*</span>
                      </label>
                      <input
                        id="participant-name"
                        name="name"
                        value={participantForm.name}
                        onChange={handleParticipantChange}
                        required
                        placeholder="Participant full name"
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-email">
                        Email
                      </label>
                      <input
                        id="participant-email"
                        name="email"
                        type="email"
                        value={participantForm.email}
                        onChange={handleParticipantChange}
                        disabled={Boolean(editingParticipantId && editingParticipantUserId)}
                        placeholder="example@email.com"
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      {editingParticipantId && editingParticipantUserId && (
                        <p className="mt-2 text-xs text-relish-ink-muted">Email is locked to the participant account.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-dietary">
                        Dietary needs
                      </label>
                      <input
                        id="participant-dietary"
                        name="dietary"
                        value={participantForm.dietary}
                        onChange={handleParticipantChange}
                        placeholder="Vegetarian, allergies, etc."
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-cultural">
                        Cultural background
                      </label>
                      <input
                        id="participant-cultural"
                        name="cultural"
                        value={participantForm.cultural}
                        onChange={handleParticipantChange}
                        placeholder="Region, heritage, influences"
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-relish-smoke mb-2" htmlFor="participant-notes">
                      Notes
                    </label>
                    <textarea
                      id="participant-notes"
                      name="notes"
                      value={participantForm.notes}
                      onChange={handleParticipantChange}
                      placeholder="Observations, accessibility needs, preferred pronouns, etc."
                      rows={3}
                      className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors"
                    >
                      {editingParticipantId ? 'Update Participant' : 'Add Participant'}
                    </button>
                    {editingParticipantId && (
                      <button
                        type="button"
                        onClick={resetParticipantForm}
                        className="px-5 py-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {isAdmin && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-display text-relish-ink">Facilitators</h4>
                        <p className="text-sm text-relish-ink-muted">Active facilitators and their workshops.</p>
                      </div>
                      <div className="text-sm text-relish-ink font-semibold">
                        {facilitators.length} facilitator{facilitators.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    {facilitatorsError && (
                      <div className="px-4 py-3 bg-relish-paper border border-relish-accent text-relish-ink rounded-2xl">
                        {facilitatorsError}
                      </div>
                    )}
                    {facilitatorsLoading && facilitators.length === 0 ? (
                      <div className="px-4 py-3 bg-white/70 border border-dashed border-relish-linen text-relish-ink rounded-2xl">
                        Loading facilitators...
                      </div>
                    ) : facilitators.length === 0 ? (
                      <div className="bg-white/80 border border-dashed border-relish-linen rounded-2xl p-8 text-center text-relish-ink shadow-inner">
                        <p className="text-sm">No facilitators yet.</p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {facilitators.map((facilitator) => {
                          const facilitatorId = facilitator._id || facilitator.id;
                          const assignedWorkshops = workshops.filter(
                            (workshop) => String(workshop.facilitatorId?._id || workshop.facilitatorId || '') === String(facilitatorId)
                          );
                          return (
                            <div
                              key={facilitatorId}
                              className="bg-white/90 border border-relish-linen rounded-2xl p-5 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h5 className="text-lg font-display text-relish-ink">{facilitator.name || 'Facilitator'}</h5>
                                  {facilitator.email && (
                                    <p className="text-sm text-relish-ink-muted">{facilitator.email}</p>
                                  )}
                                  <p className="text-xs text-relish-ink-muted mt-2">
                                    {assignedWorkshops.length} workshop{assignedWorkshops.length === 1 ? '' : 's'}
                                  </p>
                                </div>
                              </div>
                              {assignedWorkshops.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {assignedWorkshops.map((workshop) => (
                                    <span
                                      key={workshop._id || workshop.id}
                                      className="px-3 py-1 rounded-full bg-relish-paper text-relish-ink text-xs uppercase tracking-[0.2em]"
                                    >
                                      {workshop.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-relish-ink font-semibold">
                    {participantCount} participant{participantCount === 1 ? '' : 's'} registered
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportParticipants}
                      className="flex items-center gap-2 px-3 py-2 rounded-full border border-relish-linen bg-white/80 text-relish-ink hover:bg-relish-paper text-sm"
                    >
                      <Download size={16} />
                      Export JSON
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-full border border-relish-linen bg-white/80 text-relish-ink hover:bg-relish-paper text-sm"
                    >
                      <Upload size={16} />
                      Import JSON
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json"
                      onChange={handleImportParticipants}
                      className="hidden"
                    />
                  </div>
                </div>

                {(isFacilitator ? visibleParticipantsForFacilitator : participants).length === 0 ? (
                  <div className="bg-white/80 border border-dashed border-relish-linen rounded-2xl p-10 text-center text-relish-ink shadow-inner">
                    <p className="text-lg font-semibold">No participants registered yet.</p>
                    <p className="text-sm mt-2 text-relish-ink-muted">Use the form above to add facilitators and attendees as you prepare for the workshop.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {(isFacilitator ? visibleParticipantsForFacilitator : participants).map((participant, index) => (
                      <div
                        key={participant._id || participant.id || `${participant.name}-${index}`}
                        className="bg-white/90 border border-relish-linen rounded-2xl p-5 shadow-sm backdrop-blur"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-xl font-display text-relish-ink">{participant.name}</h4>
                            {participant.email && (
                              <p className="text-sm text-relish-ink-muted">{participant.email}</p>
                            )}
                            <p className="text-xs text-relish-ink-muted mt-1">
                              Workshop:{' '}
                              {participant.workshopId
                                ? getWorkshopLabel(participant.workshopId)
                                : 'Unassigned'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditParticipant(participant)}
                              className="p-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                              title="Edit participant"
                            >
                              <Pencil size={16} />
                            </button>
                            {(isFacilitator || isAdmin) && (
                              participant.workshopId ? (
                                (isAdmin || String(participant.workshopId) === String(activeWorkshopId)) && (
                                  <button
                                    onClick={() => handleSetParticipantWorkshop(participant, null)}
                                    className="px-3 py-1 rounded-full border border-relish-ink text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-ink hover:text-white"
                                    title="Unassign participant"
                                  >
                                    Unassign
                                  </button>
                                )
                              ) : (
                                <>
                                  {isAdmin && assigningParticipantId === (participant._id || participant.id) ? (
                                    <div className="flex flex-col gap-2 items-end">
                                      <select
                                        value={selectedWorkshopId}
                                        onChange={(event) => setSelectedWorkshopId(event.target.value)}
                                        className="px-3 py-1 rounded-full border border-relish-linen bg-white text-relish-ink text-xs"
                                      >
                                        <option value="">Select workshop</option>
                                        {workshops.map((workshop) => (
                                          <option key={workshop._id || workshop.id} value={workshop._id || workshop.id}>
                                            {workshop.name}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => confirmAssignParticipant(participant)}
                                          disabled={!selectedWorkshopId}
                                          className="px-3 py-1 rounded-full border border-relish-ink text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-ink hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Assign
                                        </button>
                                        <button
                                          onClick={cancelAssignParticipant}
                                          className="px-3 py-1 rounded-full border border-relish-linen text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-paper"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (isAdmin) {
                                          beginAssignParticipant(participant);
                                        } else {
                                          handleSetParticipantWorkshop(participant, activeWorkshopId);
                                        }
                                      }}
                                      disabled={!isAdmin && !activeWorkshopId}
                                      className={isFacilitator
                                        ? "px-3 py-1 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors text-xs uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
                                        : "px-3 py-1 rounded-full border border-relish-ink text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-ink hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                      }
                                      title="Assign participant"
                                    >
                                      Assign
                                    </button>
                                  )}
                                </>
                              )
                            )}
                            <button
                              onClick={() => handleDeleteParticipant(participant)}
                              className="p-2 rounded-full border border-relish-accent text-relish-accent hover:bg-relish-accent hover:text-white"
                              title="Remove participant"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {participant.dietary && (
                          <div className="mb-2 text-sm">
                            <span className="font-semibold text-relish-ink">Dietary:</span>{' '}
                            <span className="text-relish-ink-muted">{participant.dietary}</span>
                          </div>
                        )}
                        {participant.cultural && (
                          <div className="mb-2 text-sm">
                            <span className="font-semibold text-relish-ink">Cultural Background:</span>{' '}
                            <span className="text-relish-ink-muted">{participant.cultural}</span>
                          </div>
                        )}
                        {participant.notes && (
                          <div className="text-sm text-relish-ink-muted bg-relish-paper rounded-2xl p-3">
                            {participant.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(isAdmin || isFacilitator) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-display text-relish-ink">Participant Accounts</h4>
                        <p className="text-sm text-relish-ink-muted">Accounts created via sign up.</p>
                      </div>
                      <div className="text-sm text-relish-ink font-semibold">
                        {participantAccounts.length} account{participantAccounts.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    {participantAccountsError && (
                      <div className="px-4 py-3 bg-relish-paper border border-relish-accent text-relish-ink rounded-2xl">
                        {participantAccountsError}
                      </div>
                    )}
                    {participantAccountsLoading && participantAccounts.length === 0 ? (
                      <div className="px-4 py-3 bg-white/70 border border-dashed border-relish-linen text-relish-ink rounded-2xl">
                        Loading participant accounts...
                      </div>
                    ) : participantAccounts.length === 0 ? (
                      <div className="bg-white/80 border border-dashed border-relish-linen rounded-2xl p-8 text-center text-relish-ink shadow-inner">
                        <p className="text-sm">No participant accounts yet.</p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {participantAccounts.map((account) => (
                          <div
                            key={account._id || account.id}
                            className="bg-white/90 border border-relish-linen rounded-2xl p-5 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h5 className="text-lg font-display text-relish-ink">{account.name || 'Participant'}</h5>
                                {account.email && (
                                  <p className="text-sm text-relish-ink-muted">{account.email}</p>
                                )}
                                <p className="text-xs text-relish-ink-muted mt-2">
                                  Created {formatPhotoTimestamp(account.createdAt)}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2">
                                {isAdmin && assigningAccountId === (account._id || account.id) ? (
                                  <div className="flex flex-col gap-2 items-end">
                                    <select
                                      value={selectedWorkshopId}
                                      onChange={(event) => setSelectedWorkshopId(event.target.value)}
                                      className="px-3 py-1 rounded-full border border-relish-linen bg-white text-relish-ink text-xs"
                                    >
                                      <option value="">Select workshop</option>
                                      {workshops.map((workshop) => (
                                        <option key={workshop._id || workshop.id} value={workshop._id || workshop.id}>
                                          {workshop.name}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => confirmAssignAccount(account)}
                                        disabled={!selectedWorkshopId}
                                        className="px-3 py-1 rounded-full border border-relish-ink text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-ink hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Assign
                                      </button>
                                      <button
                                        onClick={cancelAssignAccount}
                                        className="px-3 py-1 rounded-full border border-relish-linen text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-paper"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (isAdmin) {
                                        beginAssignAccount(account);
                                      } else {
                                        confirmAssignAccount(account);
                                      }
                                    }}
                                    disabled={!isAdmin && !activeWorkshopId}
                                    className={isAdmin
                                      ? "px-3 py-1 rounded-full border border-relish-ink text-relish-ink text-xs uppercase tracking-[0.2em] hover:bg-relish-ink hover:text-white"
                                      : "px-3 py-1 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark transition-colors text-xs uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
                                    }
                                    title="Assign participant"
                                  >
                                    Assign
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Overlay */}
      {activePhotoIndex !== null && visiblePhotos[activePhotoIndex] && (
        <div className="fixed inset-0 bg-black/60 flex flex-col md:flex-row items-center justify-center gap-6 p-6 z-50">
          <button
            onClick={() => showNextPhoto(-1)}
            className="hidden md:flex items-center justify-center h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30"
            aria-label="Previous photo"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="relative bg-white/98 rounded-[28px] shadow-relish-card max-w-3xl w-full overflow-hidden border border-relish-linen">
            <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply">
              <img src={relishLineArt} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-relish-paper" />
            </div>
            <div className="relative flex items-center justify-between px-4 py-3 border-b border-relish-linen bg-white/90">
              <div>
                <h4 className="font-display text-xl text-relish-ink">Photo details</h4>
                <p className="text-xs text-relish-ink-muted">{describePhotoContext(visiblePhotos[activePhotoIndex])}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => requestPhotoDelete(getPhotoId(visiblePhotos[activePhotoIndex]))}
                  className="flex items-center gap-2 px-3 py-2 rounded-full border border-relish-accent text-relish-accent hover:bg-relish-accent hover:text-white text-sm"
                >
                  <Trash2 size={16} /> Delete
                </button>
                <button
                  onClick={closePhotoPreview}
                  className="p-2 rounded-full border border-relish-linen bg-white text-relish-ink hover:bg-relish-paper"
                  aria-label="Close preview"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>
            <div className="relative bg-black">
              <img
                src={buildPhotoUrl(visiblePhotos[activePhotoIndex])}
                alt={visiblePhotos[activePhotoIndex].caption || visiblePhotos[activePhotoIndex].originalName || 'Workshop photo'}
                className="max-h-[60vh] w-full object-contain bg-black"
              />
            </div>
            <div className="relative px-4 py-4 space-y-3 bg-white/90 border-t border-relish-linen">
              <div className="text-xs text-relish-ink-muted">
                Captured {formatPhotoTimestamp(visiblePhotos[activePhotoIndex].createdAt)}
              </div>
              {visiblePhotos[activePhotoIndex].uploadedBy && (
                <div className="text-xs text-relish-ink">
                  {getUploaderLabel(visiblePhotos[activePhotoIndex])}
                </div>
              )}
              <label className="block text-sm font-semibold text-relish-ink">
                Caption
                <input
                  type="text"
                  value={visiblePhotos[activePhotoIndex].caption || ''}
                  onChange={(event) => updatePhotoCaption(getPhotoId(visiblePhotos[activePhotoIndex]), event.target.value)}
                  placeholder="Add a short description"
                  className="mt-1 w-full px-3 py-2 border border-relish-linen rounded-2xl focus:border-relish-accent focus:outline-none"
                />
              </label>
            </div>
          </div>
          <button
            onClick={() => showNextPhoto(1)}
            className="hidden md:flex items-center justify-center h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30"
            aria-label="Next photo"
          >
            <ChevronRight size={24} />
          </button>
          <div className="flex md:hidden gap-3">
            <button
              onClick={() => showNextPhoto(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg"
            >
              <ChevronLeft size={18} /> Prev
            </button>
            <button
              onClick={() => showNextPhoto(1)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg"
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {showPhotoDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70]">
          <div className="relative bg-white/95 rounded-[28px] shadow-relish-card max-w-md w-full border border-relish-linen overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply">
              <img src={relishLineArt} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-relish-paper" />
            </div>
            <div className="relative p-6 border-b border-relish-linen bg-white/90">
              <h4 className="text-xl font-display text-relish-ink">Delete this photo?</h4>
              <p className="text-sm text-relish-ink-muted mt-2">This action cannot be undone.</p>
            </div>
            <div className="relative p-6 flex items-center justify-end gap-3 bg-white/90">
              <button
                onClick={cancelPhotoDelete}
                className="px-5 py-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
              >
                Cancel
              </button>
              <button
                onClick={confirmPhotoDelete}
                className="px-5 py-2 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark"
              >
                Delete photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Capture Overlay */}
      {showCameraCapture && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white/98 rounded-[32px] shadow-relish-card w-full max-w-3xl overflow-hidden border border-relish-linen">
            <div className="flex items-center justify-between px-5 py-4 border-b border-relish-linen bg-white/80">
              <div>
                <h4 className="text-lg font-display text-relish-ink">Live Camera</h4>
                <p className="text-xs text-relish-ink-muted">Position your device and capture a moment from the workshop.</p>
                {cameraError && <p className="text-xs text-relish-accent mt-1">{cameraError}</p>}
              </div>
              <button
                onClick={closeCameraCapture}
                className="p-2 rounded-full border border-relish-linen bg-white text-relish-ink hover:bg-relish-paper"
                aria-label="Close camera"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="bg-black">
              <video
                ref={cameraVideoRef}
                playsInline
                muted
                className="w-full max-h-[60vh] object-contain bg-black"
              />
            </div>
            <div className="px-5 py-4 flex items-center justify-between bg-white/90">
              <div className="text-xs text-relish-ink-muted">
                {cameraStream ? 'Camera ready' : 'Waiting for camera access…'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={capturePhotoFromCamera}
                  disabled={!cameraStream || photoUploading}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-relish-accent text-white hover:bg-relish-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera size={18} /> Capture
                </button>
                <button
                  onClick={closeCameraCapture}
                  className="px-4 py-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                >
                  Cancel
                </button>
              </div>
            </div>
            <canvas ref={cameraCanvasRef} className="hidden" />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default WorkshopTool;
