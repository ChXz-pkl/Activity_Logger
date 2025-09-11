// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  where,
  getDocs,
  enableIndexedDbPersistence,
  Timestamp,
  setDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBellkuYYMVFULmdBb8zPJ6CcwZOywpQyw",
  authDomain: "activity-logger-8576d.firebaseapp.com",
  projectId: "activity-logger-8576d",
  storageBucket: "activity-logger-8576d.appspot.com",
  messagingSenderId: "841728671208",
  appId: "1:841728671208:web:abc88d3a9593b7453c385d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// === DOM ELEMENTS ===
const landingPage = document.getElementById("landing-page");
const tombolMulai = document.getElementById("tombol-mulai");
const loginOverlay = document.getElementById("login-overlay");
const appContainer = document.getElementById("app-container");
const inputEmail = document.getElementById("input-email");
const inputPassword = document.getElementById("input-password");
const tombolLogin = document.getElementById("tombol-login");
const tombolDaftar = document.getElementById("tombol-daftar");
const tombolLoginGoogle = document.getElementById("tombol-login-google");
const tombolLogout = document.getElementById("tombol-logout");
const authErrorElement = document.getElementById("auth-error");
const namaUserElement = document.getElementById("nama-user");
const tombolEditNama = document.getElementById("tombol-edit-nama");
const tombolPengaturan = document.getElementById("tombol-pengaturan");
const pengaturanOverlay = document.getElementById("pengaturan-overlay");
const tombolTutupPengaturan = document.getElementById(
  "tombol-tutup-pengaturan"
);
const checkTampilTimer = document.getElementById("pengaturan-tampil-timer");
const grupTombolUkuran = document.querySelectorAll(".pengaturan-ukuran-tombol");
const inputWarnaTimer = document.getElementById("pengaturan-warna-timer");
const tanggalHariIniElement = document.getElementById("tanggal-hari-ini");
const tombolHariSebelumnya = document.getElementById("tombol-hari-sebelumnya");
const tombolHariBerikutnya = document.getElementById("tombol-hari-berikutnya");
const inputProyek = document.getElementById("input-proyek");
const pilihProyekInduk = document.getElementById("pilih-proyek-induk");
const tombolTambahProyek = document.getElementById("tombol-tambah-proyek");
const inputKegiatan = document.getElementById("input-kegiatan");
const inputWaktu = document.getElementById("input-waktu");
const inputKategori = document.getElementById("input-kategori");
const pilihProyekKegiatan = document.getElementById("pilih-proyek-kegiatan");
const tombolTambah = document.getElementById("tombol-tambah");
const daftarProyekContainer = document.getElementById(
  "daftar-proyek-container"
);
const daftarKegiatanLainElement = document.getElementById(
  "daftar-kegiatan-lain"
);
const loadingElement = document.getElementById("loading");
const pesanKosongElement = document.getElementById("pesan-kosong");
const tombolGenerate = document.getElementById("tombol-generate-teks");
const tombolSalin = document.getElementById("tombol-salin-teks");
const hasilTeks = document.getElementById("hasil-teks");
const statistikChartCanvas = document
  .getElementById("statistik-chart")
  .getContext("2d");
const kontenStatistikTeks = document.getElementById("konten-statistik-teks");
const customAlertOverlay = document.getElementById("custom-alert-overlay");
const customAlertBox = document.getElementById("custom-alert-box");
const customAlertTitle = document.getElementById("custom-alert-title");
const customAlertMessage = document.getElementById("custom-alert-message");
const customPromptInputContainer = document.getElementById(
  "custom-prompt-input-container"
);
const customAlertButtons = document.getElementById("custom-alert-buttons");

// === APP STATE ===
let currentUser = null;
let userProfile = {};
let allActivities = [];
let daftarProyek = [];
let timerInterval = null;
let statistikChart = null;
let unsubscribeProfile = () => {};
let unsubscribeProjects = () => { }; 
let unsubscribeActivities = () => {};
let currentDate = new Date();
let eventListenersAttached = false;
let sortableInstances = [];

let pengaturan = {};
const pengaturanDefault = {
  tampilTimer: true,
  ukuranTimer: "normal",
  warnaTimer: "#334155", // slate-700
};
// === DARK MODE SETUP ===
function setupDarkMode() {
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  const lightIcon = document.getElementById("theme-toggle-light-icon");
  const darkIcon = document.getElementById("theme-toggle-dark-icon");
  if (!darkModeToggle || !lightIcon || !darkIcon) return;

  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      lightIcon.classList.remove("hidden");
      darkIcon.classList.add("hidden");
    } else {
      document.documentElement.classList.remove("dark");
      lightIcon.classList.add("hidden");
      darkIcon.classList.remove("hidden");
    }
  };

  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDarkMode =
    savedTheme === "dark" || (savedTheme === null && prefersDark);
  applyTheme(isDarkMode);

  darkModeToggle.addEventListener("click", () => {
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    applyTheme(!isCurrentlyDark);
    localStorage.setItem("theme", isCurrentlyDark ? "light" : "dark");
  });
}

setupDarkMode();

// --- Main function to run the application ---
function runApp() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      landingPage.style.display = "none";
      loginOverlay.style.display = "none";
      appContainer.classList.remove("hidden");
      setupAplikasi();
    } else {
      currentUser = null;
      userProfile = {};
      landingPage.style.display = "flex";
      loginOverlay.style.display = "none";
      appContainer.classList.add("hidden");
      unsubscribeAll();
      allActivities = [];
      daftarProyek = [];
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  });

  tombolMulai.addEventListener("click", () => {
    landingPage.style.display = "none";
    loginOverlay.style.display = "flex";
  });

  tombolLogin.addEventListener("click", () =>
    signInWithEmailAndPassword(
      auth,
      inputEmail.value,
      inputPassword.value
    ).catch(handleAuthError)
  );
  tombolDaftar.addEventListener("click", () =>
    createUserWithEmailAndPassword(
      auth,
      inputEmail.value,
      inputPassword.value
    ).catch(handleAuthError)
  );
  tombolLoginGoogle.addEventListener("click", () =>
    signInWithPopup(auth, new GoogleAuthProvider()).catch(handleAuthError)
  );
  tombolLogout.addEventListener("click", () =>
    signOut(auth).catch(handleAuthError)
  );
  tombolEditNama.addEventListener("click", ubahNamaTampilan);
}

function handleAuthError(error) {
  authErrorElement.textContent =
    "Email atau password salah atau sudah terdaftar.";
  console.error("Authentication Error:", error);
}

