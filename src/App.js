import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Clock, Users, CheckCircle, BookOpen, Utensils, MapPin, Lightbulb, FileText, Play, Pause, RotateCcw, Timer, UserPlus, Pencil, Trash2, Upload, Download, X, Images, Camera, Maximize2, XCircle } from 'lucide-react';
import './App.css';
import relishLineArt from './img/relish-lineart.svg';
import logoPng from './img/logo.png';
import img1 from './img/img1.png';
import img4 from './img/img4.png';

const CHECKLIST_STORAGE_KEY = 'food-memories-checklist';
const PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit per requirements
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const SPLASH_TRANSITION_MS = 2000;

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
  const [participantForm, setParticipantForm] = useState({
    name: '',
    email: '',
    dietary: '',
    cultural: '',
    notes: ''
  });
  const [editingParticipantId, setEditingParticipantId] = useState(null);
  const fileInputRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);
  const photoInputRef = useRef(null);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const [splashState, setSplashState] = useState('visible');

  const dismissSplashScreen = useCallback(() => {
    setSplashState((prev) => (prev === 'visible' ? 'hiding' : prev));
  }, []);

  useEffect(() => {
    if (splashState === 'hiding') {
      const timer = setTimeout(() => setSplashState('hidden'), SPLASH_TRANSITION_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [splashState]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const originalOverflow = document.body.style.overflow;
    if (splashState !== 'hidden') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [splashState]);

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
          color: "bg-white border-relish-warm",
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
          color: "bg-relish-paper-deep border-relish-clay",
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
          color: "bg-white border-relish-linen",
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
          color: "bg-relish-paper-deep border-relish-accent",
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
      originalName: photo.originalName || photo.filename || 'Workshop photo',
      caption: photo.caption || '',
      notes: photo.notes || '',
      day: Number.isInteger(photo.day) ? photo.day : currentDay,
      phaseIndex: Number.isInteger(photo.phaseIndex) ? photo.phaseIndex : currentPhase,
      moduleId: typeof photo.moduleId === 'string' && photo.moduleId.trim().length > 0 ? photo.moduleId : null,
      participantIds: Array.isArray(photo.participantIds) ? photo.participantIds : [],
      createdAt: photo.createdAt || new Date().toISOString(),
      updatedAt: photo.updatedAt || photo.createdAt || null,
      mimeType: photo.mimeType || '',
      size: photo.size || 0
    };
  }, [currentDay, currentPhase]);

  const getPhotoId = (photo) => photo?.id || photo?._id || null;

  const buildPhotoUrl = (photo) => {
    if (!photo?.storagePath) return '';
    const base = API_BASE_URL.replace(/\/+$/, '');
    const path = photo.storagePath.replace(/^\/+/, '');
    return `${base}/${path}`;
  };

  const uploadPhotoFile = async (file) => {
    const formData = new FormData();
    formData.append('day', String(currentDay));
    formData.append('phaseIndex', String(currentPhase));
    if (module?.id) {
      formData.append('moduleId', module.id);
    }
    // Placeholder for participant tagging; currently no participants are selected but
    // the backend expects the field to exist in the payload.
    formData.append('participantIds', '');
    formData.append('photo', file);

    const response = await fetch(`${API_BASE_URL}/api/photos`, {
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
  };

  const closePhotoManager = () => {
    setShowPhotoManager(false);
    setActivePhotoIndex(null);
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
      const total = photos.length;
      if (total === 0) return null;
      const nextIndex = (prev + direction + total) % total;
      return nextIndex;
    });
  };

  const removePhoto = async (photoId) => {
    if (!photoId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/photos/${photoId}`, {
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
  const overlayStateClass = splashState === 'visible' ? 'splash-overlay-visible' : splashState === 'hiding' ? 'splash-overlay-hiding' : '';

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
      if (isMounted) {
        setParticipantsLoading(true);
        setParticipantsError(null);
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/participants`, {
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
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchPhotos = async () => {
      if (isMounted) {
        setPhotosLoading(true);
        setPhotosError(null);
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/photos`, {
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
  }, [normalizePhoto]);

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

  const resetParticipantForm = () => {
    setParticipantForm({
      name: '',
      email: '',
      dietary: '',
      cultural: '',
      notes: ''
    });
    setEditingParticipantId(null);
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
      email: participantForm.email.trim(),
      dietary: participantForm.dietary.trim(),
      cultural: participantForm.cultural.trim(),
      notes: participantForm.notes.trim()
    };

    const isEditing = Boolean(editingParticipantId);
    const endpoint = isEditing
      ? `${API_BASE_URL}/api/participants/${editingParticipantId}`
      : `${API_BASE_URL}/api/participants`;

    try {
      const response = await fetch(endpoint, {
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
    setShowParticipants(true);
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
      const response = await fetch(`${API_BASE_URL}/api/participants/${participantId}`, {
        method: 'DELETE'
      });
      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete participant');
      }

      setParticipants((prev) => prev.filter((item) => (item._id || item.id) !== participantId));
      if (editingParticipantId === participantId) {
        resetParticipantForm();
      }
    } catch (error) {
      console.error('Failed to delete participant', error);
      window.alert('Could not delete participant. Please try again.');
    }
  };

  const handleExportParticipants = () => {
    const blob = new Blob([JSON.stringify(participants, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'participants.json';
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
      <div
        className={`main-app-shell transition-opacity duration-500 ${
          splashState === 'hidden' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={splashState !== 'hidden'}
      >
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
                Photos ({photos.length})
              </button>
              <button
                onClick={() => {
                  resetParticipantForm();
                  setShowParticipants(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-relish-warm bg-white text-relish-ink shadow-sm hover:bg-relish-paper transition-colors"
              >
                <UserPlus size={18} />
                Participants ({participantCount})
              </button>
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
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-relish-ink text-relish-ink shadow-sm hover:bg-relish-ink hover:text-white transition-colors"
              >
                <FileText size={18} />
                Notes
              </button>
              <button
                onClick={() => setShowChecklist(!showChecklist)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-relish-paper text-relish-ink border border-relish-warm shadow-sm hover:bg-white transition-colors"
              >
                <CheckCircle size={18} />
                Checklist
              </button>
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
                    ? `${p.color} shadow-relish-card`
                    : 'bg-white border-relish-linen hover:bg-white/80'
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
                    ? 'border-transparent bg-relish-accent text-white shadow-sm'
                    : 'border-relish-ink text-relish-ink hover:bg-relish-ink hover:text-white'
                }`}
              >
                <CheckCircle size={20} />
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
          <div className="bg-white/98 rounded-[32px] shadow-relish-card max-w-6xl w-full max-h-[90vh] flex flex-col border border-relish-linen">
            <div className="p-6 border-b border-relish-linen flex items-center justify-between bg-white/80">
              <div>
                <h3 className="text-2xl font-display text-relish-ink">Workshop Photo Library</h3>
                <p className="text-sm text-relish-ink-muted">Document memory maps, cooking sessions, and collaborative moments.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openCameraCapture}
                  disabled={photoUploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-relish-ink text-white hover:bg-relish-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="text-sm text-relish-ink font-semibold">
                  {photos.length} photo{photos.length === 1 ? '' : 's'} stored
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
                {photosLoading && photos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-relish-ink border-2 border-dashed border-relish-linen rounded-2xl p-10">
                    <Images size={48} className="mb-4 animate-pulse" />
                    <p className="text-lg font-semibold">Loading photos...</p>
                    <p className="text-sm mt-2 text-relish-ink-muted">Fetching your workshop gallery from the server.</p>
                  </div>
                ) : photos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-relish-ink border-2 border-dashed border-relish-linen rounded-2xl p-10">
                    <Images size={48} className="mb-4" />
                    <p className="text-lg font-semibold">No photos yet</p>
                    <p className="text-sm mt-2 text-relish-ink-muted">Capture memory maps, cooking sessions, and group moments to build a visual archive.</p>
                    <button
                      onClick={openPhotoUploader}
                      className="mt-6 flex items-center gap-2 px-5 py-2 rounded-full bg-relish-accent text-white shadow-sm hover:bg-relish-accent-dark"
                    >
                      <Camera size={18} />
                      Add your first photo
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {photos.map((photo, index) => (
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
                        </div>
                      </button>
                    ))}
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
      {showParticipants && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white/95 rounded-[32px] shadow-relish-card max-w-5xl w-full max-h-[85vh] flex flex-col border border-relish-linen overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply">
              <img src={relishLineArt} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-relish-paper" />
            </div>
            <div className="relative flex flex-col flex-1">
              <div className="p-6 border-b border-relish-linen flex items-center justify-between bg-white/80 backdrop-blur">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-relish-smoke font-semibold">Participant registry</p>
                  <h3 className="text-3xl font-display text-relish-ink">Roster & care notes</h3>
                  <p className="text-sm text-relish-ink-muted">Track attendees, sensitivities, and cultural frames in one scholarly sheet.</p>
                </div>
                <button
                  onClick={handleCloseParticipants}
                  className="p-2 rounded-full border border-relish-linen text-relish-ink hover:bg-relish-paper"
                  aria-label="Close participant modal"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto">
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
                        placeholder="example@email.com"
                        className="w-full px-4 py-3 border border-relish-linen rounded-2xl bg-white/90 text-relish-ink focus:border-relish-ink focus:outline-none"
                      />
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

                {participantCount === 0 ? (
                  <div className="bg-white/80 border border-dashed border-relish-linen rounded-2xl p-10 text-center text-relish-ink shadow-inner">
                    <p className="text-lg font-semibold">No participants registered yet.</p>
                    <p className="text-sm mt-2 text-relish-ink-muted">Use the form above to add facilitators and attendees as you prepare for the workshop.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {participants.map((participant, index) => (
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Overlay */}
      {activePhotoIndex !== null && photos[activePhotoIndex] && (
        <div className="fixed inset-0 bg-black/80 flex flex-col md:flex-row items-center justify-center gap-6 p-6 z-50">
          <button
            onClick={() => showNextPhoto(-1)}
            className="hidden md:flex items-center justify-center h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30"
            aria-label="Previous photo"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="bg-white/98 rounded-[28px] shadow-relish-card max-w-3xl w-full overflow-hidden border border-relish-linen">
            <div className="flex items-center justify-between px-4 py-3 border-b border-relish-linen bg-white/80">
              <div>
                <h4 className="font-display text-xl text-relish-ink">Photo details</h4>
                <p className="text-xs text-relish-ink-muted">{describePhotoContext(photos[activePhotoIndex])}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => removePhoto(getPhotoId(photos[activePhotoIndex]))}
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
            <div className="bg-black">
              <img
                src={buildPhotoUrl(photos[activePhotoIndex])}
                alt={photos[activePhotoIndex].caption || photos[activePhotoIndex].originalName || 'Workshop photo'}
                className="max-h-[60vh] w-full object-contain bg-black"
              />
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="text-xs text-relish-ink-muted">
                Captured {formatPhotoTimestamp(photos[activePhotoIndex].createdAt)}
              </div>
              <label className="block text-sm font-semibold text-relish-ink">
                Caption
                <input
                  type="text"
                  value={photos[activePhotoIndex].caption || ''}
                  onChange={(event) => updatePhotoCaption(getPhotoId(photos[activePhotoIndex]), event.target.value)}
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
