import './style.css';
import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const supportedLangs = ['en', 'lt'];
const params = new URLSearchParams(window.location.search);
const requestedLang = (params.get('lang') || 'en').toLowerCase();
let currentLang = supportedLangs.includes(requestedLang) ? requestedLang : 'en';

const defaultModelPath = `${import.meta.env.BASE_URL}models/cars/car.glb`;
const defaultModelId = 'default-car';
const maxUploadBytes = 40 * 1024 * 1024;
const maxModelNameLength = 80;
const minPasswordLength = 8;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabaseBucket = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'car-models').trim();
const supabaseModelsTable = (import.meta.env.VITE_SUPABASE_MODELS_TABLE || 'car_models').trim();
const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const i18n = {
  en: {
    title: 'Car Showroom',
    home: 'Home',
    toggleAriaLabel: 'Switch language',
    loading: 'Loading 3D showroom...',
    checkpoint2: (target) => `Checkpoint 2/4: Scene ready. Loading ${target}...`,
    checkpoint3Success: (name) => `Checkpoint 3/4: Loaded ${name} on rotating platform.`,
    checkpoint3Fail: (name) => `Checkpoint 3/4 failed: could not load ${name}.`,
    checkpoint4: 'Checkpoint 4/4: Renderer running.',
    defaultModelName: 'Default Car',
    modelPanelTitle: 'Model Library',
    modelSelectLabel: 'Active model',
    modelUploadLabel: 'Upload .glb model',
    modelRenameLabel: 'Model name',
    modelOriginLabel: 'Model origin',
    modelOriginDefault: 'Original database model',
    modelOriginLocalUpload: 'Local upload',
    modelOriginCloudUploadUnknown: 'Supabase upload',
    modelOriginUploadedByYou: 'Uploaded by you',
    modelOriginUploadedByUser: (user) => `Uploaded by ${user}`,
    modelOriginUnavailable: 'Unknown origin',
    renamePlaceholder: 'Select an uploaded model',
    uploadButton: 'Add model',
    renameButton: 'Rename model',
    deleteButton: 'Delete model',
    authUsernameLabel: 'Email',
    authPasswordLabel: 'Password',
    authSignInButton: 'Sign in',
    authSignUpButton: 'Create account',
    authSignOutButton: 'Sign out',
    authLocalModeStatus: 'Using local model API mode.',
    authCloudSignedOutStatus: 'Cloud mode: sign in or create account to manage your model library.',
    authCloudSignedInStatus: (email) => `Cloud mode: signed in as ${email}.`,
    uploadInProgress: 'Uploading model...',
    uploadSuccess: (name) => `Model added: ${name}.`,
    uploadFail: (reason) => `Upload failed: ${reason}`,
    renameInProgress: 'Renaming model...',
    renameSuccess: (name) => `Model renamed to ${name}.`,
    renameFail: (reason) => `Rename failed: ${reason}`,
    renameEmptyName: 'Enter a model name first.',
    renameDefaultBlocked: 'Default model cannot be renamed.',
    deleteInProgress: 'Deleting model...',
    deleteSuccess: (name) => `Model deleted: ${name}.`,
    deleteFail: (reason) => `Delete failed: ${reason}`,
    deleteDefaultBlocked: 'Default model cannot be deleted.',
    deleteConfirm: (name) => `Delete model "${name}"?`,
    authRequired: 'Sign in with email/password to manage cloud models.',
    authSignInInProgress: 'Signing in...',
    authSignInSuccess: 'Signed in successfully.',
    authSignInFail: (reason) => `Sign-in failed: ${reason}`,
    authSignUpInProgress: 'Creating account...',
    authSignUpSuccess: 'Account created and signed in.',
    authSignUpFail: (reason) => `Create account failed: ${reason}`,
    authSignUpNeedsVerification: 'Account created. Confirm your email once, then sign in with email and password.',
    authSignOutSuccess: 'Signed out successfully.',
    authSignOutFail: (reason) => `Sign-out failed: ${reason}`,
    authUsernameMissing: 'Enter your email first.',
    authUsernameInvalid: 'Enter a valid email address.',
    authPasswordMissing: 'Enter your password first.',
    authPasswordTooShort: (minLen) => `Password must be at least ${minLen} characters.`,
    uploadUnavailable:
      'Model upload unavailable. Configure Supabase or start the local model server.',
    noFileSelected: 'Select a .glb file first.',
    invalidFileType: 'Only .glb files are supported.',
    uploadTooLarge: (maxMb) => `File is too large. Max size is ${maxMb}MB.`,
    providerLocal: 'Local storage mode',
    providerCloud: 'Supabase cloud mode',
    cloudLibraryLoadFail: (reason) => `Cloud models failed to load: ${reason}`
  },
  lt: {
    title: 'Automobiliu Ekspozicija',
    home: 'Pradzia',
    toggleAriaLabel: 'Pakeisti kalba',
    loading: 'Kraunama 3D automobiliu ekspozicija...',
    checkpoint2: (target) => `Patikros taskas 2/4: Scena parengta. Ikeliamas ${target}...`,
    checkpoint3Success: (name) => `Patikros taskas 3/4: Ikeltas modelis ${name} ant besisukancios platformos.`,
    checkpoint3Fail: (name) => `Patikros taskas 3/4 nepavyko: nepavyko ikelti ${name}.`,
    checkpoint4: 'Patikros taskas 4/4: Atvaizdavimas veikia.',
    defaultModelName: 'Numatytas automobilis',
    modelPanelTitle: 'Modeliu biblioteka',
    modelSelectLabel: 'Aktyvus modelis',
    modelUploadLabel: 'Ikelti .glb modeli',
    modelRenameLabel: 'Modelio pavadinimas',
    modelOriginLabel: 'Modelio kilme',
    modelOriginDefault: 'Originalus duomenu bazes modelis',
    modelOriginLocalUpload: 'Vietinis ikelimas',
    modelOriginCloudUploadUnknown: 'Supabase ikelimas',
    modelOriginUploadedByYou: 'Ikelta jusu',
    modelOriginUploadedByUser: (user) => `Ikelta naudotojo ${user}`,
    modelOriginUnavailable: 'Kilme nezinoma',
    renamePlaceholder: 'Pasirinkite ikelta modeli',
    uploadButton: 'Prideti modeli',
    renameButton: 'Pervadinti modeli',
    deleteButton: 'Istrinti modeli',
    authUsernameLabel: 'El. pastas',
    authPasswordLabel: 'Slaptazodis',
    authSignInButton: 'Prisijungti',
    authSignUpButton: 'Sukurti paskyra',
    authSignOutButton: 'Atsijungti',
    authLocalModeStatus: 'Naudojamas vietinis modeliu API rezimas.',
    authCloudSignedOutStatus: 'Debesies rezimas: prisijunkite arba susikurkite paskyra modeliams valdyti.',
    authCloudSignedInStatus: (email) => `Debesies rezimas: prisijungta kaip ${email}.`,
    uploadInProgress: 'Ikeliamas modelis...',
    uploadSuccess: (name) => `Modelis pridetas: ${name}.`,
    uploadFail: (reason) => `Ikelimas nepavyko: ${reason}`,
    renameInProgress: 'Modelis pervadinamas...',
    renameSuccess: (name) => `Modelis pervadintas i ${name}.`,
    renameFail: (reason) => `Pervadinti nepavyko: ${reason}`,
    renameEmptyName: 'Pirma irasykite modelio pavadinima.',
    renameDefaultBlocked: 'Numatyto modelio pervadinti negalima.',
    deleteInProgress: 'Modelis trinamas...',
    deleteSuccess: (name) => `Modelis istrintas: ${name}.`,
    deleteFail: (reason) => `Istrinti nepavyko: ${reason}`,
    deleteDefaultBlocked: 'Numatyto modelio istrinti negalima.',
    deleteConfirm: (name) => `Istrinti modeli "${name}"?`,
    authRequired: 'Prisijunkite su el. pastu ir slaptazodziu debesies modeliams valdyti.',
    authSignInInProgress: 'Jungiamasi...',
    authSignInSuccess: 'Sekmingai prisijungta.',
    authSignInFail: (reason) => `Prisijungti nepavyko: ${reason}`,
    authSignUpInProgress: 'Kuriama paskyra...',
    authSignUpSuccess: 'Paskyra sukurta ir prisijungta.',
    authSignUpFail: (reason) => `Sukurti paskyros nepavyko: ${reason}`,
    authSignUpNeedsVerification:
      'Paskyra sukurta. Patvirtinkite el. pasta viena karta, tada prisijunkite su el. pastu ir slaptazodziu.',
    authSignOutSuccess: 'Sekmingai atsijungta.',
    authSignOutFail: (reason) => `Atsijungti nepavyko: ${reason}`,
    authUsernameMissing: 'Pirma irasykite el. pasta.',
    authUsernameInvalid: 'Iveskite teisinga el. pasto adresa.',
    authPasswordMissing: 'Pirma irasykite slaptazodi.',
    authPasswordTooShort: (minLen) => `Slaptazodis turi buti bent ${minLen} simboliu.`,
    uploadUnavailable:
      'Modeliu ikelimas nepasiekiamas. Sukonfiguruokite Supabase arba paleiskite vietini modeliavimo serveri.',
    noFileSelected: 'Pirma pasirinkite .glb faila.',
    invalidFileType: 'Palaikomi tik .glb failai.',
    uploadTooLarge: (maxMb) => `Failas per didelis. Didziausias dydis ${maxMb}MB.`,
    providerLocal: 'Vietines saugyklos rezimas',
    providerCloud: 'Supabase debesies rezimas',
    cloudLibraryLoadFail: (reason) => `Nepavyko uzkrauti debesies modeliu: ${reason}`
  }
};