function setupAplikasi() {
  if (!eventListenersAttached) {
    setupAppEventListeners();
    eventListenersAttached = true;
  }
  muatPengaturan();
  loadInitialDataAndSetupListeners();
  setTanggal(new Date());
  if (!timerInterval) {
    timerInterval = setInterval(timerLoop, 1000);
  }
  requestNotificationPermission();
}

function setupAppEventListeners() {
  tombolTambahProyek.addEventListener("click", tambahProyek);
  tombolTambah.addEventListener("click", tambahKegiatan);
  daftarProyekContainer.addEventListener("click", handleListClick);
  daftarKegiatanLainElement.addEventListener("click", handleListClick);
  tombolGenerate.addEventListener("click", generateTeks);
  tombolSalin.addEventListener("click", () => salinTeks("hasil-teks"));
  tombolHariSebelumnya.addEventListener("click", () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setTanggal(newDate);
  });
  tombolHariBerikutnya.addEventListener("click", () => {
    if (!isToday(currentDate)) {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setTanggal(newDate);
    }
  });
  inputProyek.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tambahProyek();
  });
  inputKegiatan.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      inputWaktu.focus();
    }
  });
  inputWaktu.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tambahKegiatan();
  });
  tombolPengaturan.addEventListener("click", bukaPengaturan);
  tombolTutupPengaturan.addEventListener("click", tutupPengaturan);
  pengaturanOverlay.addEventListener("click", (e) => {
    if (e.target === pengaturanOverlay) tutupPengaturan();
  });
  checkTampilTimer.addEventListener("change", (e) =>
    ubahPengaturan("tampilTimer", e.target.checked)
  );
  inputWarnaTimer.addEventListener("input", (e) =>
    ubahPengaturan("warnaTimer", e.target.value)
  );
  grupTombolUkuran.forEach((tombol) => {
    tombol.addEventListener("click", () =>
      ubahPengaturan("ukuranTimer", tombol.dataset.ukuran)
    );
  });
}

function unsubscribeAll() {
  unsubscribeProfile();
  unsubscribeProjects()
  unsubscribeActivities();
}

function showCustomAlert(message, title = "Notifikasi") {
  customPromptInputContainer.innerHTML = "";
  customAlertTitle.textContent = title;
  customAlertMessage.textContent = message;
  customAlertButtons.innerHTML = `<button id="custom-alert-ok" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">OK</button>`;
  customAlertOverlay.classList.remove("hidden");
  setTimeout(() => customAlertBox.classList.add("visible"), 10);
  return new Promise((resolve) => {
    document.getElementById("custom-alert-ok").onclick = () => {
      customAlertBox.classList.remove("visible");
      setTimeout(() => customAlertOverlay.classList.add("hidden"), 200);
      resolve(true);
    };
  });
}

function showCustomConfirm(
  message,
  title = "Konfirmasi",
  okText = "Yakin",
  cancelText = "Batal"
) {
  customPromptInputContainer.innerHTML = "";
  customAlertTitle.textContent = title;
  customAlertMessage.textContent = message;
  customAlertButtons.innerHTML = `<button id="custom-confirm-cancel" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg">${cancelText}</button><button id="custom-confirm-ok" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">${okText}</button>`;
  customAlertOverlay.classList.remove("hidden");
  setTimeout(() => customAlertBox.classList.add("visible"), 10);
  return new Promise((resolve) => {
    document.getElementById("custom-confirm-ok").onclick = () => {
      customAlertBox.classList.remove("visible");
      setTimeout(() => customAlertOverlay.classList.add("hidden"), 200);
      resolve(true);
    };
    document.getElementById("custom-confirm-cancel").onclick = () => {
      customAlertBox.classList.remove("visible");
      setTimeout(() => customAlertOverlay.classList.add("hidden"), 200);
      resolve(false);
    };
  });
}

function showCustomPrompt(message, title = "Input", defaultValue = "") {
  customAlertTitle.textContent = title;
  customAlertMessage.textContent = message;
  customPromptInputContainer.innerHTML = `<input type="text" id="custom-prompt-input" value="${defaultValue}" class="mt-2 w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">`;
  customAlertButtons.innerHTML = `<button id="custom-prompt-cancel" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg">Batal</button><button id="custom-prompt-ok" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Simpan</button>`;
  customAlertOverlay.classList.remove("hidden");
  setTimeout(() => {
    customAlertBox.classList.add("visible");
    document.getElementById("custom-prompt-input").focus();
  }, 10);
  return new Promise((resolve) => {
    const okBtn = document.getElementById("custom-prompt-ok");
    const cancelBtn = document.getElementById("custom-prompt-cancel");
    const input = document.getElementById("custom-prompt-input");
    const close = (value) => {
      customAlertBox.classList.remove("visible");
      setTimeout(() => {
        customAlertOverlay.classList.add("hidden");
        customPromptInputContainer.innerHTML = "";
      }, 200);
      resolve(value);
    };
    okBtn.onclick = () => close(input.value);
    cancelBtn.onclick = () => close(null);
    input.onkeydown = (e) => {
      if (e.key === "Enter") okBtn.click();
    };
  });
}

function showAddActivityPrompt(message, title = "Input") {
  customAlertTitle.textContent = title;
  customAlertMessage.textContent = message;

  const categories = [
    "Pekerjaan",
    "Belajar",
    "Pribadi",
    "Istirahat",
    "Lainnya",
  ];
  const categoryOptions = categories
    .map((cat) => `<option value="${cat}">${cat}</option>`)
    .join("");

  customPromptInputContainer.innerHTML = `
        <div class="space-y-3 text-left">
            <input type="text" id="custom-prompt-input-text" placeholder="Nama kegiatan..." class="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
            <select id="custom-prompt-input-category" class="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                ${categoryOptions}
            </select>
        </div>
    `;

  customAlertButtons.innerHTML = `<button id="custom-prompt-cancel" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg">Batal</button><button id="custom-prompt-ok" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Simpan</button>`;

  customAlertOverlay.classList.remove("hidden");
  setTimeout(() => {
    customAlertBox.classList.add("visible");
    document.getElementById("custom-prompt-input-text").focus();
  }, 10);

  return new Promise((resolve) => {
    const okBtn = document.getElementById("custom-prompt-ok");
    const cancelBtn = document.getElementById("custom-prompt-cancel");
    const textInput = document.getElementById("custom-prompt-input-text");
    const categoryInput = document.getElementById(
      "custom-prompt-input-category"
    );

    const close = (value) => {
      customAlertBox.classList.remove("visible");
      setTimeout(() => {
        customAlertOverlay.classList.add("hidden");
        customPromptInputContainer.innerHTML = "";
      }, 200);
      resolve(value);
    };

    okBtn.onclick = () => {
      if (textInput.value.trim()) {
        close({ text: textInput.value.trim(), category: categoryInput.value });
      } else {
        close(null);
      }
    };
    cancelBtn.onclick = () => close(null);
    textInput.onkeydown = (e) => {
      if (e.key === "Enter") okBtn.click();
    };
  });
}

