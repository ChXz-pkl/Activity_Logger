// MODIFIKASI: Menggunakan nama fungsi yang benar -> enableIndexedDbPersistence
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch, where, getDocs, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBellkuYYMVFULmdBb8zPJ6CcwZOywpQyw",
    authDomain: "activity-logger-8576d.firebaseapp.com",
    projectId: "activity-logger-8576d",
    storageBucket: "activity-logger-8576d.appspot.com",
    messagingSenderId: "841728671208",
    appId: "1:841728671208:web:abc88d3a9593b7453c385d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// MODIFIKASI: Memanggil fungsi yang benar -> enableIndexedDbPersistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Kemungkinan karena tab lain sudah terbuka dengan pengaturan berbeda
        console.warn("Firebase offline persistence gagal, kemungkinan tab lain terbuka.");
    } else if (err.code == 'unimplemented') {
        // Browser tidak mendukung fitur ini
        console.log("Browser ini tidak mendukung offline persistence.");
    }
});


// === STATE APLIKASI ===
let currentUser = null;
let daftarKegiatan = [];
let daftarProyek = [];
let timerInterval = null;
let statistikChart = null;
let unsubscribeProjects = () => {};
let unsubscribeActivities = () => {};
let currentDate = new Date(); // State untuk menyimpan tanggal yang sedang ditampilkan

// === ELEMEN DOM ===
const namaUserElement = document.getElementById('nama-user');
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
const hasilTeks = document.getElementById('hasil-teks');
const statistikChartCanvas = document.getElementById('statistik-chart').getContext('2d');
const kontenStatistikTeks = document.getElementById('konten-statistik-teks');

// === FUNGSI UTAMA ===

// Inisialisasi setelah autentikasi
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        namaUserElement.textContent = `Chx!`;
        setupAplikasi();
    } else {
        signInAnonymously(auth).catch((error) => console.error("Gagal login anonim:", error));
    }
});

function setupAplikasi() {
    setupEventListeners();
    setTanggal(new Date()); // Mulai dengan tanggal hari ini
    if (!timerInterval) {
        timerInterval = setInterval(timerLoop, 1000);
    }
    requestNotificationPermission();

    // Mendaftarkan Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker berhasil didaftarkan: ', registration.scope);
                })
                .catch(error => {
                    console.log('Pendaftaran Service Worker gagal: ', error);
                });
        });
    }
}


// Fungsi untuk mengatur tanggal dan memuat ulang data
function setTanggal(newDate) {
    currentDate = new Date(newDate.setHours(0, 0, 0, 0));
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    tanggalHariIniElement.textContent = currentDate.toLocaleDateString('id-ID', options);
    
    // Nonaktifkan tombol 'berikutnya' jika tanggal adalah hari ini
    tombolHariBerikutnya.disabled = isToday(currentDate);
    tombolHariBerikutnya.style.opacity = isToday(currentDate) ? 0.5 : 1;
    tombolHariBerikutnya.style.cursor = isToday(currentDate) ? 'not-allowed' : 'pointer';
    
    setupRealtimeListeners();
}

function isToday(date) {
    const today = new Date();
    return date.setHours(0,0,0,0) === today.setHours(0,0,0,0);
}