const defaultModel = {
  id: defaultModelId,
  name: 'Default Car',
  path: defaultModelPath,
  source: 'default'
};

const canvas = document.querySelector('#showroom');
const status = document.querySelector('#status');
const homeLink = document.querySelector('#home-link');
const langToggle = document.querySelector('#lang-toggle');
const modelPanelTitle = document.querySelector('#model-panel-title');
const modelSelectLabel = document.querySelector('#model-select-label');
const modelOriginLabel = document.querySelector('#model-origin-label');
const modelOriginValue = document.querySelector('#model-origin-value');
const modelUploadLabel = document.querySelector('#model-upload-label');
const modelRenameLabel = document.querySelector('#model-rename-label');
const modelSelect = document.querySelector('#model-select');
const uploadForm = document.querySelector('#upload-form');
const renameForm = document.querySelector('#rename-form');
const modelFileInput = document.querySelector('#model-file');
const modelNameInput = document.querySelector('#model-name-input');
const uploadButton = document.querySelector('#upload-button');
const renameButton = document.querySelector('#rename-button');
const deleteButton = document.querySelector('#delete-button');
const modelFeedback = document.querySelector('#model-feedback');
const authSection = document.querySelector('#auth-section');
const authStatus = document.querySelector('#auth-status');
const authForm = document.querySelector('#auth-form');
const authUsernameLabel = document.querySelector('#auth-username-label');
const authPasswordLabel = document.querySelector('#auth-password-label');
const authUsernameInput = document.querySelector('#auth-username');
const authPasswordInput = document.querySelector('#auth-password');
const authSignInButton = document.querySelector('#auth-sign-in-button');
const authSignUpButton = document.querySelector('#auth-sign-up-button');
const authSignOutButton = document.querySelector('#auth-sign-out-button');

