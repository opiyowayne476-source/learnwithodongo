// ===== LEARNWITHODONGO — main.js =====
// Shared utilities used across all pages

// ── Sidebar ──────────────────────────────────────────────
const sidebar  = document.getElementById('sidebar');
const overlay  = document.getElementById('sidebar-overlay');
const menuBtn  = document.getElementById('menu-btn');
const closeBtn = document.getElementById('sidebar-close');

function openSidebar()  {
  sidebar.classList.add('open');
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}

if (menuBtn)  menuBtn.addEventListener('click',  openSidebar);
if (closeBtn) closeBtn.addEventListener('click',  closeSidebar);
if (overlay)  overlay.addEventListener('click',  closeSidebar);

// Highlight active nav link
document.querySelectorAll('.sidebar-nav a').forEach(link => {
  if (link.href === window.location.href) link.classList.add('active');
});

// ── Toast notifications ──────────────────────────────────
function showToast(msg, duration = 3000) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Supabase config ───────────────────────────────────────
const SUPABASE_URL = 'https://lbtpidkuqdeechglltzf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidHBpZGt1cWRlZWNoZ2xsdHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjIyMDgsImV4cCI6MjA5NzQzODIwOH0.5BJPGNlmPsPUFIt9Xz5JcYeKJ0M5han9lmWhdbkcFKc';

// ── Supabase REST API helper ─────────────────────────────
async function sbFetch(path, options = {}) {
  const url = SUPABASE_URL + '/rest/v1/' + path;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    let errMsg;
    try { errMsg = JSON.parse(text).message; } catch { errMsg = text || res.statusText; }
    throw new Error(errMsg);
  }
  return options.method === 'DELETE' ? null : res.json();
}

// Load profile picture from Supabase
async function loadProfilePicture() {
  try {
    // You can store the profile URL in a settings table or just use a direct URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/profile/profile-pic.jpg`;
    
    // Check if it exists
    const res = await fetch(publicUrl, { method: 'HEAD' });
    if (res.ok) {
      document.getElementById('profile-pic').src = publicUrl;
      document.getElementById('profile-pic').style.display = 'block';
      document.getElementById('profile-placeholder').style.display = 'none';
    }
  } catch(e) {
    console.log('No profile picture set');
  }
}

// Profile picture upload function
async function uploadProfilePic() {
  const file = document.getElementById('profile-file').files[0];
  const status = document.getElementById('profile-upload-status');
  
  if (!file) { alert('Please choose a picture.'); return; }
  if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
  
  status.textContent = 'Uploading…';
  try {
    const path = `profile-pic.jpg`; // Fixed name so it overwrites
    const url = await uploadToStorage('profile', file, path);
    status.textContent = '✅ Profile picture uploaded!';
    setTimeout(() => status.textContent = '', 3000);
    
    // Refresh the page to show new pic
    setTimeout(() => location.reload(), 1000);
  } catch(e) {
    status.textContent = '❌ Error: ' + e.message;
    console.error(e);
  }
}

// ── FILE UPLOAD TO SUPABASE STORAGE (FIXED) ──────────────
async function uploadToStorage(bucket, file, path) {
  if (!file) throw new Error('No file selected');
  
  // Ensure path doesn't have double slashes
  const cleanPath = path.replace(/^\/+/, '');
  const bucketUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${cleanPath}`;
  
  console.log('Uploading to:', bucketUrl);
  console.log('File:', file.name, file.type, file.size);
  
  try {
    const res = await fetch(bucketUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        // Don't set Content-Type here - let browser set it with FormData
      },
      body: file // Send raw file
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error('Upload response:', text);
      
      if (res.status === 400) {
        // Try alternative upload method using FormData
        console.log('Trying alternative upload method...');
        return await uploadToStorageAlternative(bucket, file, cleanPath);
      }
      
      if (res.status === 404) {
        throw new Error(`Bucket "${bucket}" not found. Please create it in Supabase Dashboard → Storage.`);
      }
      if (res.status === 403) {
        throw new Error(`Access denied. Make sure the bucket "${bucket}" is public.`);
      }
      throw new Error(`Upload failed (${res.status}): ${text}`);
    }
    
    const result = await res.json();
    console.log('Upload success:', result);
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
    
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// ── ALTERNATIVE UPLOAD METHOD (Using FormData) ──────────
async function uploadToStorageAlternative(bucket, file, path) {
  const formData = new FormData();
  formData.append('file', file);
  
  const bucketUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  
  const res = await fetch(bucketUrl, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
    body: formData
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ── PROFILE PICTURE ────────────────────────────────────────
async function loadProfilePicture() {
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/public/profile/profile-pic.jpg`;
    // Check if it exists
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) {
      document.getElementById('profile-preview-img').src = url + '?t=' + Date.now();
      document.getElementById('profile-preview-img').style.display = 'block';
      document.getElementById('profile-preview-placeholder').style.display = 'none';
    }
  } catch(e) {
    console.log('No profile picture found');
  }
}