// Listener sekarang dinamis berdasarkan tanggal
function setupRealtimeListeners() {
    // Hentikan listener sebelumnya untuk menghindari kebocoran memori
    unsubscribeProjects();
    unsubscribeActivities();
    
    loadingElement.style.display = 'block';
    pesanKosongElement.style.display = 'none';
    daftarKegiatanElement.innerHTML = '';
    
    // Query untuk proyek tidak berubah, karena proyek tidak terikat tanggal
    const projectsQuery = query(collection(db, "users", currentUser.uid, "projects"), orderBy("createdAt", "asc"));
    
    // Query kegiatan sekarang berdasarkan rentang tanggal yang dipilih
    const startOfDay = currentDate;
    const endOfDay = new Date(currentDate);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const activitiesQuery = query(
        collection(db, "users", currentUser.uid, "activities"),
        where("activityDate", ">=", startOfDay),
        where("activityDate", "<", endOfDay),
        orderBy("activityDate", "asc")
    );

    unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
        daftarProyek = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSemua();
    });

    unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
        daftarKegiatan = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadingElement.style.display = 'none';
        
        const adaProyekHariIni = daftarProyek.some(p => daftarKegiatan.some(k => k.proyekId === p.id));
        pesanKosongElement.style.display = (daftarKegiatan.length === 0 && !adaProyekHariIni) ? 'block' : 'none';

        renderSemua();
    }, (error) => {
        console.error("Error pada listener kegiatan: ", error);
        loadingElement.textContent = "Gagal memuat data. Coba refresh.";
    });
}

function renderSemua() {
    renderProyekDropdown();
    renderDaftarUtama();
    perbaruiStatistik();
}


// === RENDER UI ===

function renderDaftarUtama() {
    daftarKegiatanElement.innerHTML = '';
    
    daftarProyek.forEach(proyek => {
        const subTugas = daftarKegiatan.filter(k => k.proyekId === proyek.id);
        if (subTugas.length > 0) {
            daftarKegiatanElement.appendChild(buatElemenProyek(proyek, subTugas));
        }
    });

    const kegiatanTanpaProyek = daftarKegiatan.filter(k => !k.proyekId);
    kegiatanTanpaProyek.forEach(kegiatan => {
        const liKegiatan = buatElemenKegiatan(kegiatan);
        liKegiatan.classList.add('bg-white', 'rounded-xl', 'shadow-sm', 'p-4');
        daftarKegiatanElement.appendChild(liKegiatan);
    });
}

function buatElemenProyek(proyek, subTugas) {
    const liProyek = document.createElement('li');
    liProyek.className = 'list-proyek bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300';
    liProyek.dataset.proyekId = proyek.id;

    const totalDurasiProyekMs = subTugas.filter(k => k.selesai && k.durasi).reduce((total, k) => total + k.durasi, 0);

    liProyek.innerHTML = `
        <div class="p-4 flex justify-between items-center bg-slate-50 cursor-pointer judul-proyek-container">
            <div class="flex items-center gap-3 flex-grow">
                <span class="toggle-proyek transform transition-transform ${proyek.isCollapsed ? '-rotate-90' : ''}">▼</span>
                <strong class="text-slate-900 text-lg">${proyek.nama}</strong>
            </div>
            <div class="flex items-center">
                <span class="text-sm text-slate-500 font-medium mr-2">Total: ${formatDurasi(totalDurasiProyekMs)}</span>
                <button title="Hapus proyek dan semua tugasnya" class="tombol-hapus-proyek text-xl text-red-500 hover:bg-red-100 rounded-full w-8 h-8 flex items-center justify-center">&times;</button>
            </div>
        </div>
        <ul class="list-subtugas p-4 pt-0 space-y-2 ${proyek.isCollapsed ? 'collapsed' : ''}">
            ${subTugas.map(k => buatElemenKegiatan(k, true).outerHTML).join('')}
        </ul>
    `;
    return liProyek;
}