const supabaseClient = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

let statusKey = 'loading';
let statusMeta = '';
let feedbackKey = '';
let feedbackMeta = '';
let availableModels = [defaultModel];
let selectedModelId = params.get('model') || defaultModelId;
let activeModelRoot = null;
let activeModelId = null;
let uploadApiAvailable = true;
let supabaseSession = null;
let providerMode = supabaseConfigured ? 'supabase' : 'local';
let loadSequence = 0;
let supabaseSupportsUploaderEmail = null;

function isDefaultModel(model) {
  if (!model) return true;
  return model.id === defaultModelId || model.source === 'default';
}

function getModelDisplayName(model) {
  if (!model) return i18n[currentLang].defaultModelName;
  return isDefaultModel(model) ? i18n[currentLang].defaultModelName : model.name;
}

function getStatusText(lang, key, meta) {
  const t = i18n[lang];
  if (key === 'checkpoint2') return t.checkpoint2(meta);
  if (key === 'checkpoint3Success') return t.checkpoint3Success(meta);
  if (key === 'checkpoint3Fail') return t.checkpoint3Fail(meta);
  if (key === 'checkpoint4') return t.checkpoint4;
  return t.loading;
}

function getFeedbackText(lang, key, meta) {
  const t = i18n[lang];

  if (key === 'uploadInProgress') return t.uploadInProgress;
  if (key === 'uploadSuccess') return t.uploadSuccess(meta);
  if (key === 'uploadFail') return t.uploadFail(meta);
  if (key === 'renameInProgress') return t.renameInProgress;
  if (key === 'renameSuccess') return t.renameSuccess(meta);
  if (key === 'renameFail') return t.renameFail(meta);
  if (key === 'renameEmptyName') return t.renameEmptyName;
  if (key === 'renameDefaultBlocked') return t.renameDefaultBlocked;
  if (key === 'deleteInProgress') return t.deleteInProgress;
  if (key === 'deleteSuccess') return t.deleteSuccess(meta);
  if (key === 'deleteFail') return t.deleteFail(meta);
  if (key === 'deleteDefaultBlocked') return t.deleteDefaultBlocked;
  if (key === 'authRequired') return t.authRequired;
  if (key === 'authSignInInProgress') return t.authSignInInProgress;
  if (key === 'authSignInSuccess') return t.authSignInSuccess;
  if (key === 'authSignInFail') return t.authSignInFail(meta);
  if (key === 'authSignUpInProgress') return t.authSignUpInProgress;
  if (key === 'authSignUpSuccess') return t.authSignUpSuccess;
  if (key === 'authSignUpFail') return t.authSignUpFail(meta);
  if (key === 'authSignUpNeedsVerification') return t.authSignUpNeedsVerification;
  if (key === 'authSignOutSuccess') return t.authSignOutSuccess;
  if (key === 'authSignOutFail') return t.authSignOutFail(meta);
  if (key === 'authUsernameMissing') return t.authUsernameMissing;
  if (key === 'authUsernameInvalid') return t.authUsernameInvalid;
  if (key === 'authPasswordMissing') return t.authPasswordMissing;
  if (key === 'authPasswordTooShort') return t.authPasswordTooShort(meta);
  if (key === 'uploadUnavailable') return t.uploadUnavailable;
  if (key === 'cloudLibraryLoadFail') return t.cloudLibraryLoadFail(meta);
  if (key === 'noFileSelected') return t.noFileSelected;
  if (key === 'invalidFileType') return t.invalidFileType;
  if (key === 'uploadTooLarge') return t.uploadTooLarge(meta);

  return '';
}

function setStatus(nextStatusKey, meta = '') {
  statusKey = nextStatusKey;
  statusMeta = meta;
  if (status) {
    status.textContent = getStatusText(currentLang, statusKey, statusMeta);
  }
}

function setFeedback(nextFeedbackKey, meta = '') {
  feedbackKey = nextFeedbackKey;
  feedbackMeta = meta;
  if (modelFeedback) {
    modelFeedback.textContent = getFeedbackText(currentLang, feedbackKey, feedbackMeta);
  }
}

function clearFeedback() {
  feedbackKey = '';
  feedbackMeta = '';
  if (modelFeedback) {
    modelFeedback.textContent = '';
  }
}

function updateUrlState() {
  params.set('lang', currentLang);
  if (selectedModelId === defaultModelId) {
    params.delete('model');
  } else {
    params.set('model', selectedModelId);
  }

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  history.replaceState(null, '', nextUrl);
}

function setUploadControlsEnabled(enabled) {
  if (modelFileInput) {
    modelFileInput.disabled = !enabled;
  }

  if (uploadButton) {
    uploadButton.disabled = !enabled;
  }
}

function setModelActionsEnabled(enabled) {
  if (modelNameInput) {
    modelNameInput.disabled = !enabled;
  }

  if (renameButton) {
    renameButton.disabled = !enabled;
  }

  if (deleteButton) {
    deleteButton.disabled = !enabled;
  }
}

function getModelById(id) {
  return availableModels.find((model) => model.id === id);
}

function getModelProviderLabel() {
  const t = i18n[currentLang];
  return providerMode === 'supabase' ? t.providerCloud : t.providerLocal;
}

