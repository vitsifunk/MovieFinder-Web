// app.js

// --- Σταθερές & Ρυθμίσεις ---
// Κλειδί API για αιτήματα προς το The Movie Database
const API_KEY        = 'ea1354ce43e9b742162e412c02bbe4f3';
// Βασικό URL για τα API του TMDB
const BASE_URL       = 'https://api.themoviedb.org/3';
// Βασικό URL για φόρτωση εικόνων (προσαρμοσμένο μέγεθος)
const IMG_BASE_URL   = 'https://image.tmdb.org/t/p/w300';
// Placeholder για ταινίες χωρίς διαθέσιμο poster
const DEFAULT_POSTER = 'https://via.placeholder.com/300x450?text=No+Image';

// Για λεπτομέρειες modal: βάση URL + μεγέθη εικόνων
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const POSTER_SIZE    = 'w500';
const BACKDROP_SIZE  = 'original';

// --- Αντιστοίχιση ενότητας → ID κοντέινερ ---
// Χρησιμοποιείται για εμφάνιση/απόκρυψη τμημάτων της σελίδας
const sectionMap = {
  'featured':      'featured-section',      // Προτεινόμενες ταινίες
  'popular':       'popular-section',       // Δημοφιλείς ταινίες
  'new-releases':  'new-releases-section',  // Νέες κυκλοφορίες
  'categories':    'categories-section',    // Κατηγορίες βάσει είδους
  'favorites':     'favorites-section',     // Αγαπημένα
  'search':        'search-results-section' // Αποτελέσματα αναζήτησης
};

// --- Κατάσταση σελίδωσης (pagination) ---
let currentSection = 'featured';
let currentPageMap = {
  'featured': 1,
  'popular': 1,
  'new-releases': 1
};

// --- Caching στοιχείων DOM για καλύτερη απόδοση ---
const elems = {
  featuredGrid:    document.getElementById('featured-movies'),
  popularGrid:     document.getElementById('popular-movies'),
  newGrid:         document.getElementById('new-releases-movies'),
  categoriesGrid:  document.getElementById('categories-container'),
  favoritesGrid:   document.getElementById('favorites-movies'),
  searchGrid:      document.getElementById('search-results'),
  details:         document.getElementById('movie-details'),
  detailsContent:  document.getElementById('movie-details-content')
};

// Χάρτης grids για load-more λειτουργικότητα
const gridMap = {
  featured: elems.featuredGrid,
  popular: elems.popularGrid,
  'new-releases': elems.newGrid
};

// --- Διαχείριση Αγαπημένων (Favorites) ---

// Επιστρέφει true αν το id υπάρχει ήδη στα favorites
function isFavorite(id) {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  return favs.includes(id);
}

// Προσθέτει ή αφαιρεί το id από τη λίστα στα favorites
function toggleFavorite(id) {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  const idx = favs.indexOf(id);
  if (idx > -1) 
    favs.splice(idx, 1);  // Αφαίρεση αν υπάρχει
  else 
    favs.push(id);        // Προσθήκη αν δεν υπάρχει
  localStorage.setItem('favorites', JSON.stringify(favs));
}

// --- Βοηθητικές Συναρτήσεις (Utility Functions) ---

// Απόκρυψη όλων των κύριων sections και του modal λεπτομερειών
function hideAllSections() {
  Object.values(sectionMap).forEach(id =>
    document.getElementById(id).classList.add('hidden')
  );
  elems.details.classList.add('hidden');
}

// Εμφάνιση μόνο του section με κλειδί key
function showSection(key) {
  hideAllSections();
  document.getElementById(sectionMap[key]).classList.remove('hidden');
}