function muatPengaturan() {
  const pengaturanTersimpan = localStorage.getItem("activityLoggerSettings");
  pengaturan = pengaturanTersimpan
    ? JSON.parse(pengaturanTersimpan)
    : { ...pengaturanDefault };

  // Pastikan semua properti ada, jika tidak tambahkan dari default
  Object.keys(pengaturanDefault).forEach((key) => {
    if (pengaturan[key] === undefined) {
      pengaturan[key] = pengaturanDefault[key];
    }
  });
}

/** Menyimpan objek pengaturan ke localStorage */
function simpanPengaturan() {
  localStorage.setItem("activityLoggerSettings", JSON.stringify(pengaturan));
}

/** Memperbarui satu nilai pengaturan, menyimpan, dan me-render ulang UI */
function ubahPengaturan(key, value) {
  pengaturan[key] = value;
  simpanPengaturan();
  perbaruiTampilanPengaturan();
  renderDaftarUtama(); // Render ulang daftar untuk menerapkan perubahan
}

/** Memperbarui tampilan di dalam panel pengaturan sesuai state saat ini */
function perbaruiTampilanPengaturan() {
  checkTampilTimer.checked = pengaturan.tampilTimer;
  inputWarnaTimer.value = pengaturan.warnaTimer;

  const warnaAktif = "bg-blue-600 text-white";
  const warnaNonaktif =
    "bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200";

  grupTombolUkuran.forEach((tombol) => {
    if (tombol.dataset.ukuran === pengaturan.ukuranTimer) {
      tombol.className = `pengaturan-ukuran-tombol px-3 py-1 text-sm rounded-md ${warnaAktif}`;
    } else {
      tombol.className = `pengaturan-ukuran-tombol px-3 py-1 text-sm rounded-md ${warnaNonaktif}`;
    }
  });
}

/** Menampilkan panel pengaturan */
function bukaPengaturan() {
  perbaruiTampilanPengaturan();
  pengaturanOverlay.classList.remove("hidden");
  pengaturanOverlay.classList.add("flex");
}

/** Menyembunyikan panel pengaturan */
function tutupPengaturan() {
  pengaturanOverlay.classList.add("hidden");
  pengaturanOverlay.classList.remove("flex");
}

/** Mengambil nilai ukuran font berdasarkan pengaturan */
function getUkuranFontTimer(ukuran) {
  switch (ukuran) {
    case "kecil":
      return "0.875rem"; // text-sm
    case "besar":
      return "1.25rem"; // text-xl
    default:
      return "1.125rem"; // text-lg
  }
}

function loadInitialDataAndSetupListeners() {
    if (!currentUser) return;
    unsubscribeAll(); // Kosongkan semua listener sebelumnya

    // 1. Dengarkan perubahan pada profil pengguna
    const profileRef = doc(db, "users", currentUser.uid);
    unsubscribeProfile = onSnapshot(profileRef, (docSnapshot) => {
        userProfile = docSnapshot.data() || {};
        namaUserElement.textContent = userProfile.customName || currentUser.displayName || currentUser.email.split('@')[0];
    });

    // 2. Dengarkan perubahan pada daftar proyek (menggunakan onSnapshot)
    const projectsQuery = query(collection(db, "users", currentUser.uid, "projects"), orderBy("order", "asc"));
    unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
        console.log("Data proyek berhasil dimuat (dari cache atau server).");
        daftarProyek = snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }));
        renderProyekDropdowns();
        renderDaftarUtama(); // Render ulang daftar utama setiap kali ada perubahan proyek
    }, (error) => {
        console.error("Gagal memuat data proyek:", error);
        showCustomAlert("Gagal memuat data proyek. Coba periksa koneksi.", "Error");
    });
    
    // 3. Listener untuk kegiatan akan dipanggil oleh fungsi setTanggal() setelah ini
}
// --- AKHIR PERUBAHAN FUNGSI ---


function setupDailyActivityListener(carryOver = true) {
    if (!currentUser) return;
    unsubscribeActivities();
    allActivities = [];
    renderDaftarUtama();
    loadingElement.style.display = 'block';
    pesanKosongElement.style.display = 'none';

    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    let activitiesQuery;
    if (carryOver) {
        activitiesQuery = query(collection(db, "users", currentUser.uid, "activities"), where("createdAt", "<=", endOfDay), orderBy("createdAt", "desc"));
    } else {
        activitiesQuery = query(collection(db, "users", currentUser.uid, "activities"), where("createdAt", ">=", startOfDay), where("createdAt", "<=", endOfDay), orderBy("createdAt", "desc"));
    }

    unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
        loadingElement.style.display = 'none';
        const fetchedActivities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (carryOver) {
            allActivities = fetchedActivities.filter(activity => {
                const activityDate = activity.createdAt.toDate();
                return !activity.selesai || isSameDay(activityDate, currentDate);
            });
        } else {
            allActivities = fetchedActivities;
        }

        renderDaftarUtama();
        perbaruiStatistik();
    }, (error) => {
        console.error("Gagal mendengarkan perubahan kegiatan:", error);
        loadingElement.style.display = 'none';
    });
}

async function ubahNamaTampilan() {
  const namaSaatIni = userProfile.customName || currentUser.displayName || "";
  const namaBaru = await showCustomPrompt(
    "Masukkan nama tampilan baru:",
    "Ubah Nama",
    namaSaatIni
  );
  if (namaBaru !== null && namaBaru.trim() !== "") {
    await setDoc(
      doc(db, "users", currentUser.uid),
      { customName: namaBaru.trim() },
      { merge: true }
    );
    showCustomAlert("Nama berhasil diperbarui!", "Sukses");
  }
}

async function setTanggal(newDate) {
  const oldDate = new Date(currentDate);
  currentDate = new Date(newDate.setHours(0, 0, 0, 0));

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  tanggalHariIniElement.textContent = currentDate.toLocaleDateString(
    "id-ID",
    options
  );

  const today = isToday(currentDate);
  tombolHariBerikutnya.disabled = today;
  tombolHariBerikutnya.style.opacity = today ? 0.5 : 1;

  let carryOver = true;
  if (currentDate > oldDate && !isToday(currentDate)) {
    const startOfNewDay = new Date(currentDate);
    startOfNewDay.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, "users", currentUser.uid, "activities"),
      where("selesai", "==", false),
      where("createdAt", "<", startOfNewDay)
    );
    const unfinishedSnapshot = await getDocs(q);

    if (!unfinishedSnapshot.empty) {
      const userChoice = await showCustomConfirm(
        "Ada tugas yang belum selesai dari hari sebelumnya. Apakah Anda ingin membawanya ke hari ini?",
        "Bawa Tugas?",
        "Ya, Bawa Tugas",
        "Tidak, Mulai Baru"
      );
      carryOver = userChoice;
    }
  }

  setupDailyActivityListener(carryOver);
}