function getModelOriginText(model) {
  const t = i18n[currentLang];
  if (!model) return t.modelOriginUnavailable;
  if (isDefaultModel(model)) return t.modelOriginDefault;

  const currentUsername = getSessionUsername(supabaseSession);
  const uploadedBy = normalizeUsername(model.uploadedByEmail || model.uploadedBy || '');
  if (uploadedBy) {
    if (currentUsername && uploadedBy === currentUsername) {
      return t.modelOriginUploadedByYou;
    }
    return t.modelOriginUploadedByUser(uploadedBy);
  }

  if (
    providerMode === 'supabase' &&
    model.userId &&
    supabaseSession?.user?.id &&
    model.userId === supabaseSession.user.id
  ) {
    return t.modelOriginUploadedByYou;
  }

  return providerMode === 'supabase' ? t.modelOriginCloudUploadUnknown : t.modelOriginLocalUpload;
}

function updateModelOriginUi() {
  const t = i18n[currentLang];

  if (modelOriginLabel) {
    modelOriginLabel.textContent = t.modelOriginLabel;
  }

  if (modelOriginValue) {
    const selectedModel = getModelById(selectedModelId);
    modelOriginValue.textContent = getModelOriginText(selectedModel);
  }
}

function updateAuthUi() {
  if (!authSection || !authStatus) return;

  if (!supabaseConfigured) {
    authStatus.textContent = i18n[currentLang].authLocalModeStatus;
    if (authForm) {
      authForm.hidden = true;
    }
    if (authSignOutButton) {
      authSignOutButton.hidden = true;
      authSignOutButton.disabled = true;
    }
    return;
  }

  if (supabaseSession?.user) {
    const username = getSessionUsername(supabaseSession) || 'user';
    authStatus.textContent = i18n[currentLang].authCloudSignedInStatus(username);
    if (authForm) {
      authForm.hidden = true;
    }
    if (authSignOutButton) {
      authSignOutButton.hidden = false;
      authSignOutButton.disabled = false;
      authSignOutButton.textContent = i18n[currentLang].authSignOutButton;
    }
    return;
  }

  authStatus.textContent = i18n[currentLang].authCloudSignedOutStatus;
  if (authForm) {
    authForm.hidden = false;
  }
  if (authSignOutButton) {
    authSignOutButton.hidden = true;
    authSignOutButton.disabled = true;
  }
}

function syncModelActions() {
  const selectedModel = getModelById(selectedModelId);
  const hasAuthenticatedSession = !supabaseConfigured || Boolean(supabaseSession?.user);
  const canManage = uploadApiAvailable && hasAuthenticatedSession && !!selectedModel && !isDefaultModel(selectedModel);

  if (modelSelect) {
    modelSelect.disabled = availableModels.length < 2;
  }

  setModelActionsEnabled(canManage);

  if (modelNameInput) {
    modelNameInput.placeholder = i18n[currentLang].renamePlaceholder;
    modelNameInput.value = canManage ? selectedModel.name : '';
  }

  updateModelOriginUi();
}

function applyLanguage() {
  const t = i18n[currentLang];
  document.documentElement.lang = currentLang;
  document.title = t.title;

  if (homeLink) {
    const homeUrl = new URL(homeLink.href);
    homeUrl.searchParams.set('lang', currentLang);
    homeLink.href = homeUrl.toString();
    homeLink.textContent = t.home;
  }

  if (langToggle) {
    langToggle.textContent = currentLang === 'en' ? 'LT' : 'EN';
    langToggle.setAttribute('aria-label', t.toggleAriaLabel);
  }

  if (modelPanelTitle) {
    modelPanelTitle.textContent = `${t.modelPanelTitle} (${getModelProviderLabel()})`;
  }

  if (modelSelectLabel) {
    modelSelectLabel.textContent = t.modelSelectLabel;
  }

  if (modelUploadLabel) {
    modelUploadLabel.textContent = t.modelUploadLabel;
  }

  if (modelRenameLabel) {
    modelRenameLabel.textContent = t.modelRenameLabel;
  }

  if (authUsernameLabel) {
    authUsernameLabel.textContent = t.authUsernameLabel;
  }

  if (authPasswordLabel) {
    authPasswordLabel.textContent = t.authPasswordLabel;
  }

  if (uploadButton) {
    uploadButton.textContent = t.uploadButton;
  }

  if (renameButton) {
    renameButton.textContent = t.renameButton;
  }

  if (deleteButton) {
    deleteButton.textContent = t.deleteButton;
  }

  if (authSignInButton) {
    authSignInButton.textContent = t.authSignInButton;
  }

  if (authSignUpButton) {
    authSignUpButton.textContent = t.authSignUpButton;
  }

  if (authSignOutButton) {
    authSignOutButton.textContent = t.authSignOutButton;
  }

  if (modelFileInput) {
    modelFileInput.setAttribute('aria-label', t.modelUploadLabel);
  }

  if (modelNameInput) {
    modelNameInput.setAttribute('aria-label', t.modelRenameLabel);
  }

  if (authUsernameInput) {
    authUsernameInput.setAttribute('aria-label', t.authUsernameLabel);
  }

  if (authPasswordInput) {
    authPasswordInput.setAttribute('aria-label', t.authPasswordLabel);
  }

  renderModelOptions();
  syncModelActions();
  updateAuthUi();
  setStatus(statusKey, statusMeta);

  if (feedbackKey) {
    setFeedback(feedbackKey, feedbackMeta);
  }
}