function previewProfilePic(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('profile-preview-img').src = e.target.result;
    document.getElementById('profile-preview-img').style.display = 'block';
    document.getElementById('profile-preview-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function uploadProfilePic() {
  const file = document.getElementById('profile-file').files[0];
  const status = document.getElementById('profile-upload-status');
  
  if (!file) { alert('Please choose a picture.'); return; }
  if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
  
  status.textContent = 'Uploading…';
  try {
    const path = 'profile-pic.jpg'; // Fixed name to overwrite
    const url = await uploadToStorage('profile', file, path);
    status.textContent = '✅ Profile picture uploaded!';
    status.style.color = 'var(--teal)';
    
    // Update preview
    document.getElementById('profile-preview-img').src = url + '?t=' + Date.now();
    document.getElementById('profile-preview-img').style.display = 'block';
    document.getElementById('profile-preview-placeholder').style.display = 'none';
    
    setTimeout(() => {
      status.textContent = '';
      status.style.color = '';
    }, 3000);
  } catch(e) {
    status.textContent = '❌ Error: ' + e.message;
    status.style.color = 'var(--danger)';
    console.error(e);
  }
}

async function saveProfile() {
  const name = document.getElementById('profile-name').value.trim();
  const role = document.getElementById('profile-role').value.trim();
  const bio = document.getElementById('profile-bio').value.trim();
  const status = document.getElementById('profile-save-status');
  
  if (!name) { alert('Name is required.'); return; }
  
  status.textContent = 'Saving…';
  try {
    // Save to a settings table (create this if needed)
    // For simplicity, we'll store in localStorage for now
    const profileData = { name, role, bio };
    localStorage.setItem('profile_data', JSON.stringify(profileData));
    
    status.textContent = '✅ Profile saved!';
    status.style.color = 'var(--teal)';
    setTimeout(() => {
      status.textContent = '';
      status.style.color = '';
    }, 3000);
  } catch(e) {
    status.textContent = '❌ Error: ' + e.message;
    status.style.color = 'var(--danger)';
  }
}

// ── CORS Helper for Supabase Storage ─────────────────────
// Add this to enable CORS (run once in Supabase SQL Editor)
/*
-- Enable Row Level Security for all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access" ON documents FOR SELECT USING (true);
CREATE POLICY "Public read access" ON articles FOR SELECT USING (true);
CREATE POLICY "Public read access" ON tutorials FOR SELECT USING (true);
CREATE POLICY "Public read access" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON quiz_questions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON question_papers FOR SELECT USING (true);

-- Allow insert/update/delete for authenticated users (admin)
-- You can also allow all for simplicity during development
CREATE POLICY "Allow all" ON documents FOR ALL USING (true);
CREATE POLICY "Allow all" ON articles FOR ALL USING (true);
CREATE POLICY "Allow all" ON tutorials FOR ALL USING (true);
CREATE POLICY "Allow all" ON quizzes FOR ALL USING (true);
CREATE POLICY "Allow all" ON quiz_questions FOR ALL USING (true);
CREATE POLICY "Allow all" ON question_papers FOR ALL USING (true);
*/