function isToday(date) {
  const today = new Date();
  return date.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0);
}

function initSortable() {
  sortableInstances.forEach((instance) => instance.destroy());
  sortableInstances = [];

  const projectContainer = document.getElementById("daftar-proyek-container");
  const otherActivitiesContainer = document.getElementById(
    "daftar-kegiatan-lain"
  );
  const subtaskContainers = document.querySelectorAll(".list-subtugas");

  const projectSortableOptions = {
    animation: 150,
    ghostClass: "drag-ghost",
    handle: '.drag-handle', // <-- TAMBAHKAN BARIS INI
    onEnd: (evt) => {
      const itemIds = Array.from(evt.from.children).map(
        (child) => child.dataset.proyekId
      );
      updateOrderInFirestore(itemIds, "projects");
    },
  };

  const activitySortableOptions = {
    animation: 150,
    ghostClass: "drag-ghost",
    group: "shared-activities",
    handle: '.drag-handle', // <-- TAMBAHKAN BARIS INI
    onEnd: async (evt) => {
      const activityId = evt.item.dataset.kegiatanId;
      const fromList = evt.from;
      const toList = evt.to;

      if (fromList !== toList) {
        const newProjectId = toList.dataset.proyekId || null;
        await updateDoc(
          doc(db, "users", currentUser.uid, "activities", activityId),
          {
            proyekId: newProjectId,
          }
        );
      }

      const toItemIds = Array.from(toList.children).map(
        (child) => child.dataset.kegiatanId
      );
      updateOrderInFirestore(toItemIds, "activities");

      if (fromList !== toList) {
        const fromItemIds = Array.from(fromList.children).map(
          (child) => child.dataset.kegiatanId
        );
        updateOrderInFirestore(fromItemIds, "activities");
      }
    },
  };

  if (projectContainer) {
    sortableInstances.push(
      new Sortable(projectContainer, projectSortableOptions)
    );
  }

  if (otherActivitiesContainer) {
    otherActivitiesContainer.dataset.listType = "activities";
    sortableInstances.push(
      new Sortable(otherActivitiesContainer, activitySortableOptions)
    );
  }
  subtaskContainers.forEach((container) => {
    container.dataset.listType = "activities";
    sortableInstances.push(new Sortable(container, activitySortableOptions));
  });
}

async function updateOrderInFirestore(itemIds, listType) {
  if (!currentUser || itemIds.length === 0) return;

  const batch = writeBatch(db);
  const collectionName = listType === "projects" ? "projects" : "activities";
  const baseOrder = Date.now();

  itemIds.forEach((id, index) => {
    if (id) {
      const docRef = doc(db, "users", currentUser.uid, collectionName, id);
      batch.update(docRef, { order: baseOrder + index * 10 });
    }
  });

  try {
    await batch.commit();
  } catch (error) {
    console.error("Gagal memperbarui urutan: ", error);
    showCustomAlert("Gagal menyimpan urutan baru.", "Error");
  }
}

function renderDaftarUtama() {
  if (!currentUser) return;

  const daftarKegiatan = [...allActivities].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  daftarProyekContainer.innerHTML = "";
  daftarKegiatanLainElement.innerHTML = "";
  const projectsById = daftarProyek.reduce(
    (acc, p) => ({ ...acc, [p.id]: { ...p, children: [] } }),
    {}
  );
  const rootProjects = [];
  daftarProyek.forEach((p) => {
    if (p.parentId && projectsById[p.parentId]) {
      if (!projectsById[p.parentId].children)
        projectsById[p.parentId].children = [];
      projectsById[p.parentId].children.push(projectsById[p.id]);
    } else {
      rootProjects.push(projectsById[p.id]);
    }
  });
  rootProjects
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach((proyek) => {
      daftarProyekContainer.appendChild(
        renderProyekRecursive(proyek, daftarKegiatan)
      );
    });

  const kegiatanTanpaProyek = daftarKegiatan.filter((k) => !k.proyekId);
  daftarKegiatanLainElement.dataset.proyekId = "";
  kegiatanTanpaProyek.forEach((kegiatan) => {
    const liKegiatan = buatElemenKegiatan(kegiatan);
    liKegiatan.classList.add(
      "bg-white",
      "dark:bg-slate-800",
      "rounded-xl",
      "shadow-sm",
      "p-4"
    );
    daftarKegiatanLainElement.appendChild(liKegiatan);
  });

  const adaItem = rootProjects.length > 0 || daftarKegiatan.length > 0;
  pesanKosongElement.style.display = adaItem ? "none" : "block";

  initSortable();
}

function renderProyekRecursive(proyek, daftarKegiatan) {
  const subTugasUntukProyekIni = daftarKegiatan.filter(
    (k) => k.proyekId === proyek.id
  );
  const container = document.createElement("div");

  container.appendChild(buatElemenProyek(proyek, subTugasUntukProyekIni));

  if (proyek.children && proyek.children.length > 0) {
    const childrenContainer = document.createElement("div");
    childrenContainer.className = `sub-projects-container ml-5 ${
      proyek.isCollapsed ? "collapsed" : ""
    }`;
    proyek.children
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((child) => {
        childrenContainer.appendChild(
          renderProyekRecursive(child, daftarKegiatan)
        );
      });
    container.appendChild(childrenContainer);
  }
  return container;
}