function removeActiveModel() {
  if (!activeModelRoot) return;

  turntableGroup.remove(activeModelRoot);
  activeModelRoot.traverse((node) => {
    if (!node.isMesh) return;

    if (node.geometry) {
      node.geometry.dispose();
    }

    if (Array.isArray(node.material)) {
      for (const material of node.material) {
        material.dispose();
      }
      return;
    }

    if (node.material) {
      node.material.dispose();
    }
  });

  activeModelRoot = null;
  activeModelId = null;
}

function normalizeModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxAxis = Math.max(size.x, size.y, size.z);
  if (maxAxis > 0) {
    const targetSize = 2.2;
    const scale = targetSize / maxAxis;
    model.scale.setScalar(scale);
    box.setFromObject(model);
  }

  const center = new THREE.Vector3();
  box.getCenter(center);
  model.position.sub(center);

  box.setFromObject(model);
  model.position.y -= box.min.y;
  model.position.y += 0.01;

  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

function renderModelOptions() {
  if (!modelSelect) return;

  const hasSelectedModel = availableModels.some((model) => model.id === selectedModelId);
  if (!hasSelectedModel) {
    selectedModelId = defaultModelId;
  }

  modelSelect.innerHTML = '';

  for (const model of availableModels) {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = getModelDisplayName(model);
    modelSelect.appendChild(option);
  }

  modelSelect.value = selectedModelId;
}

function normalizeModelName(value) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxModelNameLength);
}

function toFileSlug(fileName) {
  const base = fileName.replace(/\.glb$/i, '').toLowerCase();
  const slug = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'model';
}

function randomSuffix() {
  return Math.random().toString(16).slice(2, 10);
}

function isGlbFile(file) {
  return file.name.toLowerCase().endsWith('.glb');
}

function normalizeUsername(rawValue) {
  return rawValue.trim().toLowerCase();
}

function isValidUsername(username) {
  return emailPattern.test(username);
}

function getSessionUsername(session) {
  return (session?.user?.email || '').trim().toLowerCase();
}

function isMissingSupabaseColumn(error, columnName) {
  if (!error || !columnName) return false;
  const errorCode = String(error.code || '').trim();
  const errorMessage = String(error.message || '').toLowerCase();
  return errorCode === '42703' && errorMessage.includes(columnName.toLowerCase());
}

function extractApiError(payload, statusCode) {
  if (payload && typeof payload.error === 'string') {
    return payload.error;
  }

  return `HTTP ${statusCode}`;
}

