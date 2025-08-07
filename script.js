// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch, where, getDocs, enableIndexedDbPersistence, Timestamp, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBellkuYYMVFULmdBb8zPJ6CcwZOywpQyw",
    authDomain: "activity-logger-8576d.firebaseapp.com",
    projectId: "activity-logger-8576d",
    storageBucket: "activity-logger-8576d.appspot.com",
    messagingSenderId: "841728671208",
    appId: "1:841728671208:web:abc88d3a9593b7453c385d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// === DOM ELEMENTS ===
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.getElementById('app-container');
const inputEmail = document.getElementById('input-email');
const inputPassword = document.getElementById('input-password');
const tombolLogin = document.getElementById('tombol-login');
const tombolDaftar = document.getElementById('tombol-daftar');
const tombolLoginGoogle = document.getElementById('tombol-login-google');
const tombolLogout = document.getElementById('tombol-logout');
const authErrorElement = document.getElementById('auth-error');
const namaUserElement = document.getElementById('nama-user');
const tombolEditNama = document.getElementById('tombol-edit-nama');
const tanggalHariIniElement = document.getElementById('tanggal-hari-ini');
const tombolHariSebelumnya = document.getElementById('tombol-hari-sebelumnya');
const tombolHariBerikutnya = document.getElementById('tombol-hari-berikutnya');
const inputProyek = document.getElementById('input-proyek');
const tombolTambahProyek = document.getElementById('tombol-tambah-proyek');
const inputKegiatan = document.getElementById('input-kegiatan');
const inputWaktu = document.getElementById('input-waktu');
const inputKategori = document.getElementById('input-kategori');
const pilihProyek = document.getElementById('pilih-proyek');
const tombolTambah = document.getElementById('tombol-tambah');
const daftarKegiatanElement = document.getElementById('daftar-kegiatan');
const loadingElement = document.getElementById('loading');
const pesanKosongElement = document.getElementById('pesan-kosong');
const tombolGenerate = document.getElementById('tombol-generate-teks');
const tombolSalin = document.getElementById('tombol-salin-teks');
const hasilTeks = document.getElementById('hasil-teks');
const statistikChartCanvas = document.getElementById('statistik-chart').getContext('2d');
const kontenStatistikTeks = document.getElementById('konten-statistik-teks');
const customAlertOverlay = document.getElementById('custom-alert-overlay');
const customAlertBox = document.getElementById('custom-alert-box');
const customAlertTitle = document.getElementById('custom-alert-title');
const customAlertMessage = document.getElementById('custom-alert-message');
const customPromptInputContainer = document.getElementById('custom-prompt-input-container'); // Baru
const customAlertButtons = document.getElementById('custom-alert-buttons');

// === APP STATE ===
let currentUser = null;
let userProfile = {};
let daftarKegiatan = [];
let daftarProyek = [];
let timerInterval = null;
let statistikChart = null;
let unsubscribeProfile = () => {};
let unsubscribeProjects = () => {};
let unsubscribeActivities = () => {};
let currentDate = new Date();