function buatElemenProyek(proyek, subTugas) {
  const liProyek = document.createElement("div");
  liProyek.className =
    "list-proyek bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden transition-all duration-300 mb-4";
  liProyek.dataset.proyekId = proyek.id;
  const totalDurasiProyekMs = subTugas
    .filter(
      (k) =>
        k.selesai &&
        k.durasi &&
        k.waktuSelesai &&
        isSameDay(k.waktuSelesai.toDate(), currentDate)
    )
    .reduce((total, k) => total + k.durasi, 0);
  liProyek.innerHTML = `
        <div class="p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 judul-proyek-container">
            <div class="flex items-center gap-3 flex-grow" >
                <span class="drag-handle cursor-move text-slate-400 text-xl">⠿</span> <div class="flex items-center gap-3 flex-grow cursor-pointer" data-action="toggle">
                    <span class="toggle-proyek transform transition-transform ${
                      proyek.isCollapsed ? "-rotate-90" : ""
                    }">▼</span>
                    <strong class="text-slate-900 dark:text-white text-lg">${
                      proyek.nama
                    }</strong>
                </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
                <span class="text-sm text-slate-500 dark:text-slate-400 font-medium mr-2">Hari Ini: ${formatDurasi(
                  totalDurasiProyekMs
                )}</span>
                <button title="Tambah Kegiatan" data-action="add-activity" class="text-lg text-green-500 hover:bg-green-100 dark:hover:bg-slate-600 rounded-full w-8 h-8 flex items-center justify-center">+</button>
                <button title="Tambah Sub-Proyek" data-action="add-subproject" class="text-lg text-blue-500 hover:bg-blue-100 dark:hover:bg-slate-600 rounded-full w-8 h-8 flex items-center justify-center">📂</button>
                <button title="Hapus proyek dan semua turunannya" data-action="delete-project" class="text-xl text-red-500 hover:bg-red-100 dark:hover:bg-slate-600 rounded-full w-8 h-8 flex items-center justify-center">&times;</button>
            </div>
        </div>
        <ul class="list-subtugas p-4 pt-0 space-y-2 ${
          proyek.isCollapsed ? "collapsed" : ""
        }" data-proyek-id="${proyek.id}">
            ${subTugas
              .map((k) => buatElemenKegiatan(k, true).outerHTML)
              .join("")}
        </ul>`;
  return liProyek;
}

function buatElemenKegiatan(kegiatan, isSubtugas = false) {
  const li = document.createElement("li");
  li.className = isSubtugas
    ? "flex flex-col gap-2 border-b border-slate-200 dark:border-slate-700 py-3 last:border-b-0 bg-white dark:bg-slate-800 p-2 rounded-lg"
    : "flex flex-col gap-2";
  li.dataset.kegiatanId = kegiatan.id;
  const mainContent = document.createElement("div");
  mainContent.className = "flex justify-between items-start";
  let teksElementHTML;
  if (kegiatan.isEditing) {
    teksElementHTML = `<input type="text" value="${kegiatan.teks.replace(
      /"/g,
      "&quot;"
    )}" class="input-edit-kegiatan flex-grow bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-400 dark:border-yellow-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900 dark:text-white">`;
  } else {
    teksElementHTML = `<span class="text-slate-800 dark:text-slate-200 ${
      kegiatan.selesai ? "line-through text-slate-400 dark:text-slate-500" : ""
    }">${kegiatan.teks}</span>`;
  }
  mainContent.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap flex-grow mr-2">
            <span class="drag-handle cursor-move text-slate-400">⠿</span> ${
              kegiatan.kategori
                ? `<span class="kategori-tag text-xs font-bold px-2 py-1 rounded-full text-white ${getWarnaKategori(
                    kegiatan.kategori
                  )}">${kegiatan.kategori}</span>`
                : ""
            }
            ${teksElementHTML}
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
            <button title="Edit" data-action="edit-activity" class="p-1 text-slate-400 hover:text-blue-600 ${
              kegiatan.isEditing || kegiatan.status === "tracking"
                ? "hidden"
                : ""
            }">✏️</button>
            <button title="Simpan" data-action="save-activity" class="p-1 text-slate-400 hover:text-green-600 ${
              !kegiatan.isEditing ? "hidden" : ""
            }">💾</button>
            <button title="Hapus" data-action="delete-activity" class="p-1 text-slate-400 hover:text-red-600 ${
              kegiatan.status === "tracking" ? "hidden" : ""
            }">🗑️</button>
        </div>`;

  const actionBar = document.createElement("div");
  actionBar.className = "flex items-center gap-2";

  let timerDisplayHTML = `<div 
        class="timer-display font-bold ${
          pengaturan.tampilTimer ? "" : "hidden"
        }" 
        id="timer-${kegiatan.id}"
        style="color: ${pengaturan.warnaTimer}; font-size: ${getUkuranFontTimer(
    pengaturan.ukuranTimer
  )};">
    </div>`;

  let actionButtonsHTML = "";
  if (!kegiatan.selesai && !kegiatan.isEditing) {
    const finishButton = `<button data-action="finish-activity" class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-3 rounded-md">Selesai</button>`;
    switch (kegiatan.status) {
      case "tracking":
        actionButtonsHTML = `<button data-action="pause-timer" class="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-3 rounded-md">Pause</button>${finishButton}`;
        break;
      case "paused":
        actionButtonsHTML = `<button data-action="resume-timer" class="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-md">Lanjutkan</button>${finishButton}`;
        break;
      default: // 'idle'
        actionButtonsHTML = `<button data-action="start-focus" class="bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold py-1 px-3 rounded-md">Fokus</button>`;
        break;
    }
  }

  actionBar.innerHTML = `${timerDisplayHTML}<div class="flex gap-2 ml-auto">${actionButtonsHTML}</div>`;

  li.appendChild(mainContent);
  li.appendChild(actionBar);
  return li;
}

function perbaruiStatistik() {
  const kegiatanSelesaiHariIni = allActivities.filter(
    (k) =>
      k.selesai &&
      k.durasi > 0 &&
      k.waktuSelesai &&
      isSameDay(k.waktuSelesai.toDate(), currentDate)
  );

  if (kegiatanSelesaiHariIni.length === 0) {
    if (kontenStatistikTeks)
      kontenStatistikTeks.innerHTML =
        "<p>Selesaikan tugas hari ini untuk melihat statistik.</p>";
    if (statistikChart) {
      statistikChart.destroy();
      statistikChart = null;
    }
    return;
  }

  const totalDurasiUnikMs = kegiatanSelesaiHariIni.reduce(
    (total, k) => total + k.durasi,
    0
  );
  const durasiPerKategori = {};
  kegiatanSelesaiHariIni.forEach((k) => {
    const kategori = k.kategori || "Lainnya";
    durasiPerKategori[kategori] = (durasiPerKategori[kategori] || 0) + k.durasi;
  });

  kontenStatistikTeks.innerHTML = `<p class="flex justify-between py-1"><span>Total Waktu Produktif Hari Ini:</span> <strong>${formatDurasi(
    totalDurasiUnikMs
  )}</strong></p><p class="flex justify-between py-1"><span>Tugas Selesai Hari Ini:</span> <strong>${
    kegiatanSelesaiHariIni.length
  }</strong></p>`;

  if (statistikChart) statistikChart.destroy();

  const isDark = document.documentElement.classList.contains("dark");

  statistikChart = new Chart(statistikChartCanvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(durasiPerKategori),
      datasets: [
        {
          data: Object.values(durasiPerKategori),
          backgroundColor: Object.keys(durasiPerKategori).map((label) =>
            getWarnaKategori(label, true)
          ),
          borderColor: isDark ? "#1E293B" : "#FFFFFF",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 15,
            color: isDark ? "#94A3B8" : "#475569",
          },
        },
        tooltip: {
          callbacks: {
            label: (context) =>
              ` ${context.label}: ${formatDurasi(context.raw)}`,
          },
        },
      },
    },
  });
}