function mapSupabaseRowToModel(row) {
  return {
    id: row.id,
    name: row.name || 'Uploaded Model',
    source: 'upload',
    userId: row.user_id || null,
    uploadedByEmail: normalizeUsername(row.uploaded_by_email || ''),
    storagePath: row.storage_path,
    originalFileName: row.original_file_name || '',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

async function fetchLocalModels() {
  const response = await fetch('/api/models', {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API responded with ${response.status}`);
  }

  const payload = await response.json();
  const remoteModels = Array.isArray(payload.models) ? payload.models : [];

  return remoteModels
    .filter((model) => model && typeof model.id === 'string' && typeof model.path === 'string')
    .map((model) => ({
      ...model,
      uploadedBy: normalizeUsername(model.uploadedBy || '')
    }));
}

async function fetchSupabaseModels() {
  if (!supabaseClient || !supabaseSession?.user) {
    return [];
  }

  const selectWithUploader = 'id,name,storage_path,original_file_name,created_at,updated_at,user_id,uploaded_by_email';
  const selectWithoutUploader = 'id,name,storage_path,original_file_name,created_at,updated_at,user_id';
  const selectColumns = supabaseSupportsUploaderEmail === false ? selectWithoutUploader : selectWithUploader;

  let { data, error } = await supabaseClient
    .from(supabaseModelsTable)
    .select(selectColumns)
    .order('created_at', { ascending: false });

  if (error && supabaseSupportsUploaderEmail !== false && isMissingSupabaseColumn(error, 'uploaded_by_email')) {
    supabaseSupportsUploaderEmail = false;
    ({ data, error } = await supabaseClient
      .from(supabaseModelsTable)
      .select(selectWithoutUploader)
      .order('created_at', { ascending: false }));
  }

  if (error) {
    throw error;
  }

  if (supabaseSupportsUploaderEmail === null && selectColumns === selectWithUploader) {
    supabaseSupportsUploaderEmail = true;
  }

  return Array.isArray(data) ? data.map(mapSupabaseRowToModel) : [];
}

async function resolveModelAssetPath(model) {
  if (isDefaultModel(model)) {
    return model.path;
  }

  if (providerMode === 'supabase') {
    if (!supabaseClient || !model.storagePath) {
      throw new Error('Missing storage path for selected cloud model.');
    }

    const { data, error } = await supabaseClient.storage
      .from(supabaseBucket)
      .createSignedUrl(model.storagePath, 60 * 30);

    if (error) {
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error('Supabase did not return a signed URL.');
    }

    return data.signedUrl;
  }

  return model.path;
}

async function loadModel(modelEntry) {
  const loadId = ++loadSequence;

  try {
    const modelPath = await resolveModelAssetPath(modelEntry);
    const label = isDefaultModel(modelEntry) ? modelPath : getModelDisplayName(modelEntry);
    setStatus('checkpoint2', label);

    const gltf = await loader.loadAsync(modelPath);
    if (loadId !== loadSequence) {
      return;
    }

    const model = gltf.scene;
    normalizeModel(model);
    removeActiveModel();

    turntableGroup.add(model);
    activeModelRoot = model;
    activeModelId = modelEntry.id;
    setStatus('checkpoint3Success', getModelDisplayName(modelEntry));
  } catch (error) {
    console.error(error);
    setStatus('checkpoint3Fail', getModelDisplayName(modelEntry));
  }
}

async function refreshModelLibrary() {
  if (providerMode === 'supabase') {
    if (!supabaseSession?.user) {
      availableModels = [defaultModel];
      selectedModelId = defaultModelId;
      uploadApiAvailable = false;
      setUploadControlsEnabled(false);
      renderModelOptions();
      syncModelActions();
      updateUrlState();
      setFeedback('authRequired');
      return;
    }

    try {
      const cloudModels = await fetchSupabaseModels();
      availableModels = [defaultModel, ...cloudModels];
      uploadApiAvailable = true;
      setUploadControlsEnabled(true);
      if (feedbackKey === 'authRequired' || feedbackKey === 'cloudLibraryLoadFail') {
        clearFeedback();
      }
    } catch (error) {
      console.error(error);
      availableModels = [defaultModel];
      selectedModelId = defaultModelId;
      uploadApiAvailable = false;
      setUploadControlsEnabled(false);
      renderModelOptions();
      syncModelActions();
      updateUrlState();
      setFeedback('cloudLibraryLoadFail', error.message || 'Unknown error');
      return;
    }
  } else {
    try {
      const localModels = await fetchLocalModels();
      availableModels = [defaultModel, ...localModels];
      uploadApiAvailable = true;
      setUploadControlsEnabled(true);
      if (feedbackKey === 'uploadUnavailable') {
        clearFeedback();
      }
    } catch (error) {
      console.warn('Local model API is unavailable.', error);
      availableModels = [defaultModel];
      selectedModelId = defaultModelId;
      uploadApiAvailable = false;
      setUploadControlsEnabled(false);
      renderModelOptions();
      syncModelActions();
      updateUrlState();
      setFeedback('uploadUnavailable');
      return;
    }
  }

  if (!availableModels.some((model) => model.id === selectedModelId)) {
    selectedModelId = defaultModelId;
  }

  renderModelOptions();
  syncModelActions();
  updateUrlState();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file.'));
        return;
      }

      const commaIndex = result.indexOf(',');
      if (commaIndex < 0) {
        reject(new Error('Failed to encode file.'));
        return;
      }

      resolve(result.slice(commaIndex + 1));
    };

    reader.onerror = () => {
      reject(reader.error || new Error('Failed to read file.'));
    };

    reader.readAsDataURL(file);
  });
}

async function uploadModelToLocalApi(file, fallbackName) {
  const dataBase64 = await fileToBase64(file);
  const uploadedBy = getSessionUsername(supabaseSession);
  const response = await fetch('/api/models', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileName: file.name,
      name: fallbackName,
      dataBase64,
      uploadedBy
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiError(payload, response.status));
  }

  return payload.model;
}

async function uploadModelToSupabase(file, fallbackName) {
  if (!supabaseClient || !supabaseSession?.user) {
    throw new Error('Not signed in.');
  }

  const normalizedName = normalizeModelName(fallbackName || file.name.replace(/\.glb$/i, '') || 'Uploaded Model');
  const storagePath = `${supabaseSession.user.id}/${Date.now()}-${toFileSlug(file.name)}-${randomSuffix()}.glb`;

  const { error: uploadError } = await supabaseClient.storage.from(supabaseBucket).upload(storagePath, file, {
    cacheControl: '3600',
    contentType: 'model/gltf-binary',
    upsert: false
  });

  if (uploadError) {
    throw uploadError;
  }

  const insertPayload = {
    name: normalizedName,
    storage_path: storagePath,
    original_file_name: file.name
  };

  const uploaderEmail = getSessionUsername(supabaseSession);
  if (supabaseSupportsUploaderEmail !== false && uploaderEmail) {
    insertPayload.uploaded_by_email = uploaderEmail;
  }

  let { data, error: insertError } = await supabaseClient
    .from(supabaseModelsTable)
    .insert(insertPayload)
    .select('*')
    .limit(1)
    .single();

  if (
    insertError &&
    Object.prototype.hasOwnProperty.call(insertPayload, 'uploaded_by_email') &&
    isMissingSupabaseColumn(insertError, 'uploaded_by_email')
  ) {
    supabaseSupportsUploaderEmail = false;
    delete insertPayload.uploaded_by_email;
    ({ data, error: insertError } = await supabaseClient
      .from(supabaseModelsTable)
      .insert(insertPayload)
      .select('*')
      .limit(1)
      .single());
  }

  if (insertError) {
    await supabaseClient.storage.from(supabaseBucket).remove([storagePath]);
    throw insertError;
  }

  if (supabaseSupportsUploaderEmail === null) {
    supabaseSupportsUploaderEmail = true;
  }

  return mapSupabaseRowToModel(data);
}

async function renameModelInLocalApi(modelId, nextName) {
  const response = await fetch(`/api/models/${encodeURIComponent(modelId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: nextName })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiError(payload, response.status));
  }

  return payload.model;
}

async function renameModelInSupabase(modelId, nextName) {
  if (!supabaseClient || !supabaseSession?.user) {
    throw new Error('Not signed in.');
  }

  const { data, error } = await supabaseClient
    .from(supabaseModelsTable)
    .update({ name: nextName })
    .eq('id', modelId)
    .select('*')
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  return mapSupabaseRowToModel(data);
}

async function deleteModelInLocalApi(modelId) {
  const response = await fetch(`/api/models/${encodeURIComponent(modelId)}`, {
    method: 'DELETE'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiError(payload, response.status));
  }
}

async function deleteModelInSupabase(model) {
  if (!supabaseClient || !supabaseSession?.user) {
    throw new Error('Not signed in.');
  }

  const { error: rowError } = await supabaseClient.from(supabaseModelsTable).delete().eq('id', model.id);
  if (rowError) {
    throw rowError;
  }

  if (model.storagePath) {
    const { error: removeError } = await supabaseClient.storage.from(supabaseBucket).remove([model.storagePath]);
    if (removeError) {
      console.warn('Storage cleanup warning:', removeError.message);
    }
  }
}

async function uploadModel(file) {
  const isCloudSessionMissing = providerMode === 'supabase' && !supabaseSession?.user;
  if (isCloudSessionMissing) {
    setFeedback('authRequired');
    return;
  }

  if (!isGlbFile(file)) {
    setFeedback('invalidFileType');
    return;
  }

  const maxMb = maxUploadBytes / (1024 * 1024);
  if (file.size > maxUploadBytes) {
    setFeedback('uploadTooLarge', maxMb);
    return;
  }

  setFeedback('uploadInProgress');

  try {
    const fallbackName = file.name.replace(/\.glb$/i, '') || 'Uploaded Model';
    const createdModel =
      providerMode === 'supabase'
        ? await uploadModelToSupabase(file, fallbackName)
        : await uploadModelToLocalApi(file, fallbackName);

    await refreshModelLibrary();

    if (createdModel?.id && availableModels.some((model) => model.id === createdModel.id)) {
      selectedModelId = createdModel.id;
      renderModelOptions();
      syncModelActions();
      updateUrlState();

      const selectedModel = getModelById(selectedModelId);
      if (selectedModel) {
        await loadModel(selectedModel);
      }
    }

    setFeedback('uploadSuccess', createdModel?.name || fallbackName);
  } catch (error) {
    console.error(error);
    setFeedback('uploadFail', error.message || 'Unknown error');
  } finally {
    if (modelFileInput) {
      modelFileInput.value = '';
    }
  }
}

async function renameSelectedModel() {
  const selectedModel = getModelById(selectedModelId);
  if (!selectedModel || isDefaultModel(selectedModel)) {
    setFeedback('renameDefaultBlocked');
    return;
  }

  const nextName = normalizeModelName(modelNameInput ? modelNameInput.value : '');
  if (!nextName) {
    setFeedback('renameEmptyName');
    return;
  }

  setFeedback('renameInProgress');

  try {
    const renamedModel =
      providerMode === 'supabase'
        ? await renameModelInSupabase(selectedModel.id, nextName)
        : await renameModelInLocalApi(selectedModel.id, nextName);

    await refreshModelLibrary();

    selectedModelId = renamedModel?.id || selectedModel.id;
    renderModelOptions();
    syncModelActions();
    updateUrlState();

    const refreshedModel = getModelById(selectedModelId);
    if (refreshedModel && activeModelId === refreshedModel.id) {
      setStatus('checkpoint3Success', getModelDisplayName(refreshedModel));
    }

    setFeedback('renameSuccess', renamedModel?.name || nextName);
  } catch (error) {
    console.error(error);
    setFeedback('renameFail', error.message || 'Unknown error');
  }
}

async function deleteSelectedModel() {
  const selectedModel = getModelById(selectedModelId);
  if (!selectedModel || isDefaultModel(selectedModel)) {
    setFeedback('deleteDefaultBlocked');
    return;
  }

  const displayName = getModelDisplayName(selectedModel);
  const confirmed = window.confirm(i18n[currentLang].deleteConfirm(displayName));
  if (!confirmed) {
    return;
  }

  setFeedback('deleteInProgress');

  const deletedId = selectedModel.id;
  const deletedWasActive = activeModelId === deletedId;

  try {
    if (providerMode === 'supabase') {
      await deleteModelInSupabase(selectedModel);
    } else {
      await deleteModelInLocalApi(selectedModel.id);
    }

    await refreshModelLibrary();

    if (selectedModelId === deletedId || !availableModels.some((model) => model.id === selectedModelId)) {
      selectedModelId = defaultModelId;
    }

    renderModelOptions();
    syncModelActions();
    updateUrlState();

    if (deletedWasActive) {
      const fallbackModel = getModelById(selectedModelId) || defaultModel;
      await loadModel(fallbackModel);
    }

    setFeedback('deleteSuccess', displayName);
  } catch (error) {
    console.error(error);
    setFeedback('deleteFail', error.message || 'Unknown error');
  }
}

function getAuthCredentials() {
  const username = normalizeUsername(authUsernameInput?.value || '');
  const password = authPasswordInput?.value || '';
  const email = username;

  return { username, password, email };
}

function validateAuthCredentials({ username, password }) {
  if (!username) {
    setFeedback('authUsernameMissing');
    return false;
  }

  if (!isValidUsername(username)) {
    setFeedback('authUsernameInvalid');
    return false;
  }

  if (!password) {
    setFeedback('authPasswordMissing');
    return false;
  }

  if (password.length < minPasswordLength) {
    setFeedback('authPasswordTooShort', minPasswordLength);
    return false;
  }

  return true;
}

async function signInWithSupabasePassword() {
  if (!supabaseClient) return;

  const credentials = getAuthCredentials();
  if (!validateAuthCredentials(credentials)) {
    return;
  }

  setFeedback('authSignInInProgress');

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (error) {
      throw error;
    }

    setFeedback('authSignInSuccess');
  } catch (error) {
    console.error(error);
    setFeedback('authSignInFail', error.message || 'Unknown error');
  }
}

async function signUpWithSupabasePassword() {
  if (!supabaseClient) return;

  const credentials = getAuthCredentials();
  if (!validateAuthCredentials(credentials)) {
    return;
  }

  setFeedback('authSignUpInProgress');

  try {
    const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const localPart = credentials.email.split('@')[0] || credentials.email;
    const { data, error } = await supabaseClient.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          username: localPart
        }
      }
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      setFeedback('authSignUpNeedsVerification');
      return;
    }

    setFeedback('authSignUpSuccess');
  } catch (error) {
    console.error(error);
    setFeedback('authSignUpFail', error.message || 'Unknown error');
  }
}