// --- Main function to run the application ---
function runApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loginOverlay.style.display = 'none';
            appContainer.classList.remove('hidden');
            setupAplikasi();
        } else {
            currentUser = null;
            userProfile = {};
            loginOverlay.style.display = 'flex';
            appContainer.classList.add('hidden');
            unsubscribeAll();
            daftarKegiatan = [];
            daftarProyek = [];
        }
    });

    // === AUTH FUNCTIONS ===
    const handleGoogleLogin = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(handleAuthError);
    const handleDaftar = () => createUserWithEmailAndPassword(auth, inputEmail.value, inputPassword.value).catch(handleAuthError);
    const handleLogin = () => signInWithEmailAndPassword(auth, inputEmail.value, inputPassword.value).catch(handleAuthError);
    const handleLogout = () => signOut(auth).catch(handleAuthError);

    const handleAuthError = (error) => {
        console.error("Auth Error:", error.code, error.message);
        let message = "Terjadi kesalahan autentikasi.";
        switch (error.code) {
            case 'auth/wrong-password': message = "Password salah."; break;
            case 'auth/user-not-found': message = "Pengguna tidak ditemukan."; break;
            case 'auth/email-already-in-use': message = "Email ini sudah terdaftar."; break;
        }
        authErrorElement.textContent = message;
    };

    // === EVENT LISTENERS ===
    tombolLogin.addEventListener('click', handleLogin);
    tombolDaftar.addEventListener('click', handleDaftar);
    tombolLoginGoogle.addEventListener('click', handleGoogleLogin);
    tombolLogout.addEventListener('click', handleLogout);
    tombolEditNama.addEventListener('click', ubahNamaTampilan);

    function setupAppEventListeners() {
        tombolTambahProyek.addEventListener('click', tambahProyek);
        tombolTambah.addEventListener('click', tambahKegiatan);
        daftarKegiatanElement.addEventListener('click', handleListClick);
        tombolGenerate.addEventListener('click', generateTeks);
        tombolSalin.addEventListener('click', () => salinTeks('hasil-teks'));
        tombolHariSebelumnya.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() - 1); setTanggal(currentDate); });
        tombolHariBerikutnya.addEventListener('click', () => { if (!isToday(currentDate)) { currentDate.setDate(currentDate.getDate() + 1); setTanggal(currentDate); } });
        inputProyek.addEventListener('keydown', e => { if (e.key === 'Enter') tambahProyek(); });
        inputKegiatan.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inputWaktu.focus(); } });
        inputWaktu.addEventListener('keydown', e => { if (e.key === 'Enter') tambahKegiatan(); });
    }

    function setupAplikasi() {
        setupAppEventListeners();
        setupPermanentListeners();
        setTanggal(new Date());
        if (!timerInterval) timerInterval = setInterval(timerLoop, 1000);
        requestNotificationPermission();
    }
    
    function unsubscribeAll() {
        unsubscribeProfile();
        unsubscribeProjects();
        unsubscribeActivities();
    }

    // === CUSTOM ALERT/CONFIRM/PROMPT SYSTEM ===
    function showCustomAlert(message, title = "Notifikasi") {
        customPromptInputContainer.innerHTML = ''; // Pastikan input prompt kosong
        customAlertTitle.textContent = title;
        customAlertMessage.textContent = message;
        customAlertButtons.innerHTML = `<button id="custom-alert-ok" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">OK</button>`;
        customAlertOverlay.classList.remove('hidden');
        setTimeout(() => customAlertBox.classList.add('visible'), 10);
        return new Promise(resolve => {
            document.getElementById('custom-alert-ok').onclick = () => {
                customAlertBox.classList.remove('visible');
                setTimeout(() => customAlertOverlay.classList.add('hidden'), 200);
                resolve(true);
            };
        });
    }

    function showCustomConfirm(message, title = "Konfirmasi") {
        customPromptInputContainer.innerHTML = ''; // Pastikan input prompt kosong
        customAlertTitle.textContent = title;
        customAlertMessage.textContent = message;
        customAlertButtons.innerHTML = `<button id="custom-confirm-cancel" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg transition-colors">Batal</button><button id="custom-confirm-ok" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Yakin</button>`;
        customAlertOverlay.classList.remove('hidden');
        setTimeout(() => customAlertBox.classList.add('visible'), 10);
        return new Promise(resolve => {
            document.getElementById('custom-confirm-ok').onclick = () => {
                customAlertBox.classList.remove('visible');
                setTimeout(() => customAlertOverlay.classList.add('hidden'), 200);
                resolve(true);
            };
            document.getElementById('custom-confirm-cancel').onclick = () => {
                customAlertBox.classList.remove('visible');
                setTimeout(() => customAlertOverlay.classList.add('hidden'), 200);
                resolve(false);
            };
        });
    }

    // BARU: Fungsi untuk menampilkan prompt custom
    function showCustomPrompt(message, title = "Input", defaultValue = "") {
        customAlertTitle.textContent = title;
        customAlertMessage.textContent = message;
        customPromptInputContainer.innerHTML = `<input type="text" id="custom-prompt-input" value="${defaultValue}" class="mt-2 w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">`;
        customAlertButtons.innerHTML = `<button id="custom-prompt-cancel" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg">Batal</button><button id="custom-prompt-ok" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Simpan</button>`;
        
        customAlertOverlay.classList.remove('hidden');
        setTimeout(() => {
            customAlertBox.classList.add('visible');
            document.getElementById('custom-prompt-input').focus();
        }, 10);

        return new Promise(resolve => {
            const okBtn = document.getElementById('custom-prompt-ok');
            const cancelBtn = document.getElementById('custom-prompt-cancel');
            const input = document.getElementById('custom-prompt-input');

            const close = (value) => {
                customAlertBox.classList.remove('visible');
                setTimeout(() => {
                    customAlertOverlay.classList.add('hidden');
                    customPromptInputContainer.innerHTML = ''; // Bersihkan setelah selesai
                }, 200);
                resolve(value);
            };

            okBtn.onclick = () => close(input.value);
            cancelBtn.onclick = () => close(null); // Kirim null jika dibatalkan
            input.onkeydown = (e) => { if (e.key === 'Enter') okBtn.click(); };
        });
    }

    // === MAIN APP FUNCTIONS ===
    
    // DIPERBARUI: Menggunakan prompt custom
    async function ubahNamaTampilan() {
        const namaSaatIni = userProfile.customName || currentUser.displayName || '';
        const namaBaru = await showCustomPrompt("Masukkan nama tampilan baru:", "Ubah Nama", namaSaatIni);

        if (namaBaru !== null && namaBaru.trim() !== '') {
            try {
                await setDoc(doc(db, "users", currentUser.uid), { customName: namaBaru.trim() }, { merge: true });
                showCustomAlert("Nama berhasil diperbarui!", "Sukses");
            } catch (error) {
                console.error("Gagal ubah nama:", error);
                showCustomAlert("Gagal menyimpan nama baru.", "Error");
            }
        }
    }

    function setTanggal(newDate) {
        currentDate = new Date(newDate.setHours(0, 0, 0, 0));
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        tanggalHariIniElement.textContent = currentDate.toLocaleDateString('id-ID', options);
        const today = isToday(currentDate);
        tombolHariBerikutnya.disabled = today;
        tombolHariBerikutnya.style.opacity = today ? 0.5 : 1;
        tombolHariBerikutnya.style.cursor = today ? 'not-allowed' : 'pointer';
        setupDailyListeners();
    }

    function isToday(date) {
        const today = new Date();
        return date.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0);
    }

    function setupPermanentListeners() {
        unsubscribeAll();
        
        const profileRef = doc(db, "users", currentUser.uid);
        unsubscribeProfile = onSnapshot(profileRef, (doc) => {
            userProfile = doc.data() || {};
            namaUserElement.textContent = userProfile.customName || currentUser.displayName || currentUser.email.split('@')[0];
        });

        const projectsQuery = query(collection(db, "users", currentUser.uid, "projects"), orderBy("createdAt", "asc"));
        unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
            daftarProyek = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSemua();
        });
    }

    function setupDailyListeners() {
        unsubscribeActivities();
        loadingElement.style.display = 'block';
        pesanKosongElement.style.display = 'none';
        daftarKegiatanElement.innerHTML = '';

        const startOfDay = currentDate;
        const endOfDay = new Date(currentDate);
        endOfDay.setDate(endOfDay.getDate() + 1);
        const activitiesQuery = query(collection(db, "users", currentUser.uid, "activities"), where("createdAt", ">=", startOfDay), where("createdAt", "<", endOfDay), orderBy("createdAt", "asc"));

        unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
            daftarKegiatan = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            loadingElement.style.display = 'none';
            renderSemua();
        }, (error) => console.error("Error listener kegiatan: ", error));
    }

    function renderSemua() {
        if (!currentUser) return;
        renderProyekDropdown();
        renderDaftarUtama();
        perbaruiStatistik();
    }

    function renderDaftarUtama() {
        daftarKegiatanElement.innerHTML = '';
        
        daftarProyek.forEach(proyek => {
            try {
                const subTugasHariIni = daftarKegiatan.filter(k => k.proyekId === proyek.id);
                const dibuatHariIni = proyek.createdAt ? isSameDay(proyek.createdAt.toDate(), currentDate) : false;

                if (subTugasHariIni.length > 0 || dibuatHariIni) {
                     daftarKegiatanElement.appendChild(buatElemenProyek(proyek, subTugasHariIni));
                }
            } catch (error) {
                console.error("Gagal merender proyek:", proyek.nama, error);
            }
        });

        const kegiatanTanpaProyek = daftarKegiatan.filter(k => !k.proyekId);
        kegiatanTanpaProyek.forEach(kegiatan => {
            const liKegiatan = buatElemenKegiatan(kegiatan);
            liKegiatan.classList.add('bg-white', 'rounded-xl', 'shadow-sm', 'p-4');
            daftarKegiatanElement.appendChild(liKegiatan);
        });

        const adaItem = daftarKegiatanElement.hasChildNodes();
        pesanKosongElement.style.display = adaItem ? 'none' : 'block';
    }

    function buatElemenProyek(proyek, subTugas) {
        const liProyek = document.createElement('li');
        liProyek.className = 'list-proyek bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300';
        liProyek.dataset.proyekId = proyek.id;
        const totalDurasiProyekMs = subTugas.filter(k => k.selesai && k.durasi).reduce((total, k) => total + k.durasi, 0);
        liProyek.innerHTML = `<div class="p-4 flex justify-between items-center bg-slate-50 cursor-pointer judul-proyek-container"><div class="flex items-center gap-3 flex-grow"><span class="toggle-proyek transform transition-transform ${proyek.isCollapsed ? '-rotate-90' : ''}">▼</span><strong class="text-slate-900 text-lg">${proyek.nama}</strong></div><div class="flex items-center"><span class="text-sm text-slate-500 font-medium mr-2">Total: ${formatDurasi(totalDurasiProyekMs)}</span><button title="Hapus proyek dan semua tugasnya" class="tombol-hapus-proyek text-xl text-red-500 hover:bg-red-100 rounded-full w-8 h-8 flex items-center justify-center">&times;</button></div></div><ul class="list-subtugas p-4 pt-0 space-y-2 ${proyek.isCollapsed ? 'collapsed' : ''}">${subTugas.map(k => buatElemenKegiatan(k, true).outerHTML).join('')}</ul>`;
        return liProyek;
    }

    function buatElemenKegiatan(kegiatan, isSubtugas = false) {
        const li = document.createElement('li');
        li.className = isSubtugas ? 'flex flex-col gap-2 border-b border-slate-200 py-3 last:border-b-0' : 'flex flex-col gap-2';
        li.dataset.kegiatanId = kegiatan.id;
        const mainContent = document.createElement('div');
        mainContent.className = 'flex justify-between items-start';
        let teksElementHTML;
        if (kegiatan.isEditing) {
            const encodedText = kegiatan.teks.replace(/"/g, '&quot;');
            teksElementHTML = `<input type="text" value="${encodedText}" class="input-edit-kegiatan flex-grow bg-yellow-100 border border-yellow-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500">`;
        } else {
            teksElementHTML = `<span class="text-slate-800 ${kegiatan.selesai ? 'line-through text-slate-400' : ''}">${kegiatan.teks}</span>`;
        }
        mainContent.innerHTML = `<div class="flex items-center gap-2 flex-wrap flex-grow mr-2">${kegiatan.kategori ? `<span class="kategori-tag text-xs font-bold px-2 py-1 rounded-full text-white ${getWarnaKategori(kegiatan.kategori)}">${kegiatan.kategori}</span>` : ''}${teksElementHTML}</div><div class="flex items-center gap-1 flex-shrink-0">${!kegiatan.isEditing ? `<button title="Edit" class="tombol-edit-kegiatan p-1 text-slate-400 hover:text-blue-600">✏️</button>` : `<button title="Simpan" class="tombol-simpan-edit p-1 text-slate-400 hover:text-green-600">💾</button>`}<button title="Hapus" class="tombol-hapus p-1 text-slate-400 hover:text-red-600">🗑️</button></div>`;
        const actionBar = document.createElement('div');
        actionBar.className = 'flex justify-end items-center gap-2';
        if (!kegiatan.selesai && !kegiatan.isEditing) {
            if (kegiatan.isFocusing) {
                actionBar.innerHTML = `<div class="timer-display font-bold text-xl text-red-500" id="timer-${kegiatan.id}">...</div><button class="tombol-batal-fokus bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-3 rounded-md">Batal</button>`;
            } else {
                actionBar.innerHTML = `<button class="tombol-fokus bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold py-1 px-3 rounded-md">Fokus</button><button class="tombol-selesai bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-md">Selesai</button>`;
            }
        }
        li.appendChild(mainContent);
        li.appendChild(actionBar);
        return li;
    }

    function perbaruiStatistik() {
        const kegiatanSelesai = daftarKegiatan.filter(k => k.selesai && k.durasi);
        if (kegiatanSelesai.length === 0) {
            if (kontenStatistikTeks) kontenStatistikTeks.innerHTML = '<p>Selesaikan tugas untuk melihat statistik.</p>';
            if (statistikChart) { statistikChart.destroy(); statistikChart = null; }
            return;
        }
        const durasiPerKategori = {};
        kegiatanSelesai.forEach(k => {
            const kategori = k.kategori || 'Lainnya';
            durasiPerKategori[kategori] = (durasiPerKategori[kategori] || 0) + k.durasi;
        });
        const totalDurasiMs = Object.values(durasiPerKategori).reduce((a, b) => a + b, 0);
        kontenStatistikTeks.innerHTML = `<p class="flex justify-between py-1"><span>Total Waktu Produktif:</span> <strong>${formatDurasi(totalDurasiMs)}</strong></p><p class="flex justify-between py-1"><span>Tugas Selesai:</span> <strong>${kegiatanSelesai.length}</strong></p>`;
        if (statistikChart) statistikChart.destroy();
        statistikChart = new Chart(statistikChartCanvas, { type: 'doughnut', data: { labels: Object.keys(durasiPerKategori), datasets: [{ data: Object.values(durasiPerKategori), backgroundColor: Object.keys(durasiPerKategori).map(label => getWarnaKategori(label, true)), borderColor: '#ffffff', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 15 } }, tooltip: { callbacks: { label: (context) => ` ${context.label}: ${formatDurasi(context.raw)}` } } } } });
    }

    async function tambahProyek() {
        const namaProyek = inputProyek.value.trim();
        if (!namaProyek || !currentUser) return;
        const isDuplicate = daftarProyek.some(p => p.nama.toLowerCase() === namaProyek.toLowerCase());
        if (isDuplicate) {
            return showCustomAlert(`Proyek dengan nama "${namaProyek}" sudah ada.`, "Gagal Menambah");
        }
        try {
            await addDoc(collection(db, "users", currentUser.uid, "projects"), {
                nama: namaProyek,
                isCollapsed: false,
                createdAt: serverTimestamp()
            });
            inputProyek.value = '';
        } catch (e) {
            console.error("Error menambah proyek: ", e);
            showCustomAlert("Gagal menambah proyek ke database.", "Error");
        }
    }

    async function tambahKegiatan() {
        const teksKegiatan = inputKegiatan.value.trim();
        if (teksKegiatan === '' || !currentUser) {
            return showCustomAlert('Nama kegiatan tidak boleh kosong.');
        }
        const [jam, menit] = inputWaktu.value.split(':');
        const tanggalKegiatan = new Date(currentDate);
        if (inputWaktu.value) {
            tanggalKegiatan.setHours(parseInt(jam, 10), parseInt(menit, 10), 0, 0);
        }
        try {
            await addDoc(collection(db, "users", currentUser.uid, "activities"), {
                teks: teksKegiatan,
                kategori: inputKategori.value,
                proyekId: pilihProyek.value !== 'none' ? pilihProyek.value : null,
                selesai: false,
                durasi: null,
                isEditing: false,
                isFocusing: false,
                focusEndTime: null,
                createdAt: Timestamp.fromDate(tanggalKegiatan),
                waktuSelesai: null
            });
            inputKegiatan.value = '';
            inputWaktu.value = '';
            inputKegiatan.focus();
        } catch (e) {
            console.error("Error menambah kegiatan: ", e);
            showCustomAlert("Gagal menambah kegiatan ke database.", "Error");
        }
    }

    // DIPERBARUI TOTAL: Logika klik yang lebih benar
    async function handleListClick(e) {
        if (!currentUser) return;
        const target = e.target;

        // Cek klik pada tombol hapus proyek (paling spesifik)
        if (target.matches('.tombol-hapus-proyek, .tombol-hapus-proyek *')) {
            e.stopPropagation(); // Mencegah event lain terpicu
            const liProyek = target.closest('li.list-proyek');
            if (!liProyek) return;
            const proyekId = liProyek.dataset.proyekId;
            const proyek = daftarProyek.find(p => p.id === proyekId);
            const confirmation = await showCustomConfirm(`Yakin ingin menghapus proyek "${proyek.nama}"? Ini akan menghapus semua tugas di dalamnya.`, "Hapus Proyek");
            if (confirmation) hapusProyekDanKegiatannya(proyekId);
            return; // Hentikan fungsi setelah ini
        }

        // Cek klik pada header proyek untuk buka/tutup
        if (target.closest('.judul-proyek-container')) {
            const liProyek = target.closest('li.list-proyek');
            if (!liProyek) return;
            const proyekId = liProyek.dataset.proyekId;
            const proyek = daftarProyek.find(p => p.id === proyekId);
            await updateDoc(doc(db, "users", currentUser.uid, "projects", proyekId), { isCollapsed: !proyek.isCollapsed });
            return; // Hentikan fungsi setelah ini
        }

        // Cek klik pada item kegiatan
        const liKegiatan = target.closest('li[data-kegiatan-id]');
        if (liKegiatan) {
            const kegiatanId = liKegiatan.dataset.kegiatanId;
            const kegiatan = daftarKegiatan.find(k => k.id === kegiatanId);
            const docRef = doc(db, "users", currentUser.uid, "activities", kegiatanId);
            if (target.matches('.tombol-selesai, .tombol-selesai *')) {
                const waktuSelesai = new Date();
                await updateDoc(docRef, {
                    selesai: true,
                    durasi: waktuSelesai.getTime() - kegiatan.createdAt.toDate().getTime(),
                    waktuSelesai: Timestamp.fromDate(waktuSelesai)
                });
            } else if (target.matches('.tombol-hapus, .tombol-hapus *')) {
                const confirmation = await showCustomConfirm(`Yakin ingin menghapus kegiatan "${kegiatan.teks}"?`, "Hapus Kegiatan");
                if (confirmation) await deleteDoc(docRef);
            } else if (target.matches('.tombol-edit-kegiatan, .tombol-edit-kegiatan *')) {
                await updateDoc(docRef, { isEditing: true });
            } else if (target.matches('.tombol-simpan-edit, .tombol-simpan-edit *')) {
                const newText = liKegiatan.querySelector('.input-edit-kegiatan').value.trim();
                if (newText) await updateDoc(docRef, { teks: newText, isEditing: false });
            } else if (target.matches('.tombol-fokus, .tombol-fokus *')) {
                const durasiMenit = await showCustomPrompt("Atur timer fokus (menit):", "Fokus Mode", "25");
                if (durasiMenit && !isNaN(parseInt(durasiMenit, 10)) && parseInt(durasiMenit, 10) > 0) {
                    if (Notification.permission !== 'granted') await requestNotificationPermission();
                    const waktuSelesaiFokus = new Date(Date.now() + parseInt(durasiMenit, 10) * 60 * 1000);
                    await updateDoc(docRef, {
                        isFocusing: true,
                        focusEndTime: Timestamp.fromDate(waktuSelesaiFokus)
                    });
                }
            } else if (target.matches('.tombol-batal-fokus, .tombol-batal-fokus *')) {
                await updateDoc(docRef, { isFocusing: false, focusEndTime: null });
            }
        }
    }

    async function hapusProyekDanKegiatannya(proyekId) {
        const batch = writeBatch(db);
        batch.delete(doc(db, "users", currentUser.uid, "projects", proyekId));
        const snapshot = await getDocs(query(collection(db, "users", currentUser.uid, "activities"), where("proyekId", "==", proyekId)));
        snapshot.forEach(doc => batch.delete(doc.ref));
        try { await batch.commit(); } catch (e) { console.error("Gagal hapus proyek: ", e); }
    }

    function timerLoop() {
        let adaFokusAktif = false;
        const sekarang = Date.now();
        daftarKegiatan.forEach(kegiatan => {
            if (kegiatan.isFocusing && kegiatan.focusEndTime) {
                adaFokusAktif = true;
                const sisaWaktu = kegiatan.focusEndTime.toDate().getTime() - sekarang;
                const timerElement = document.getElementById(`timer-${kegiatan.id}`);
                if (sisaWaktu > 0) {
                    const waktuTampil = formatSisaWaktu(sisaWaktu);
                    if (timerElement) timerElement.textContent = waktuTampil;
                    document.title = `${waktuTampil} - ${kegiatan.teks}`;
                } else {
                    document.title = "Selesai! - Activity Logger";
                    if (kegiatan.isFocusing) {
                        kirimNotifikasiFokusSelesai(kegiatan);
                        updateDoc(doc(db, "users", currentUser.uid, "activities", kegiatan.id), {
                            isFocusing: false,
                            selesai: true,
                            durasi: kegiatan.focusEndTime.toDate().getTime() - kegiatan.createdAt.toDate().getTime(),
                            waktuSelesai: kegiatan.focusEndTime
                        });
                    }
                }
            }
        });
        if (!adaFokusAktif && document.title !== "Activity Logger Pro") document.title = "Activity Logger Pro";
    }

    async function requestNotificationPermission() { if ("Notification" in window && Notification.permission === 'default') await Notification.requestPermission(); }
    function kirimNotifikasiFokusSelesai(kegiatan) {
        if (Notification.permission === 'granted') new Notification("⏰ Sesi Fokus Selesai!", { body: `Kerja bagus! Kegiatan "${kegiatan.teks}" telah ditandai selesai.`, icon: "images/icon-192.png" });
        else new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg').play();
    }

    // === HELPER FUNCTIONS ===
    function isSameDay(date1, date2) {
        if (!date1 || !date2) return false;
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
    function getWarnaKategori(kategori, isHex = false) {
        const warna = { 'Pekerjaan': { bg: 'bg-blue-500', hex: '#3B82F6' }, 'Belajar': { bg: 'bg-green-500', hex: '#22C55E' }, 'Pribadi': { bg: 'bg-yellow-400', hex: '#FACC15' }, 'Istirahat': { bg: 'bg-indigo-500', hex: '#6366F1' }, 'Lainnya': { bg: 'bg-slate-500', hex: '#64748B' } };
        const selectedColor = warna[kategori] || warna['Lainnya'];
        return isHex ? selectedColor.hex : selectedColor.bg;
    }
    function formatDurasi(ms) {
        if (!ms || ms < 1000) return 'beberapa saat';
        let totalMenit = Math.round(ms / 60000);
        if (totalMenit < 1) return '< 1 menit';
        const jam = Math.floor(totalMenit / 60);
        const menit = totalMenit % 60;
        let hasil = [];
        if (jam > 0) hasil.push(`${jam} jam`);
        if (menit > 0) hasil.push(`${menit} menit`);
        return hasil.join(' ');
    }
    function formatSisaWaktu(ms) {
        const menit = Math.floor(ms / 60000).toString().padStart(2, '0');
        const detik = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
        return `${menit}:${detik}`;
    }
    function formatJam(date) {
        if (!date) return '';
        const d = date.toDate();
        const jam = d.getHours().toString().padStart(2, '0');
        const menit = d.getMinutes().toString().padStart(2, '0');
        return `Jam ${jam}.${menit}`;
    }

    function generateTeks() {
        const namaTampilan = userProfile.customName || currentUser.displayName || currentUser.email.split('@')[0];
        let teksFinal = `*Laporan Kegiatan Harian*\nNama: ${namaTampilan}\nTanggal: ${tanggalHariIniElement.textContent}\n\n`;
        const formatKegiatan = (k) => {
            let detailWaktu = '';
            if (k.selesai && k.createdAt && k.waktuSelesai) {
                detailWaktu = `(mulai: ${formatJam(k.createdAt)} sampai ${formatJam(k.waktuSelesai)}) (durasi: ${formatDurasi(k.durasi)})`;
            } else if (k.createdAt) {
                detailWaktu = `(mulai: ${formatJam(k.createdAt)})`;
            }
            return `- ${k.teks} ${detailWaktu}\n`;
        };
        daftarProyek.forEach(proyek => {
            const subTugas = daftarKegiatan.filter(k => k.proyekId === proyek.id);
            if(subTugas.length > 0) {
                teksFinal += `*PROYEK: ${proyek.nama}*\n`;
                subTugas.forEach(k => { teksFinal += formatKegiatan(k); });
                teksFinal += '\n';
            }
        });
        const kegiatanLain = daftarKegiatan.filter(k => !k.proyekId);
        if (kegiatanLain.length > 0) {
            teksFinal += '*KEGIATAN LAIN:*\n';
            kegiatanLain.forEach(k => { teksFinal += formatKegiatan(k); });
        }
        hasilTeks.value = teksFinal;
    }

    function salinTeks(elementId) {
        const textarea = document.getElementById(elementId);
        if (!textarea.value) return showCustomAlert("Tidak ada teks untuk disalin.", "Perhatian");
        navigator.clipboard.writeText(textarea.value)
            .then(() => showCustomAlert("Teks berhasil disalin ke clipboard!", "Sukses"))
            .catch(err => {
                console.error('Gagal menyalin teks: ', err);
                showCustomAlert("Gagal menyalin teks.", "Error");
            });
    }

    function renderProyekDropdown() {
        const selectedValue = pilihProyek.value;
        pilihProyek.innerHTML = '<option value="none">-- Tanpa Proyek --</option>';
        daftarProyek.forEach(proyek => {
            const option = document.createElement('option');
            option.value = proyek.id;
            option.textContent = proyek.nama;
            pilihProyek.appendChild(option);
        });
        pilihProyek.value = selectedValue;
    }
}

// --- Letakkan kode ini di bagian paling bawah script.js ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('Service Worker terdaftar dengan scope:', registration.scope);
    }).catch(error => {
      console.log('Pendaftaran Service Worker gagal:', error);
    });
  });
}
// --- Akhir dari kode yang perlu ditambahkan ---

// --- START THE APP ---
enableIndexedDbPersistence(db)
    .then(() => {
        console.log("Persistensi offline Firebase berhasil diaktifkan.");
    })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Firebase offline gagal, tab lain mungkin terbuka.");
        } else if (err.code == 'unimplemented') {
            console.log("Browser ini tidak mendukung persistensi offline.");
        }
    })
    .finally(() => {
        runApp();
    });