async function tambahProyek() {
  const namaProyek = inputProyek.value.trim();
  if (!namaProyek) return showCustomAlert("Nama proyek tidak boleh kosong.");
  const parentId =
    pilihProyekInduk.value === "none" ? null : pilihProyekInduk.value;
  const isDuplicate = daftarProyek.some(
    (p) =>
      p.nama.toLowerCase() === namaProyek.toLowerCase() &&
      p.parentId === parentId
  );
  if (isDuplicate)
    return showCustomAlert(`Proyek "${namaProyek}" sudah ada di level ini.`);

  await addDoc(collection(db, "users", currentUser.uid, "projects"), {
    nama: namaProyek,
    parentId: parentId,
    isCollapsed: false,
    createdAt: serverTimestamp(),
    order: Date.now(),
  });

  const projectsQuery = query(
    collection(db, "users", currentUser.uid, "projects"),
    orderBy("order", "asc")
  );
  const projectSnapshot = await getDocs(projectsQuery);
  daftarProyek = projectSnapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
  renderProyekDropdowns();
  renderDaftarUtama();
  inputProyek.value = "";
}

async function tambahKegiatan() {
  const teksKegiatan = inputKegiatan.value.trim();
  if (!teksKegiatan)
    return showCustomAlert("Nama kegiatan tidak boleh kosong.");
  const [jam, menit] = inputWaktu.value.split(":");
  const tanggalKegiatan = new Date(currentDate);
  if (inputWaktu.value) {
    tanggalKegiatan.setHours(parseInt(jam, 10), parseInt(menit, 10), 0, 0);
  } else {
    const now = new Date();
    tanggalKegiatan.setHours(
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
  }

  await addDoc(collection(db, "users", currentUser.uid, "activities"), {
    teks: teksKegiatan,
    kategori: inputKategori.value,
    proyekId:
      pilihProyekKegiatan.value !== "none" ? pilihProyekKegiatan.value : null,
    selesai: false,
    durasi: 0,
    isEditing: false,
    status: "tracking", // <-- DIUBAH: Langsung berjalan saat dibuat
    isFocusing: false,
    lastStartTime: serverTimestamp(), // <-- DIUBAH: Catat waktu mulai
    focusEndTime: null,
    remainingTime: 0,
    createdAt: Timestamp.fromDate(tanggalKegiatan),
    waktuSelesai: null,
    order: Date.now(),
  });
  inputKegiatan.value = "";
  inputWaktu.value = "";
  inputKegiatan.focus();
}

async function handleListClick(e) {
  if (!currentUser) return;
  const target = e.target;
  const action = target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  const liProyek = target.closest(".list-proyek");
  const proyekId = liProyek?.dataset.proyekId;
  if (proyekId) {
    const proyekIndex = daftarProyek.findIndex((p) => p.id === proyekId);
    if (proyekIndex > -1) {
      const proyek = daftarProyek[proyekIndex];
      switch (action) {
        case "toggle":
          await updateDoc(
            doc(db, "users", currentUser.uid, "projects", proyekId),
            { isCollapsed: !proyek.isCollapsed }
          );
          break;
        case "add-activity":
          const result = await showAddActivityPrompt(
            `Tambah kegiatan ke proyek "${proyek.nama}":`,
            "Tambah Kegiatan Baru"
          );
          if (result) {
            const tanggalKegiatan = new Date(currentDate);
            const now = new Date();
            tanggalKegiatan.setHours(
              now.getHours(),
              now.getMinutes(),
              now.getSeconds()
            );
            await addDoc(
              collection(db, "users", currentUser.uid, "activities"),
              {
                teks: result.text,
                proyekId: proyekId,
                kategori: result.category,
                selesai: false,
                durasi: 0,
                isEditing: false,
                status: "tracking", // <-- DIUBAH: Langsung berjalan saat dibuat
                isFocusing: false,
                lastStartTime: serverTimestamp(), // <-- DIUBAH: Catat waktu mulai
                focusEndTime: null,
                remainingTime: 0,
                createdAt: Timestamp.fromDate(tanggalKegiatan),
                waktuSelesai: null,
                order: Date.now(),
              }
            );
          }
          break;
        case "add-subproject":
          const namaSubProyek = await showCustomPrompt(
            `Masukkan nama sub-proyek untuk "${proyek.nama}":`,
            "Tambah Sub-Proyek"
          );
          if (namaSubProyek && namaSubProyek.trim()) {
            const oldParentValue = pilihProyekInduk.value;
            pilihProyekInduk.value = proyekId;
            inputProyek.value = namaSubProyek.trim();
            await tambahProyek();
            pilihProyekInduk.value = oldParentValue;
          }
          break;
        case "delete-project":
          const confirmation = await showCustomConfirm(
            `Yakin ingin menghapus proyek "${proyek.nama}"? Ini akan menghapus SEMUA sub-proyek dan kegiatannya.`,
            "Hapus Proyek"
          );
          if (confirmation) await hapusProyekDanTurunannya(proyekId);
          break;
      }
    }
  }
  const liKegiatan = target.closest("li[data-kegiatan-id]");
  if (liKegiatan) {
    const kegiatanId = liKegiatan.dataset.kegiatanId;
    const kegiatan = allActivities.find((k) => k.id === kegiatanId);
    if (!kegiatan) return;
    const docRef = doc(db, "users", currentUser.uid, "activities", kegiatanId);
    switch (action) {
      case "edit-activity":
        await updateDoc(docRef, { isEditing: true });
        break;
      case "save-activity":
        const newText = liKegiatan
          .querySelector(".input-edit-kegiatan")
          .value.trim();
        if (newText)
          await updateDoc(docRef, { teks: newText, isEditing: false });
        break;
      case "delete-activity":
        const delConfirm = await showCustomConfirm(
          `Yakin ingin menghapus kegiatan "${kegiatan.teks}"?`,
          "Hapus Kegiatan"
        );
        if (delConfirm) await deleteDoc(docRef);
        break;
      case "finish-activity":
        let durasiFinal = kegiatan.durasi || 0;
        if (kegiatan.status === "tracking" && kegiatan.lastStartTime) {
          const elapsed =
            Date.now() - kegiatan.lastStartTime.toDate().getTime();
          durasiFinal += elapsed;
        }
        await updateDoc(docRef, {
          selesai: true,
          status: "idle",
          isFocusing: false,
          durasi: durasiFinal,
          waktuSelesai: serverTimestamp(),
        });
        break;
      case "start-tracking": // Aksi ini tidak lagi dipakai dari UI, tapi kita biarkan kodenya
        await updateDoc(docRef, {
          status: "tracking",
          isFocusing: false,
          lastStartTime: serverTimestamp(),
        });
        break;
      case "start-focus":
        const durasiMenit = await showCustomPrompt(
          "Atur timer fokus (menit):",
          "Fokus Mode",
          "25"
        );
        if (
          durasiMenit &&
          !isNaN(parseInt(durasiMenit, 10)) &&
          parseInt(durasiMenit, 10) > 0
        ) {
          if (Notification.permission !== "granted")
            await requestNotificationPermission();
          const durasiMs = parseInt(durasiMenit, 10) * 60 * 1000;
          const waktuSelesaiFokus = new Date(Date.now() + durasiMs);
          await updateDoc(docRef, {
            status: "tracking",
            isFocusing: true,
            lastStartTime: serverTimestamp(),
            focusEndTime: Timestamp.fromDate(waktuSelesaiFokus),
            remainingTime: durasiMs,
          });
        }
        break;
      case "pause-timer":
        if (kegiatan.status === "tracking" && kegiatan.lastStartTime) {
          const elapsed =
            Date.now() - kegiatan.lastStartTime.toDate().getTime();
          const updateData = {
            status: "paused",
            durasi: increment(elapsed),
            lastStartTime: null,
          };
          if (kegiatan.isFocusing && kegiatan.focusEndTime) {
            const sisaWaktu =
              kegiatan.focusEndTime.toDate().getTime() - Date.now();
            updateData.remainingTime = sisaWaktu > 0 ? sisaWaktu : 0;
          }
          await updateDoc(docRef, updateData);
        }
        break;
      case "resume-timer":
        if (kegiatan.status === "paused") {
          const updateData = {
            status: "tracking",
            lastStartTime: serverTimestamp(),
          };
          if (kegiatan.isFocusing && kegiatan.remainingTime > 0) {
            const newFocusEndTime = new Date(
              Date.now() + kegiatan.remainingTime
            );
            updateData.focusEndTime = Timestamp.fromDate(newFocusEndTime);
          }
          await updateDoc(docRef, updateData);
        }
        break;
    }
  }
}

async function hapusProyekDanTurunannya(proyekId) {
  const batch = writeBatch(db);
  const projectsToDelete = [proyekId];
  const projectsToSearch = [proyekId];
  while (projectsToSearch.length > 0) {
    const currentId = projectsToSearch.pop();
    const children = daftarProyek.filter((p) => p.parentId === currentId);
    for (const child of children) {
      projectsToDelete.push(child.id);
      projectsToSearch.push(child.id);
    }
  }
  projectsToDelete.forEach((id) =>
    batch.delete(doc(db, "users", currentUser.uid, "projects", id))
  );
  const activityReads = [];
  for (let i = 0; i < projectsToDelete.length; i += 30) {
    const chunk = projectsToDelete.slice(i, i + 30);
    const q = query(
      collection(db, "users", currentUser.uid, "activities"),
      where("proyekId", "in", chunk)
    );
    activityReads.push(getDocs(q));
  }
  const activitySnapshots = await Promise.all(activityReads);
  activitySnapshots.forEach((snapshot) => {
    snapshot.forEach((doc) => batch.delete(doc.ref));
  });
  await batch.commit();
  daftarProyek = daftarProyek.filter((p) => !projectsToDelete.includes(p.id));
  renderProyekDropdowns();
  renderDaftarUtama();
  perbaruiStatistik();
}

function timerLoop() {
  let activeTaskForTitle = null;
  const sekarang = Date.now();

  allActivities.forEach((kegiatan) => {
    const timerElement = document.getElementById(`timer-${kegiatan.id}`);
    if (!timerElement) return;

    if (kegiatan.status === "tracking" && kegiatan.lastStartTime) {
      if (!activeTaskForTitle) activeTaskForTitle = kegiatan;

      if (kegiatan.isFocusing) {
        // Mode Fokus (Countdown)
        if (kegiatan.focusEndTime) {
          const sisaWaktu = kegiatan.focusEndTime.toDate().getTime() - sekarang;
          if (sisaWaktu > 0) {
            timerElement.textContent = `Fokus: ${formatSisaWaktu(sisaWaktu)}`;
          } else {
            timerElement.textContent = "Fokus Selesai!";
            if (kegiatan.status === "tracking") {
              // Mencegah update berulang
              kirimNotifikasiFokusSelesai(kegiatan);
              const docRef = doc(
                db,
                "users",
                currentUser.uid,
                "activities",
                kegiatan.id
              );
              const elapsed =
                Date.now() - kegiatan.lastStartTime.toDate().getTime();
              updateDoc(docRef, {
                status: "paused", // Otomatis pause saat waktu habis
                durasi: increment(elapsed),
                lastStartTime: null,
              });
            }
          }
        }
      } else {
        // Mode Tracker (Stopwatch)
        const elapsed = sekarang - kegiatan.lastStartTime.toDate().getTime();
        const totalDurasi = (kegiatan.durasi || 0) + elapsed;
        timerElement.textContent = formatDurasi(totalDurasi);
      }
    } else if (kegiatan.status === "paused") {
      // Tampilkan waktu terakhir saat di-pause
      if (kegiatan.isFocusing) {
        timerElement.textContent = `Fokus: ${formatSisaWaktu(
          kegiatan.remainingTime
        )}`;
      } else {
        timerElement.textContent = formatDurasi(kegiatan.durasi || 0);
      }
    } else {
      // Idle
      timerElement.textContent = formatDurasi(kegiatan.durasi || 0);
    }
  });

  if (activeTaskForTitle) {
    document.title = `Tracking... | ${activeTaskForTitle.teks}`;
  } else if (!document.title.includes("Activity Logger")) {
    document.title = "Activity Logger Pro";
  }
}

async function requestNotificationPermission() {
  if ("Notification" in window) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      showCustomAlert(
        "Notifikasi tidak diizinkan. Anda tidak akan menerima pemberitahuan saat timer selesai.",
        "Perhatian"
      );
    }
  }
}