async function signOutFromSupabase() {
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (error) {
      throw error;
    }

    setFeedback('authSignOutSuccess');
  } catch (error) {
    console.error(error);
    setFeedback('authSignOutFail', error.message || 'Unknown error');
  }
}

async function handleSupabaseSession(session) {
  supabaseSession = session;
  updateAuthUi();

  await refreshModelLibrary();

  if (!availableModels.some((model) => model.id === selectedModelId)) {
    selectedModelId = defaultModelId;
  }

  renderModelOptions();
  syncModelActions();
  updateUrlState();

  const selectedModel = getModelById(selectedModelId) || defaultModel;
  await loadModel(selectedModel);
}

applyLanguage();
setStatus('loading');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0f16');
scene.fog = new THREE.Fog(0x0b0f16, 12, 26);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2.5, 1.2, 4);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.8, 0);
controls.maxDistance = 9;
controls.minDistance = 2.2;
controls.maxPolarAngle = Math.PI * 0.48;

const hemiLight = new THREE.HemisphereLight(0xdbe8ff, 0x0b1019, 0.55);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff5eb, 1.35);
keyLight.position.set(4.5, 6, 2.8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 20;
keyLight.shadow.camera.left = -5;
keyLight.shadow.camera.right = 5;
keyLight.shadow.camera.top = 5;
keyLight.shadow.camera.bottom = -5;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xa8c4ff, 0.65);
fillLight.position.set(-5, 3.2, -2.2);
scene.add(fillLight);