function buatElemenKegiatan(kegiatan, isSubtugas = false) {
    const li = document.createElement('li');
    li.className = isSubtugas 
        ? 'flex flex-col gap-2 border-b border-slate-200 py-3 last:border-b-0'
        : 'flex flex-col gap-2';
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
    
    mainContent.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap flex-grow mr-2">
             ${kegiatan.kategori ? `<span class="kategori-tag text-xs font-bold px-2 py-1 rounded-full text-white ${getWarnaKategori(kegiatan.kategori)}">${kegiatan.kategori}</span>` : ''}
            ${teksElementHTML}
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
             ${!kegiatan.isEditing ? `<button title="Edit" class="tombol-edit-kegiatan p-1 text-slate-400 hover:text-blue-600">✏️</button>` : `<button title="Simpan" class="tombol-simpan-edit p-1 text-slate-400 hover:text-green-600">💾</button>`}
             <button title="Hapus" class="tombol-hapus p-1 text-slate-400 hover:text-red-600">🗑️</button>
        </div>
    `;

    const actionBar = document.createElement('div');
    actionBar.className = 'flex justify-end items-center gap-2';

    if (!kegiatan.selesai && !kegiatan.isEditing) {
        if (kegiatan.isFocusing) {
            actionBar.innerHTML = `
                <div class="timer-display font-bold text-xl text-red-500" id="timer-${kegiatan.id}">...</div>
                <button class="tombol-batal-fokus bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-3 rounded-md">Batal</button>
            `;
        } else {
            actionBar.innerHTML = `
                <button class="tombol-fokus bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold py-1 px-3 rounded-md">Fokus</button>
                <button class="tombol-selesai bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-md">Selesai</button>
            `;
        }
    }
    li.appendChild(mainContent);
    li.appendChild(actionBar);
    return li;
}


// === STATISTIK & GRAFIK ===

function perbaruiStatistik() {
    const kegiatanSelesai = daftarKegiatan.filter(k => k.selesai && k.durasi);
    if (kegiatanSelesai.length === 0) {
        kontenStatistikTeks.innerHTML = '<p>Selesaikan tugas untuk melihat statistik.</p>';
        if (statistikChart) statistikChart.destroy();
        statistikChart = null;
        return;
    }

    const durasiPerKategori = {};
    kegiatanSelesai.forEach(k => {
        const kategori = k.kategori || 'Lainnya';
        durasiPerKategori[kategori] = (durasiPerKategori[kategori] || 0) + k.durasi;
    });

    const totalDurasiMs = Object.values(durasiPerKategori).reduce((a, b) => a + b, 0);
    kontenStatistikTeks.innerHTML = `
        <p class="flex justify-between py-1"><span>Total Waktu Produktif:</span> <strong>${formatDurasi(totalDurasiMs)}</strong></p>
        <p class="flex justify-between py-1"><span>Tugas Selesai:</span> <strong>${kegiatanSelesai.length}</strong></p>
    `;

    const labels = Object.keys(durasiPerKategori);
    const data = Object.values(durasiPerKategori);
    const backgroundColors = labels.map(label => getWarnaKategori(label, true));

    if (statistikChart) statistikChart.destroy();
    
    statistikChart = new Chart(statistikChartCanvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#ffffff',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { padding: 15 } 
                },
                tooltip: { 
                    callbacks: { 
                        label: (context) => ` ${context.label}: ${formatDurasi(context.raw)}`
                    } 
                }
            }
        }
    });
}


// === LOGIKA AKSI (Create, Update, Delete) ===

async function tambahProyek() {
    const namaProyek = inputProyek.value.trim();
    if (!namaProyek) return;
    try {
        await addDoc(collection(db, "users", currentUser.uid, "projects"), {
            nama: namaProyek,
            isCollapsed: false,
            createdAt: serverTimestamp()
        });
        inputProyek.value = '';
    } catch (e) { console.error("Error: ", e); }
}

async function tambahKegiatan() {
    const teksKegiatan = inputKegiatan.value.trim();
    if (teksKegiatan === '') return alert('Nama kegiatan tidak boleh kosong.');

    const teksWaktu = inputWaktu.value.trim();
    const finalTeks = teksWaktu ? `${teksKegiatan} (mulai: ${teksWaktu})` : teksKegiatan;

    try {
        await addDoc(collection(db, "users", currentUser.uid, "activities"), {
            teks: finalTeks,
            kategori: inputKategori.value,
            proyekId: pilihProyek.value !== 'none' ? pilihProyek.value : null,
            selesai: false,
            durasi: null,
            isEditing: false,
            isFocusing: false,
            focusEndTime: null,
            createdAt: serverTimestamp(),
            activityDate: new Date(currentDate) // Menyimpan tanggal kegiatan
        });
        inputKegiatan.value = ''; inputWaktu.value = ''; inputKegiatan.focus();
    } catch (e) { console.error("Error menambah kegiatan: ", e); }
}

async function handleListClick(e) {
    const target = e.target;
    if (!currentUser) return;

    const liKegiatan = target.closest('li[data-kegiatan-id]');
    const liProyek = target.closest('li.list-proyek');

    if (target.closest('.judul-proyek-container')) {
        const proyekId = liProyek.dataset.proyekId;
        const proyek = daftarProyek.find(p => p.id === proyekId);
        const proyekRef = doc(db, "users", currentUser.uid, "projects", proyekId);
        await updateDoc(proyekRef, { isCollapsed: !proyek.isCollapsed });
        return;
    }
    
    if (target.matches('.tombol-hapus-proyek, .tombol-hapus-proyek *')) {
        const proyekId = liProyek.dataset.proyekId;
        const proyek = daftarProyek.find(p => p.id === proyekId);
        if (confirm(`Yakin ingin menghapus proyek "${proyek.nama}" dan SEMUA kegiatannya?`)) {
            hapusProyekDanKegiatannya(proyekId);
        }
        return;
    }
    
    if (liKegiatan) {
        const kegiatanId = liKegiatan.dataset.kegiatanId;
        const docRef = doc(db, "users", currentUser.uid, "activities", kegiatanId);
        const kegiatan = daftarKegiatan.find(k => k.id === kegiatanId);

        if (target.matches('.tombol-selesai, .tombol-selesai *')) {
            const waktuSelesai = new Date();
            const waktuMulai = kegiatan.createdAt.toDate();
            const durasiMs = waktuSelesai - waktuMulai;
            await updateDoc(docRef, { selesai: true, durasi: durasiMs });
        } else if (target.matches('.tombol-hapus, .tombol-hapus *')) {
            if (confirm(`Yakin ingin menghapus kegiatan "${kegiatan.teks}"?`)) {
                await deleteDoc(docRef);
            }
        } else if (target.matches('.tombol-edit-kegiatan, .tombol-edit-kegiatan *')) {
            await updateDoc(docRef, { isEditing: true });
        } else if (target.matches('.tombol-simpan-edit, .tombol-simpan-edit *')) {
            const newText = liKegiatan.querySelector('.input-edit-kegiatan').value.trim();
            if (newText) await updateDoc(docRef, { teks: newText, isEditing: false });
        } else if (target.matches('.tombol-fokus, .tombol-fokus *')) {
            const menit = prompt("Berapa menit sesi fokus Anda?", "25");
            const durasiMenit = parseInt(menit, 10);
            if (durasiMenit && durasiMenit > 0) {
                if (Notification.permission !== 'granted') await requestNotificationPermission();
                await updateDoc(docRef, { isFocusing: true, focusEndTime: new Date(Date.now() + durasiMenit * 60 * 1000) });
            }
        } else if (target.matches('.tombol-batal-fokus, .tombol-batal-fokus *')) {
            await updateDoc(docRef, { isFocusing: false, focusEndTime: null });
        }
    }
}

async function hapusProyekDanKegiatannya(proyekId) {
    const batch = writeBatch(db);
    const proyekRef = doc(db, "users", currentUser.uid, "projects", proyekId);
    batch.delete(proyekRef);

    const activitiesQuery = query(collection(db, "users", currentUser.uid, "activities"), where("proyekId", "==", proyekId));
    const snapshot = await getDocs(activitiesQuery);
    snapshot.forEach(doc => batch.delete(doc.ref));
    
    try {
        await batch.commit();
    } catch (e) {
        console.error("Gagal menghapus proyek: ", e);
    }
}

// === TIMER & NOTIFIKASI ===

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
                const docRef = doc(db, "users", currentUser.uid, "activities", kegiatan.id);
                // Cek sekali lagi untuk mencegah update ganda
                if (kegiatan.isFocusing) {
                    kirimNotifikasiFokusSelesai(kegiatan);
                    updateDoc(docRef, { isFocusing: false, selesai: true, durasi: kegiatan.focusEndTime.toDate().getTime() - kegiatan.createdAt.toDate().getTime() });
                }
            }
        }
    });
    if (!adaFokusAktif && document.title !== "Activity Logger Pro") {
        document.title = "Activity Logger Pro";
    }
}

async function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

function kirimNotifikasiFokusSelesai(kegiatan) {
    if (Notification.permission === 'granted') {
        const notif = new Notification("⏰ Sesi Fokus Selesai!", {
            body: `Kerja bagus! Kegiatan "${kegiatan.teks}" telah ditandai selesai.`,
            icon: "images/icon-192.png"
        });
    } else {
        new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg').play();
    }
}

// === FUNGSI BANTU (HELPERS) ===

function getWarnaKategori(kategori, isHex = false) {
    const warna = {
        'Pekerjaan': { bg: 'bg-blue-500', hex: '#3B82F6' },
        'Belajar': { bg: 'bg-green-500', hex: '#22C55E' },
        'Pribadi': { bg: 'bg-yellow-400', hex: '#FACC15' },
        'Istirahat': { bg: 'bg-indigo-500', hex: '#6366F1' },
        'Lainnya': { bg: 'bg-slate-500', hex: '#64748B' }
    };
    const defaultColor = warna['Lainnya'];
    const selectedColor = warna[kategori] || defaultColor;
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

function generateTeks() {
    let teksFinal = `Nama: Chx!\n`;
    teksFinal += `Tanggal: ${tanggalHariIniElement.textContent}\n\n`;
    daftarProyek.forEach(proyek => {
        const subTugas = daftarKegiatan.filter(k => k.proyekId === proyek.id);
        if(subTugas.length > 0) {
            teksFinal += `PROYEK: ${proyek.nama}\n`;
            subTugas.forEach(k => {
                teksFinal += `  - ${k.teks} ${k.selesai ? '(Selesai)' : ''}\n`;
            });
            teksFinal += '\n';
        }
    });
    const kegiatanLain = daftarKegiatan.filter(k => !k.proyekId);
    if (kegiatanLain.length > 0) {
        teksFinal += 'KEGIATAN LAIN:\n';
        kegiatanLain.forEach(k => {
            teksFinal += `- ${k.teks} ${k.selesai ? '(Selesai)' : ''}\n`;
        });
    }
    hasilTeks.value = teksFinal;
}

function salinTeks(elementId) {
    const textarea = document.getElementById(elementId);
    if (!textarea.value) return alert("Tidak ada teks untuk disalin.");
    navigator.clipboard.writeText(textarea.value)
        .then(() => alert("Teks berhasil disalin!"))
        .catch(err => console.error('Gagal menyalin teks: ', err));
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

// === EVENT LISTENERS ===
function setupEventListeners() {
    tombolTambahProyek.addEventListener('click', tambahProyek);
    tombolTambah.addEventListener('click', tambahKegiatan);
    daftarKegiatanElement.addEventListener('click', handleListClick);
    tombolGenerate.addEventListener('click', () => { 
        generateTeks(); 
        salinTeks('hasil-teks'); 
    });
    
    tombolHariSebelumnya.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        setTanggal(currentDate);
    });
    tombolHariBerikutnya.addEventListener('click', () => {
        if (isToday(currentDate)) return;
        currentDate.setDate(currentDate.getDate() + 1);
        setTanggal(currentDate);
    });
    
    inputProyek.addEventListener('keydown', e => { if (e.key === 'Enter') tambahProyek(); });
    inputKegiatan.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inputWaktu.focus(); } });
    inputWaktu.addEventListener('keydown', e => { if (e.key === 'Enter') tambahKegiatan(); });
}