function kirimNotifikasiFokusSelesai(kegiatan) {
  const title = "⏰ Sesi Fokus Selesai!";
  const options = {
    body: `Waktu untuk "${kegiatan.teks}" telah habis. Jangan lupa istirahat!`,
    icon: "images/icon-192.png",
    vibrate: [200, 100, 200],
    tag: "fokus-selesai",
    data: {
      url: window.location.href,
    },
  };

  if (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    Notification.permission === "granted"
  ) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, options);
    });
  } else if (Notification.permission !== "denied") {
    new Notification(title, options);
  } else {
    new Audio(
      "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg"
    ).play();
  }
}

function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getWarnaKategori(kategori, isHex = false) {
  const warna = {
    Pekerjaan: { bg: "bg-blue-500", hex: "#3B82F6" },
    Belajar: { bg: "bg-green-500", hex: "#22C55E" },
    Pribadi: { bg: "bg-yellow-400", hex: "#FACC15" },
    Istirahat: { bg: "bg-indigo-500", hex: "#6366F1" },
    Lainnya: { bg: "bg-slate-500", hex: "#64748B" },
  };
  const defaultColor = warna["Lainnya"];
  const selectedColor = warna[kategori] || defaultColor;
  return isHex ? selectedColor.hex : selectedColor.bg;
}

