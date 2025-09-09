// Impor fungsi-fungsi Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
    getFirestore, doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { Cloudinary } from "https://esm.sh/@cloudinary/url-gen@1.19.0";
import { scale } from "https://esm.sh/@cloudinary/url-gen@1.19.0/actions/resize";

// GANTI DENGAN KODE KONFIGURASI DARI PROYEK FIREBASE-MU!
const firebaseConfig = {
    apiKey: "AIzaSyB4Owqi9BzTiiIEn-uFO_3LR0-M-cUNXuU",
    authDomain: "project-hub-59deb.firebaseapp.com",
    projectId: "project-hub-59deb",
    storageBucket: "project-hub-59deb.firebasestorage.app",
    messagingSenderId: "774293207846",
    appId: "1:774293207846:web:212bce38412f28041cdfe7",
    measurementId: "G-9YD95MKGGZ"
};

// --- [MODIFIKASI] Inisialisasi Cloudinary & Fungsi Helper ---
const cld = new Cloudinary({
  cloud: {
    cloudName: 'dkrdaeldf'
  }
});

const createOptimizedImageUrl = (originalUrl, width = 1200) => {
    if (!originalUrl || !originalUrl.includes('res.cloudinary.com')) {
        return originalUrl;
    }
    const publicId = originalUrl.split('/upload/').pop();
    
    // Langsung panggil scale() karena sudah kita import
    return cld.image(publicId)
      .resize(scale().width(width))
      .quality('auto')
      .format('auto')
      .toURL();
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', async () => {
    // Ambil ID dari URL
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    if (!projectId) {
        document.getElementById('project-detail-container').innerHTML = '<h1>Proyek tidak ditemukan!</h1>';
        return;
    }

    try {
        // Ambil data proyek tunggal dari Firestore
        const projectDocRef = doc(db, 'projects', projectId);
        const docSnap = await getDoc(projectDocRef);

        if (docSnap.exists()) {
            const project = docSnap.data();

            // Isi halaman dengan data
            document.title = project.title; // Ganti judul tab browser
            document.getElementById('project-title').textContent = project.title;
            document.getElementById('project-description').innerHTML = project.description;
            document.getElementById('project-link').href = project.link;
            document.getElementById('project-category-badge').textContent = project.category;

            // --- MULAI TAMBAHKAN KODE INI ---
            const statusBadge = document.getElementById('project-status-badge');
            if (project.status) {
                statusBadge.textContent = project.status;
                statusBadge.style.display = 'inline-block'; // Tampilkan elemennya
            } else {
                statusBadge.style.display = 'none'; // Sembunyikan jika tidak ada data
            }

            const ratingBadge = document.getElementById('project-rating-badge');
            if (project.rating && project.rating > 0) {
                ratingBadge.innerHTML = `⭐ ${project.rating}`; // Pakai innerHTML untuk emoji
                ratingBadge.style.display = 'inline-block'; // Tampilkan elemennya
            } else {
                ratingBadge.style.display = 'none'; // Sembunyikan jika tidak ada data
            }
            // --- AKHIR DARI KODE TAMBAHAN ---

            const imagesWrapper = document.getElementById('project-images-wrapper');
            let imageUrls = [project.mainImageUrl, ...(project.galleryImageUrls || [])];

            imagesWrapper.innerHTML = ''; 
            imageUrls.forEach(url => {
                if (url) { 
                    const optimizedUrl = createOptimizedImageUrl(url, 1000); // Lebar 1000px untuk slider
                    const slide = document.createElement('div');
                    slide.className = 'swiper-slide';
                    slide.innerHTML = `<img src="${optimizedUrl}" alt="Gambar Proyek">`;
                    imagesWrapper.appendChild(slide);
                }
            });

            // Inisialisasi Swiper.js
            new Swiper('.swiper', {
                loop: true,
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
            });

        } else {
            document.getElementById('project-detail-container').innerHTML = '<h1>Proyek tidak ditemukan!</h1>';
        }
    } catch (error) {
        console.error("Error fetching project details: ", error);
        document.getElementById('project-detail-container').innerHTML = '<h1>Gagal memuat proyek.</h1>';
    }
});