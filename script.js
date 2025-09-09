// Impor fungsi-fungsi yang kita butuhkan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { Cloudinary } from "https://esm.sh/@cloudinary/url-gen@1.19.0";
import { scale } from "https://esm.sh/@cloudinary/url-gen@1.19.0/actions/resize";

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyB4Owqi9BzTiiIEn-uFO_3LR0-M-cUNXuU",
  authDomain: "project-hub-59deb.firebaseapp.com",
  projectId: "project-hub-59deb",
  storageBucket: "project-hub-59deb.firebasestorage.app",
  messagingSenderId: "774293207846",
  appId: "1:774293207846:web:212bce38412f28041cdfe7",
  measurementId: "G-9YD95MKGGZ",
};

const cld = new Cloudinary({
  cloud: {
    cloudName: "dkrdaeldf",
  },
});

// --- KREDENSIAL CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = "dkrdaeldf";
const CLOUDINARY_UPLOAD_PRESET = "project-hub";

// --- DAFTAR KATEGORI YANG TERSEDIA ---
const availableCategories = [
  "Web App",
  "Mobile App",
  "Desain Grafis",
  "UI/UX",
  "Lainnya",
];

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const projectsCollectionRef = collection(db, "projects");

// --- [TAMBAHAN] Fungsi untuk optimasi URL gambar ---
/**
 * Mengubah URL asli Cloudinary menjadi URL yang dioptimasi
 * @param {string} originalUrl - URL gambar asli dari Firestore.
 * @param {number} width - Lebar gambar yang diinginkan.
 * @returns {string} URL gambar yang sudah dioptimasi.
 */
// --- [MODIFIKASI] Fungsi untuk optimasi URL gambar ---
const createOptimizedImageUrl = (originalUrl, width = 800) => {
  if (!originalUrl || !originalUrl.includes("res.cloudinary.com")) {
    return originalUrl || "https://via.placeholder.com/400x200?text=No+Image";
  }
  const publicId = originalUrl.split("/upload/").pop();

  // Langsung panggil scale() karena sudah kita import
  return cld
    .image(publicId)
    .resize(scale().width(width))
    .quality("auto")
    .format("auto")
    .toURL();
};