// Κάνει fetch JSON από URL ή πετάει σφάλμα αν δεν είναι ok
async function fetchData(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Εμφανίζει λίστα ταινιών σε κοντέινερ, με append αν append=true
function renderMovies(movies, container, append = false) {
  if (!append) container.innerHTML = ''; // Καθαρισμός για νέα δεδομένα
  movies.forEach(m => {
    const div = document.createElement('div');
    div.className = 'movie-card';
    div.innerHTML = `
      <div class="movie-poster-container">
        <img src="${m.poster_path ? IMG_BASE_URL + m.poster_path : DEFAULT_POSTER}" alt="${m.title}">
        <button class="favorite-btn" data-id="${m.id}">
          ${isFavorite(m.id) ? '❤️' : '🤍'}
        </button>
      </div>
      <div class="info">
        <h3>${m.title}</h3>
        <p>${m.release_date?.slice(0,4) || ''}</p>
      </div>
    `;

    // Άνοιγμα modal με λεπτομέρειες ταινίας
    div.addEventListener('click', () => showMovieDetails(m.id));

    // Handler για το κουμπί favorite (αναίρεση γεγονότος propagation)
    const favBtn = div.querySelector('.favorite-btn');
    favBtn.addEventListener('click', e => {
      e.stopPropagation();
      const id = parseInt(favBtn.dataset.id);
      toggleFavorite(id);
      favBtn.textContent = isFavorite(id) ? '❤️' : '🤍';
    });

    container.appendChild(div);
  });
}

// Ενημέρωση σωστού κουμπιού "Φόρτωσε Περισσότερα" βάση currentSection
function updateLoadMoreButton() {
  document.querySelectorAll('.load-more').forEach(btn =>
    btn.classList.add('hidden')
  );
  const btn = document.getElementById(`load-more-${currentSection}`);
  if (btn) btn.classList.remove('hidden');
}

// --- Event Listeners ---

// Load-more κουμπιά για pagination
document.querySelectorAll('.load-more').forEach(btn => {
  btn.addEventListener('click', async () => {
    currentPageMap[currentSection]++;
    let url;
    switch (currentSection) {
      case 'featured':
        url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=${currentPageMap.featured}`;
        break;
      case 'popular':
        url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${currentPageMap.popular}`;
        break;
      case 'new-releases':
        url = `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&page=${currentPageMap['new-releases']}`;
        break;
    }
    if (url) {
      const data = await fetchData(url);
      renderMovies(data.results, gridMap[currentSection], true);
    }
  });
});

// Συνάρτηση αλλαγής ενότητας (navbar)
async function switchSection(key) {
  currentSection = key;
  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.section === key)
  );
  showSection(key);

  // Επαναφορά counters pagination
  if (currentPageMap[key] !== undefined) {
    currentPageMap[key] = 1;
  }

  // Φόρτωση δεδομένων βάση της ενότητας
  switch (key) {
    case 'featured': {
      const data = await fetchData(
        `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`
      );
      renderMovies(data.results, elems.featuredGrid);
      break;
    }
    case 'popular': {
      const data = await fetchData(
        `${BASE_URL}/movie/popular?api_key=${API_KEY}`
      );
      renderMovies(data.results, elems.popularGrid);
      break;
    }
    case 'new-releases': {
      const data = await fetchData(
        `${BASE_URL}/movie/now_playing?api_key=${API_KEY}`
      );
      renderMovies(data.results, elems.newGrid);
      break;
    }
    case 'categories': {
      // Φόρτωση λίστας ειδών (genres)
      const data = await fetchData(
        `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`
      );
      elems.categoriesGrid.innerHTML = '';
      data.genres.forEach(g => {
        const card = document.createElement('div');
        card.className = 'genre-card';
        card.textContent = g.name;
        card.addEventListener('click', () => loadByGenre(g.id));
        elems.categoriesGrid.appendChild(card);
      });
      break;
    }
    case 'favorites': {
      // Φόρτωση αγαπημένων από localStorage
      const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
      elems.favoritesGrid.innerHTML = '';
      if (!favs.length) {
        elems.favoritesGrid.innerHTML = '<p>Δεν έχετε αγαπημένες ταινίες.</p>';
      } else {
        const promises = favs.map(id =>
          fetchData(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`)
        );
        const movies = await Promise.all(promises);
        renderMovies(movies, elems.favoritesGrid);
      }
      break;
    }
    // Η ενότητα 'search' διαχειρίζεται στο handler παρακάτω
  }

  updateLoadMoreButton();
}

// Φόρτωση ταινιών βάση είδους (genre)
async function loadByGenre(id) {
  showSection('categories');
  const data = await fetchData(
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${id}`
  );
  renderMovies(data.results, elems.categoriesGrid);
}

// Εμφάνιση modal λεπτομερειών ταινίας
async function showMovieDetails(movieId) {
  try {
    const res = await fetch(
      `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=el-GR&append_to_response=credits,videos`
    );
    const movie = await res.json();

    // Δημιουργία μονοπατιών εικόνων και μεταδεδομένων
    const backdropPath = movie.backdrop_path
      ? `${IMAGE_BASE_URL}${BACKDROP_SIZE}${movie.backdrop_path}`
      : (movie.poster_path
          ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}`
          : 'https://via.placeholder.com/1280x720?text=No+Image+Available'
        );
    const posterPath = movie.poster_path
      ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}`
      : 'https://via.placeholder.com/500x750?text=No+Image+Available';
    const releaseDate = movie.release_date
      ? new Date(movie.release_date).toLocaleDateString('el-GR', {
          day: 'numeric', month: 'long', year: 'numeric'
        })
      : 'Άγνωστη ημερομηνία';
    const genres = movie.genres.map(g => g.name).join(', ');
    const cast = movie.credits?.cast?.slice(0,5).map(a => a.name).join(', ') || 'Μη διαθέσιμο';
    const directors = movie.credits?.crew
      .filter(c => c.job === 'Director')
      .map(d => d.name).join(', ') || 'Μη διαθέσιμο';

    // Ένθεση trailer αν υπάρχει
    let trailerHTML = '';
    const vid = movie.videos?.results?.find(v => v.type==='Trailer' && v.site==='YouTube');
    if (vid) {
      trailerHTML = `
        <div class="movie-trailer">
          <h3>Trailer</h3>
          <iframe width="100%" height="315"
            src="https://www.youtube.com/embed/${vid.key}"
            frameborder="0" allowfullscreen>
          </iframe>
        </div>`;
    }

    // Ένθεση περιεχομένου modal
    elems.detailsContent.innerHTML = `
      <div class="movie-backdrop" style="background-image:url('${backdropPath}')">
        <div class="backdrop-overlay"></div>
      </div>
      <div class="movie-detail-grid">
        <div class="movie-poster-detail">
          <img src="${posterPath}" alt="${movie.title}">
        </div>
        <div class="movie-info-detail">
          <h2>${movie.title}${movie.release_date?` (${movie.release_date.slice(0,4)})`:''}</h2>
          <p>${releaseDate} | ${genres} | ${movie.runtime?movie.runtime+'′':''}</p>
          <p><strong>Σκηνοθεσία:</strong> ${directors}</p>
          <p><strong>Πρωταγωνιστούν:</strong> ${cast}</p>
          <h3>Περίληψη</h3>
          <p>${movie.overview||'–'}</p>
        </div>
      </div>
      ${trailerHTML}
    `;

    // Εμφάνιση του modal
    elems.details.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error('showMovieDetails error:', err);
    alert('Σφάλμα στη φόρτωση των λεπτομερειών.');
  }
}

// Κλείσιμο modal λεπτομερειών
document.getElementById('close-details').addEventListener('click', () => {
  elems.details.classList.add('hidden');
  document.body.style.overflow = 'auto';
});

// --- Χειριστής Αναζήτησης ---
// Κουμπί αναζήτησης
document.getElementById('search-button').addEventListener('click', async () => {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return; // Αν δεν υπάρχει κείμενο, τερματίζουμε
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  switchSection('search');
  const data = await fetchData(
    `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`
  );
  if (data.results.length) {
    renderMovies(data.results, elems.searchGrid);
  } else {
    elems.searchGrid.innerHTML = '<p>Δεν βρέθηκαν αποτελέσματα.</p>';
  }
  updateLoadMoreButton();
  document.getElementById('search-input').value = '';
});

// Enter key triggers search
document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('search-button').click();
  }
});

// Navbar links
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    switchSection(a.dataset.section);
  });
});

// Αρχική φόρτωση σελίδας
window.addEventListener('DOMContentLoaded', () => {
  switchSection('featured');
  const modal = document.getElementById('movie-details');
  modal.addEventListener('click', (e) => {
    // Αν το κλικ έγινε στο backdrop (και όχι μέσα στο περιεχόμενο)
    if (e.target === modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
  });
});