function formatDurasi(ms) {
  if (!ms || ms < 1000) return "0d";
  const totalDetik = Math.floor(ms / 1000);
  const jam = Math.floor(totalDetik / 3600);
  const menit = Math.floor((totalDetik % 3600) / 60);
  const detik = totalDetik % 60;

  let hasil = [];
  if (jam > 0) hasil.push(`${jam}j`);
  if (menit > 0) hasil.push(`${menit}m`);
  if (detik > 0) hasil.push(`${detik}d`);

  return hasil.join(" ") || "0d";
}

function formatSisaWaktu(ms) {
  if (ms < 0) ms = 0;
  const menit = Math.floor(ms / 60000)
    .toString()
    .padStart(2, "0");
  const detik = Math.floor((ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  return `${menit}:${detik}`;
}

function formatJam(date) {
  if (!date) return "";
  const d = date.toDate();
  const jam = d.getHours().toString().padStart(2, "0");
  const menit = d.getMinutes().toString().padStart(2, "0");
  return `Jam ${jam}.${menit}`;
}

function generateTeks() {
  const namaTampilan =
    userProfile.customName ||
    currentUser.displayName ||
    currentUser.email.split("@")[0];
  let teksFinal = `*Laporan Kegiatan Harian*\nNama: ${namaTampilan}\nTanggal: ${tanggalHariIniElement.textContent}\n\n`;

  const daftarKegiatanHariIni = allActivities
    .filter((k) => isSameDay(k.createdAt.toDate(), currentDate) || !k.selesai)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const formatKegiatan = (k) => {
    let detailWaktu = "";
    if (k.selesai && k.createdAt && k.waktuSelesai) {
      detailWaktu = `(mulai: ${formatJam(k.createdAt)} sampai ${formatJam(
        k.waktuSelesai
      )}) (durasi: ${formatDurasi(k.durasi)})`;
    } else if (k.createdAt) {
      detailWaktu = `(mulai: ${formatJam(k.createdAt)})`;
    }
    return `- ${k.teks} ${detailWaktu}\n`;
  };
  daftarProyek.forEach((proyek) => {
    const subTugas = daftarKegiatanHariIni.filter(
      (k) => k.proyekId === proyek.id
    );
    if (subTugas.length > 0) {
      teksFinal += `*PROYEK: ${proyek.nama}*\n`;
      subTugas.forEach((k) => {
        teksFinal += formatKegiatan(k);
      });
      teksFinal += "\n";
    }
  });
  const kegiatanLain = daftarKegiatanHariIni.filter((k) => !k.proyekId);
  if (kegiatanLain.length > 0) {
    teksFinal += "*KEGIATAN LAIN:*\n";
    kegiatanLain.forEach((k) => {
      teksFinal += formatKegiatan(k);
    });
  }
  hasilTeks.value = teksFinal;
}

function salinTeks(elementId) {
  const textarea = document.getElementById(elementId);
  if (!textarea.value)
    return showCustomAlert("Tidak ada teks untuk disalin.", "Perhatian");
  navigator.clipboard
    .writeText(textarea.value)
    .then(() =>
      showCustomAlert("Teks berhasil disalin ke clipboard!", "Sukses")
    )
    .catch((err) => {
      console.error("Gagal menyalin teks: ", err);
      showCustomAlert("Gagal menyalin teks.", "Error");
    });
}

function renderProyekDropdowns() {
  const projectsById = daftarProyek.reduce(
    (acc, p) => ({ ...acc, [p.id]: { ...p, children: [] } }),
    {}
  );
  const rootProjects = [];
  daftarProyek.forEach((p) => {
    if (p.parentId && projectsById[p.parentId]) {
      if (!projectsById[p.parentId].children)
        projectsById[p.parentId].children = [];
      projectsById[p.parentId].children.push(projectsById[p.id]);
    } else {
      rootProjects.push(projectsById[p.id]);
    }
  });
  const populateDropdown = (selectElement) => {
    const selectedValue = selectElement.value;
    selectElement.innerHTML = `<option value="none">-- ${
      selectElement.id === "pilih-proyek-induk" ? "Tanpa Induk" : "Tanpa Proyek"
    } --</option>`;
    rootProjects
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((p) => populateDropdownRecursive(p, 0, selectElement));
    if (
      Array.from(selectElement.options).some(
        (opt) => opt.value === selectedValue
      )
    ) {
      selectElement.value = selectedValue;
    }
  };
  populateDropdown(pilihProyekInduk);
  populateDropdown(pilihProyekKegiatan);
}

function populateDropdownRecursive(proyek, level, selectElement) {
  const option = document.createElement("option");
  option.value = proyek.id;
  option.textContent = `${"--".repeat(level)} ${proyek.nama}`;
  selectElement.appendChild(option);
  if (proyek.children) {
    proyek.children
      .sort((a, b) => a.nama.localeCompare(b.nama))
      .forEach((child) =>
        populateDropdownRecursive(child, level + 1, selectElement)
      );
  }
}

// --- START THE APP ---
enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Persistensi offline Firebase berhasil diaktifkan.");
  })
  .catch((err) => {
    console.warn("Gagal mengaktifkan persistensi offline.", err);
  })
  .finally(() => {
    runApp();
  });

  // --- PENDAFTARAN SERVICE WORKER ---
// Kode ini harus ada agar browser tahu ada file sw.js yang harus diaktifkan.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Service Worker berhasil didaftarkan dengan scope:', registration.scope);
      })
      .catch(err => {
        console.error('❌ Pendaftaran Service Worker gagal:', err);
      });
  });
}