// --- Mulai Logika Aplikasi ---
document.addEventListener("DOMContentLoaded", () => {
  // --- LOGIKA HALAMAN PUBLIK (index.html) ---
  const publicProjectList = document.getElementById("project-list");
  if (publicProjectList) {
    const projectsPerPage = 6;
    let currentPage = 1;
    let allProjects = [];
    let currentlyDisplayedProjects = [];

    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const pageIndicator = document.getElementById("page-indicator");
    const filterContainer = document.getElementById("filter-buttons");
    const searchInput = document.getElementById("search-input");
    const searchContainer = document.querySelector(".search-container");

    const renderProjects = () => {
      publicProjectList.innerHTML = "";
      pageIndicator.textContent = `Halaman ${currentPage}`;

      const startIndex = (currentPage - 1) * projectsPerPage;
      const endIndex = startIndex + projectsPerPage;
      const projectsToRender = currentlyDisplayedProjects.slice(
        startIndex,
        endIndex
      );

      if (projectsToRender.length === 0) {
        publicProjectList.innerHTML =
          "<p>Tidak ada proyek yang cocok dengan kriteria Anda.</p>";
      } else {
        projectsToRender.forEach((project) => {
          const projectCard = document.createElement("a");
          projectCard.href = `detail.html?id=${project.id}`;
          projectCard.className = "project-card";

          const isFeatured = project.isFeatured
            ? '<div class="featured-tag">★ Unggulan</div>'
            : "";

          const shortDescription =
            project.description.replace(/<[^>]*>/g, "").substring(0, 100) +
            "...";
          const optimizedImageUrl = createOptimizedImageUrl(
            project.mainImageUrl,
            600
          ); // 600px cukup untuk kartu

          projectCard.innerHTML = `
                    ${isFeatured}
                    <img src="${optimizedImageUrl}" alt="${project.title}">
                    <div class="project-info">
                        <h3>${project.title}</h3>
                        <p>${shortDescription}</p>
                        <div class="project-footer">
                            <span class="category-badge">${
                              project.category
                            }</span>
                            <span class="category-badge status-badge ${project.status.toLowerCase()}">${
            project.status
          }</span>
                        </div>
                    </div>
                `;

          publicProjectList.appendChild(projectCard);
        });
      }

      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = endIndex >= currentlyDisplayedProjects.length;
    };

    const applyFiltersAndRender = () => {
      const selectedCategory =
        document.querySelector(".filter-btn.active").dataset.category;
      const searchTerm = searchInput.value.toLowerCase();

      let filteredProjects = allProjects;

      // 1. Filter berdasarkan kategori
      if (selectedCategory !== "Semua") {
        filteredProjects = filteredProjects.filter(
          (p) => p.category === selectedCategory
        );
      }

      // 2. Filter berdasarkan pencarian
      if (searchTerm) {
        filteredProjects = filteredProjects.filter(
          (p) =>
            p.title.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm)
        );
      }

      // --- PERBAIKAN DI SINI ---
      // 3. Urutkan SEMUA hasil filter, dahulukan yang unggulan
      filteredProjects.sort(
        (a, b) => (b.isFeatured || false) - (a.isFeatured || false)
      );

      // 4. Setelah diurutkan, baru tetapkan sebagai daftar yang akan dipaginasi
      currentlyDisplayedProjects = filteredProjects;

      // 5. Reset ke halaman 1 dan render
      currentPage = 1;
      renderProjects();
    };

    const createFilterButtons = (projects) => {
      const categories = [
        "Semua",
        ...new Set(projects.map((p) => p.category).filter(Boolean)),
      ];
      filterContainer.innerHTML = "";
      categories.forEach((category) => {
        const button = document.createElement("button");
        button.className = "filter-btn";
        button.textContent = category;
        button.dataset.category = category;
        if (category === "Semua") button.classList.add("active");
        filterContainer.appendChild(button);
      });
      filterContainer.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") {
          document
            .querySelectorAll(".filter-btn")
            .forEach((btn) => btn.classList.remove("active"));
          e.target.classList.add("active");
          applyFiltersAndRender();
        }
      });
    };

    const loadAllProjects = async () => {
      publicProjectList.innerHTML = "<p>Memuat proyek...</p>";
      try {
        const q = query(projectsCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        allProjects = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (allProjects.length === 0) {
          document.getElementById("no-projects-message").style.display =
            "block";
          publicProjectList.innerHTML = "";
          filterContainer.style.display = "none";
          searchContainer.style.display = "none";
        } else {
          createFilterButtons(allProjects);
          searchInput.addEventListener("input", applyFiltersAndRender);
          applyFiltersAndRender();
        }
      } catch (error) {
        console.error("Error fetching projects: ", error);
        publicProjectList.innerHTML = "<p>Gagal memuat proyek.</p>";
      }
    };

    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderProjects();
        searchContainer.scrollIntoView({ behavior: "smooth" });
      }
    });

    nextBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(
        currentlyDisplayedProjects.length / projectsPerPage
      );
      if (currentPage < totalPages) {
        currentPage++;
        renderProjects();
        searchContainer.scrollIntoView({ behavior: "smooth" });
      }
    });

    loadAllProjects();
  }

  // --- LOGIKA HALAMAN LOGIN (login.html) ---
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;
      const errorMessage = document.getElementById("error-message");
      const submitButton = loginForm.querySelector("button");
      submitButton.disabled = true;
      submitButton.textContent = "Logging in...";
      signInWithEmailAndPassword(auth, email, password)
        .then(() => {
          window.location.href = "admin.html";
        })
        .catch(() => {
          errorMessage.textContent = "Email atau password salah!";
          errorMessage.style.display = "block";
          submitButton.disabled = false;
          submitButton.textContent = "Login";
        });
    });
  }

  // GANTI SELURUH BLOK INI DI script.js

  // --- LOGIKA HALAMAN ADMIN (admin.html) ---
  const mainImagePreviewContainer = document.getElementById(
    "main-image-preview-container"
  );
  const adminProjectList = document.getElementById("admin-project-list");
  if (adminProjectList) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // --- [MODIFIKASI] Ambil elemen UI baru dari admin.html ---
        document.getElementById("admin-email").textContent = user.email;

        const projectForm = document.getElementById("project-form");
        const formContainer = document.getElementById("project-form-container");
        const formTitle = document.getElementById("form-title");
        const clearFormBtn = document.getElementById("clear-form-btn");
        const submitBtn = document.getElementById("submit-btn"); // Ganti nama variabel agar lebih jelas

        document.getElementById("logout-btn").addEventListener("click", () => {
          signOut(auth).then(() => {
            window.location.href = "login.html";
          });
        });

        const categorySelect = document.getElementById("project-category");
        if (categorySelect.options.length <= 1) {
          availableCategories.forEach((category) => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
          });
        }

        const galleryPreviewContainer = document.getElementById(
          "gallery-preview-container"
        );
        new Sortable(galleryPreviewContainer, {
          animation: 150, // Animasi saat gambar digeser
          ghostClass: "sortable-ghost", // Style untuk bayangan item yang digeser
        });

        const renderGalleryPreview = (imageUrls = []) => {
          galleryPreviewContainer.innerHTML = ""; // Kosongkan dulu
          imageUrls.forEach((url) => {
            const wrapper = document.createElement("div");
            wrapper.className = "gallery-image-wrapper";
            wrapper.innerHTML = `
            <img src="${url.replace(
              "/upload/",
              "/upload/w_150,h_150,c_fill/"
            )}" alt="Pratinjau Galeri">
            <button type="button" class="delete-gallery-img-btn" data-url="${url}">&times;</button>
        `;
            galleryPreviewContainer.appendChild(wrapper);
          });
        };

        // --- [TAMBAHAN] Event listener untuk menghapus gambar dari pratinjau ---
        galleryPreviewContainer.addEventListener("click", (e) => {
          if (e.target.classList.contains("delete-gallery-img-btn")) {
            // Hapus elemen dari tampilan
            e.target.parentElement.remove();
          }
        });

        const renderMainImagePreview = (url) => {
          mainImagePreviewContainer.innerHTML = "";
          if (url) {
            const wrapper = document.createElement("div");
            wrapper.className = "gallery-image-wrapper"; // Kita pakai style yang sama
            wrapper.innerHTML = `
            <img src="${url.replace(
              "/upload/",
              "/upload/w_150,h_150,c_fill/"
            )}" alt="Pratinjau Gambar Utama">
            <button type="button" class="delete-gallery-img-btn">&times;</button>
        `;
            mainImagePreviewContainer.appendChild(wrapper);
          }
        };

        // Tambahkan event listener untuk menghapus pratinjau gambar utama
        mainImagePreviewContainer.addEventListener("click", (e) => {
          if (e.target.classList.contains("delete-gallery-img-btn")) {
            renderMainImagePreview(null); // Kosongkan pratinjau
            document.getElementById("project-image-old-url").value = ""; // KOSONGKAN URL LAMA!
          }
        });

        // --- [FUNGSI BARU] Untuk membersihkan dan mereset state form ---
        const resetFormState = () => {
          projectForm.reset();
          tinymce.get("project-description").setContent("");
          document.getElementById("project-id").value = "";
          document.getElementById("project-image-old-url").value = "";
          renderMainImagePreview(null);

          formTitle.textContent = "Tambah Proyek Baru";
          submitBtn.textContent = "Simpan Proyek";
          clearFormBtn.style.display = "none";
          formContainer.classList.remove("editing-mode");
          renderGalleryPreview();
          // Opsi: scroll kembali ke atas form jika di layar kecil
          if (window.innerWidth < 1024) {
            formContainer.scrollIntoView({ behavior: "smooth" });
          }
        };

        // --- [MODIFIKASI] Tampilan daftar proyek lebih informatif ---
        const renderAdminProjects = async () => {
          adminProjectList.innerHTML = "Memuat proyek...";
          const q = query(projectsCollectionRef, orderBy("createdAt", "desc"));
          const querySnapshot = await getDocs(q);
          const projects = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          adminProjectList.innerHTML = "";
          projects.forEach((project) => {
            const item = document.createElement("div");
            item.className = "admin-project-list-item";
            item.innerHTML = `
                <div class="admin-project-details">
                    <h4>${project.title}</h4>
                    <div class="admin-project-meta">
                        <span>Kategori: <strong>${
                          project.category || "N/A"
                        }</strong></span>
                        <span>Status: <strong>${
                          project.status || "N/A"
                        }</strong></span>
                    </div>
                </div>
                <div class="admin-project-actions">
                    <button class="edit-btn" data-id="${
                      project.id
                    }">Edit</button>
                    <button class="delete-btn" data-id="${
                      project.id
                    }">Hapus</button>
                </div>
            `;
            adminProjectList.appendChild(item);
          });
        };

        // --- [TAMBAHAN] Event listener untuk tombol "Batal Edit" ---
        clearFormBtn.addEventListener("click", resetFormState);

        projectForm.addEventListener("submit", async (e) => {
          e.preventDefault();

          const descriptionContent = tinymce
            .get("project-description")
            .getContent();
          if (!descriptionContent) {
            Swal.fire({
              title: "Oops...",
              text: "Deskripsi Proyek tidak boleh kosong!",
              icon: "error",
            });
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = "Menyimpan...";

          try {
            const uploadToCloudinary = async (file) => {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
              const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                { method: "POST", body: formData }
              );
              if (!response.ok) throw new Error("Gagal upload ke Cloudinary");
              const data = await response.json();
              return data.secure_url;
            };

            const existingGalleryUrls = Array.from(
              galleryPreviewContainer.querySelectorAll(
                ".delete-gallery-img-btn"
              )
            ).map((btn) => btn.dataset.url);

            // 2. Upload gambar BARU yang dipilih pengguna (jika ada)
            let newGalleryImageUrls = [];
            const galleryImageFiles =
              document.getElementById("project-images").files;
            if (galleryImageFiles.length > 0) {
              for (const file of galleryImageFiles) {
                const url = await uploadToCloudinary(file);
                newGalleryImageUrls.push(url);
              }
            }

            let mainImageUrl = document.getElementById(
              "project-image-old-url"
            ).value;
            let galleryImageUrls = [];

            const mainImageFile =
              document.getElementById("project-image").files[0];
            if (mainImageFile)
              mainImageUrl = await uploadToCloudinary(mainImageFile);

            const projectData = {
              title: document.getElementById("project-title").value,
              description: tinymce.get("project-description").getContent(),
              link: document.getElementById("project-link").value,
              category: document.getElementById("project-category").value,
              status: document.getElementById("project-status").value,
              rating: document.getElementById("project-rating").value,
              mainImageUrl: mainImageUrl,
              isFeatured: document.getElementById("project-featured").checked,
              galleryImageUrls: [
                ...existingGalleryUrls,
                ...newGalleryImageUrls,
              ],
              // Jangan update createdAt saat edit
            };

            const projectId = document.getElementById("project-id").value;
            if (projectId) {
              const projectDoc = doc(db, "projects", projectId);
              const existingDoc = await getDoc(projectDoc);
              const existingData = existingDoc.data();
              projectData.galleryImageUrls = [
                ...(existingData.galleryImageUrls || []),
                ...galleryImageUrls,
              ];
              // Pertahankan createdAt yang lama
              projectData.createdAt = existingData.createdAt;
              await updateDoc(projectDoc, projectData);
            } else {
              projectData.galleryImageUrls = galleryImageUrls;
              projectData.createdAt = new Date(); // createdAt hanya untuk proyek baru
              await addDoc(projectsCollectionRef, projectData);
            }

            // --- [MODIFIKASI] Gunakan fungsi reset yang baru ---
            resetFormState();
            await renderAdminProjects();
            Swal.fire(
              "Berhasil!",
              "Proyek telah berhasil disimpan.",
              "success"
            );
          } catch (error) {
            console.error("Error saving project: ", error);
            Swal.fire(
              "Gagal Menyimpan",
              "Terjadi kesalahan. Silakan coba lagi.",
              "error"
            );
          } finally {
            submitBtn.disabled = false;
            // State tombol kembali diatur oleh resetFormState()
          }
        });

        adminProjectList.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          if (!id) return;

          const projectDocRef = doc(db, "projects", id);

          if (e.target.classList.contains("delete-btn")) {
            Swal.fire({
              title: "Apakah Anda Yakin?",
              text: "Proyek ini akan dihapus permanen.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#3085d6",
              cancelButtonColor: "#d33",
              confirmButtonText: "Ya, hapus!",
              cancelButtonText: "Batal",
            }).then(async (result) => {
              if (result.isConfirmed) {
                await deleteDoc(projectDocRef);
                await renderAdminProjects();
                Swal.fire(
                  "Dihapus!",
                  "Proyek Anda telah berhasil dihapus.",
                  "success"
                );
              }
            });
          }

          if (e.target.classList.contains("edit-btn")) {
            const docSnap = await getDoc(projectDocRef);
            if (docSnap.exists()) {
              const project = docSnap.data();
              document.getElementById("project-id").value = id;
              document.getElementById("project-title").value = project.title;
              tinymce
                .get("project-description")
                .setContent(project.description || "");
              document.getElementById("project-link").value = project.link;
              document.getElementById("project-category").value =
                project.category || "";
              document.getElementById("project-status").value =
                project.status || "";
              document.getElementById("project-rating").value =
                project.rating || "";
              document.getElementById("project-image-old-url").value =
                project.mainImageUrl;
              document.getElementById("project-featured").checked =
                project.isFeatured || false;
              renderMainImagePreview(project.mainImageUrl);
              renderGalleryPreview(project.galleryImageUrls);
              // --- [MODIFIKASI] Logika untuk masuk ke mode edit ---
              formTitle.textContent = `Mengedit: ${project.title}`;
              submitBtn.textContent = "Update Proyek";
              clearFormBtn.style.display = "block";
              formContainer.classList.add("editing-mode");
              formContainer.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          }
        });

        renderAdminProjects();
      } else {
        Swal.fire({
          title: "Akses Ditolak",
          text: "Anda harus login untuk mengakses halaman ini.",
          icon: "warning",
          confirmButtonText: "OK",
        }).then(() => {
          window.location.href = "login.html";
        });
      }
    });
  }
});