const rimLight = new THREE.SpotLight(0x9ec6ff, 1.3, 22, Math.PI / 7, 0.45, 1.4);
rimLight.position.set(0, 4.5, -5.8);
rimLight.target.position.set(0, 1, 0);
scene.add(rimLight, rimLight.target);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(10, 80),
  new THREE.MeshStandardMaterial({ color: '#171d28', roughness: 0.92, metalness: 0.1 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(1.9, 2.05, 0.22, 80),
  new THREE.MeshStandardMaterial({
    color: '#2f3644',
    roughness: 0.32,
    metalness: 0.5
  })
);
platform.position.y = 0.11;
platform.receiveShadow = true;
scene.add(platform);

const platformTop = new THREE.Mesh(
  new THREE.CylinderGeometry(1.76, 1.76, 0.03, 80),
  new THREE.MeshStandardMaterial({
    color: '#8d949f',
    roughness: 0.22,
    metalness: 0.78
  })
);
platformTop.position.y = 0.235;
platformTop.receiveShadow = true;
scene.add(platformTop);

const backdrop = new THREE.Mesh(
  new THREE.CylinderGeometry(8, 8, 6, 72, 1, true, Math.PI * 0.2, Math.PI * 0.6),
  new THREE.MeshStandardMaterial({
    color: '#0f1520',
    metalness: 0.25,
    roughness: 0.65,
    side: THREE.BackSide
  })
);
backdrop.position.set(0, 2.8, -3.1);
scene.add(backdrop);

const turntableGroup = new THREE.Group();
turntableGroup.position.y = 0.235;
scene.add(turntableGroup);

const loader = new GLTFLoader();

if (langToggle) {
  langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'lt' : 'en';
    applyLanguage();
    updateUrlState();
  });
}

if (modelSelect) {
  modelSelect.addEventListener('change', async (event) => {
    selectedModelId = event.target.value;
    updateUrlState();
    syncModelActions();

    const model = getModelById(selectedModelId);
    if (model) {
      await loadModel(model);
    }
  });
}

if (uploadForm) {
  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!uploadApiAvailable) {
      setFeedback(providerMode === 'supabase' ? 'authRequired' : 'uploadUnavailable');
      return;
    }

    const file = modelFileInput?.files?.[0];
    if (!file) {
      setFeedback('noFileSelected');
      return;
    }

    await uploadModel(file);
  });
}

if (renameForm) {
  renameForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await renameSelectedModel();
  });
}

if (deleteButton) {
  deleteButton.addEventListener('click', async () => {
    await deleteSelectedModel();
  });
}

if (authForm) {
  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await signInWithSupabasePassword();
  });
}

if (authSignUpButton) {
  authSignUpButton.addEventListener('click', async () => {
    await signUpWithSupabasePassword();
  });
}

if (authSignOutButton) {
  authSignOutButton.addEventListener('click', async () => {
    await signOutFromSupabase();
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

async function initializeSupabaseAuth() {
  if (!supabaseClient) {
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.warn('Could not read Supabase auth session:', error.message);
  }

  supabaseSession = data?.session || null;
  updateAuthUi();

  supabaseClient.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      handleSupabaseSession(session).catch((authError) => {
        console.error(authError);
      });
    }, 0);
  });
}

async function initializeModels() {
  if (supabaseConfigured) {
    await initializeSupabaseAuth();
  }

  await refreshModelLibrary();

  if (!availableModels.some((model) => model.id === selectedModelId)) {
    selectedModelId = defaultModelId;
  }

  renderModelOptions();
  syncModelActions();
  updateUrlState();

  const selectedModel = getModelById(selectedModelId) || defaultModel;
  await loadModel(selectedModel);
}

function animate() {
  turntableGroup.rotation.y += 0.0035;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

await initializeModels();
animate();
setStatus('checkpoint4');
