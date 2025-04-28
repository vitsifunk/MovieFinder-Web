//API key από το TMDB
const API_KEY = 'ea1354ce43e9b742162e412c02bbe4f3';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'original';

// DOM elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const featuredMoviesContainer = document.getElementById('featured-movies');
const popularMoviesContainer = document.getElementById('popular-movies');
const newMoviesContainer = document.getElementById('new-movies');
const searchResultsSection = document.getElementById('search-results-section');
const searchResults = document.getElementById('search-results');
const movieDetails = document.getElementById('movie-details');
const movieDetailsContent = document.getElementById('movie-details-content');
const closeDetailsButton = document.getElementById('close-details');

// Flags
let backdropStyleAdded = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});
closeDetailsButton.addEventListener('click', closeMovieDetails);

// Αρχικοποίηση εφαρμογής
function initApp() {
    fetchAndDisplayMovies(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=el-GR`, popularMoviesContainer);
    fetchAndDisplayMovies(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=el-GR`, newMoviesContainer);
    fetchAndDisplayMovies(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=el-GR`, featuredMoviesContainer);
}

// Αναζήτηση ταινιών
async function performSearch() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        searchResultsSection.style.display = 'none';
        searchResults.innerHTML = '';
        return;
    }

    const searchURL = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=el-GR&query=${encodeURIComponent(searchTerm)}`;
    searchResultsSection.style.display = 'block';
    searchResults.innerHTML = '<div class="loading">Αναζήτηση...</div>';
    fetchAndDisplayMovies(searchURL, searchResults);
    searchResultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Ανάκτηση και εμφάνιση ταινιών
async function fetchAndDisplayMovies(url, container) {
    try {
        const movies = await fetchMovies(url);
        if (movies.length > 0) {
            displayMovies(movies, container);
        } else {
            container.innerHTML = '<p>Δεν βρέθηκαν ταινίες.</p>';
        }
    } catch (error) {
        console.error('Error fetching movies:', error);
        container.innerHTML = '<p>Σφάλμα κατά την ανάκτηση δεδομένων.</p>';
    }
}

async function fetchMovies(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
}

// Εμφάνιση ταινιών
function displayMovies(movies, container) {
    container.innerHTML = '';

    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');

        const posterPath = movie.poster_path 
            ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}`
            : 'https://via.placeholder.com/500x750?text=No+Image+Available';
        const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

        movieCard.innerHTML = `
            <div class="movie-poster-container">
                <img src="${posterPath}" alt="Poster του ${movie.title}" class="movie-poster">
                ${movie.vote_average ? `<div class="movie-rating">${movie.vote_average.toFixed(1)}</div>` : ''}
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <p class="movie-year">${releaseYear}</p>
            </div>
        `;

        movieCard.addEventListener('click', () => showMovieDetails(movie.id));
        container.appendChild(movieCard);
    });
}

// Εμφάνιση λεπτομερειών ταινίας
async function showMovieDetails(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=el-GR&append_to_response=credits,videos`);
        const movie = await response.json();

        const backdropPath = movie.backdrop_path
            ? `${IMAGE_BASE_URL}${BACKDROP_SIZE}${movie.backdrop_path}`
            : (movie.poster_path
                ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}`
                : 'https://via.placeholder.com/1280x720?text=No+Image+Available');
        
        const posterPath = movie.poster_path 
            ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}`
            : 'https://via.placeholder.com/500x750?text=No+Image+Available';

        const releaseDate = movie.release_date
            ? new Date(movie.release_date).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'Άγνωστη ημερομηνία';

        const genres = movie.genres.map(genre => genre.name).join(', ');
        const cast = movie.credits?.cast?.slice(0, 5).map(actor => actor.name).join(', ') || 'Μη διαθέσιμο';
        const directors = movie.credits?.crew?.filter(member => member.job === 'Director').map(d => d.name).join(', ') || 'Μη διαθέσιμο';

        let trailerHTML = '';
        if (movie.videos?.results?.length) {
            const trailer = movie.videos.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
            if (trailer) {
                trailerHTML = `
                    <div class="movie-trailer">
                        <h3>Trailer</h3>
                        <iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" 
                        frameborder="0" allowfullscreen></iframe>
                    </div>
                `;
            }
        }

        movieDetailsContent.innerHTML = `
            <div class="movie-backdrop" style="background-image: url('${backdropPath}');">
                <div class="backdrop-overlay"></div>
            </div>
            <div class="movie-detail-grid">
                <div class="movie-poster-detail">
                    <img src="${posterPath}" alt="Poster του ${movie.title}">
                </div>
                <div class="movie-info-detail">
                    <h2>${movie.title} ${movie.release_date ? `(${movie.release_date.split('-')[0]})` : ''}</h2>
                    <div class="movie-meta">
                        <span class="release-date">${releaseDate}</span> | 
                        <span class="genres">${genres}</span> | 
                        <span class="runtime">${movie.runtime ? `${movie.runtime} λεπτά` : 'Άγνωστη διάρκεια'}</span>
                    </div>
                    <div class="movie-rating-detail">
                        <span class="rating-value">${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>/10
                        <span class="vote-count">(${movie.vote_count} ψήφοι)</span>
                    </div>
                    <div class="movie-tagline">${movie.tagline || ''}</div>
                    <div class="movie-overview">
                        <h3>Περίληψη</h3>
                        <p>${movie.overview || 'Δεν υπάρχει διαθέσιμη περίληψη.'}</p>
                    </div>
                    <div class="movie-credits">
                        <p><strong>Σκηνοθεσία:</strong> ${directors}</p>
                        <p><strong>Πρωταγωνιστούν:</strong> ${cast}</p>
                    </div>
                </div>
            </div>
            ${trailerHTML}
        `;

        if (!backdropStyleAdded) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'movie-details.css';
            document.head.appendChild(link);
            backdropStyleAdded = true;
        }

        movieDetails.style.display = 'flex';
        document.body.style.overflow = 'hidden';

    } catch (error) {
        console.error('Error fetching movie details:', error);
        movieDetailsContent.innerHTML = '<p>Σφάλμα κατά την ανάκτηση λεπτομερειών ταινίας.</p>';
        movieDetails.style.display = 'flex';
    }
}

// Κλείσιμο λεπτομερειών
function closeMovieDetails() {
    movieDetails.style.display = 'none';
    document.body.style.overflow = 'auto';
}
