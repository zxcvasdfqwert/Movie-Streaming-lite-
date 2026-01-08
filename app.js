const API_KEY = "ce914e03cbf3a6158135153aff8cdaa8";
const BASE_URL = "https://api.themoviedb.org/3";
const API_IMG = "https://image.tmdb.org/t/p/w500";

const options = {
  method: 'GET',
  headers: {
    accept: 'application/json'
  }
}; 

let currentPage = 1;
let totalPages = 1;
let currentSection = "movies";
let movieGenreId = null;
let tvGenreId = null;
let selectedMovieGenres = null;
let moviePage = 1;
const ITEMS_PER_PAGE = 20;
let allFavorites = [];
let allWatchlist = [];
let allRated = [];

function showToast(message, type="info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast)

  setTimeout( () => {
    toast.remove();
  }, 2000);
}


function getAuthContext() {
  return {
    sessionId: localStorage.getItem("session_id"),
    guestSessionId: localStorage.getItem("guest_session_id"),
    isGuest: !!localStorage.getItem("guest_session_id") && !localStorage.getItem("session_id")
  };
} 

function getSessionType(){
  if(localStorage.getItem("session_id")) return "user";
  if(localStorage.getItem("guest_session_id")) return "guest";
  return "none";
}

const isIndexPage = document.getElementById("movie-section") !== null;
const isDetailsPage = document.getElementById("details-container") !== null;
const isLoginPage = document.querySelector(".login-container") !== null;

//request token function
async function createRequestToken() {
  const res = await fetch(`${BASE_URL}/authentication/token/new?api_key=${API_KEY}`);
  const data = await res.json();

  if (data.success) {
    localStorage.setItem("request_token", data.request_token);
    return data.request_token;
  }
  console.error("Token Error:", data);
  return null;
}

//redirect function
function redirectToTMDB(token) {
  const redirectURL = encodeURIComponent(window.location.href);

  window.location.href =
    `https://www.themoviedb.org/authenticate/${token}?redirect_to=${redirectURL}`;
}

//create session function
async function createSession(requestToken) {
  const res = await fetch(
    `${BASE_URL}/authentication/session/new?api_key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_token: requestToken })
    }
  );

  const data = await res.json();

  if (data.success) {
    localStorage.setItem("session_id", data.session_id);
    return data.session_id;
  }
  console.error("SESSION ERROR:", data);
  return null;
}

//get account id function
async function getAccountId(sessionId) {
  const res = await fetch(
    `${BASE_URL}/account?api_key=${API_KEY}&session_id=${sessionId}`
  );

  const data = await res.json();
  console.log("ACCOUNT DATA:", data);

  if (data.id) {
    localStorage.setItem("account_id", data.id);
    return data.id;
  }
  console.error("Account Error:", data);
  return null;
}

//create guest session function
async function createGuestSession() {
  const res = await fetch(`${BASE_URL}/authentication/guest_session/new?api_key=${API_KEY}`);
  const data = await res.json();

  if (data.success) {
    localStorage.setItem("guest_session_id", data.guest_session_id);
    localStorage.removeItem("session_id");
    localStorage.removeItem("account_id");
    return data.guest_session_id;
  }
  console.error("Guest Session Error:", data);
  return null;
}


async function handleRedirectAfterLogin() {
  console.log("handleRedirectAfterLogin called on", window.location.pathname);
  const requestToken = localStorage.getItem("request_token");
  const sessionId = localStorage.getItem("session_id");
  const guestSessionId = localStorage.getItem("guest_session_id");

  // Check if authentication was denied
  const urlParams = new URLSearchParams(window.location.search);
  console.log("URL params:", urlParams.toString());
  if (urlParams.get("denied")) {
    localStorage.removeItem("request_token");
    alert("Authentication was denied. Please try logging in again.");
    return;
  }

  if (requestToken && !sessionId) {
    console.log("Attempting to create session with token:", requestToken);
    const newSession = await createSession(requestToken);
    if (newSession) {
      await getAccountId(newSession);
      showLoginState(true);
      console.log("Logged in Successfully !!.. ")
      console.log("TMDB LOGIN SUCCESS!");
      window.location.href = "index.html";  
      return;
    } else {
      // Clear the token if session creation failed
      localStorage.removeItem("request_token");
      console.error("Session creation failed. Token cleared.");
      alert("Failed to create session. Please ensure your TMDB app has the correct callback URL set (e.g., http://127.0.0.1:5500/login.html).");
    }
  }
  if (sessionId || guestSessionId) {
    console.log("Session or guest session exists, showing login state");
    showLoginState(true);
    return;
  }
  console.log("No session, redirecting to login.html");
  if (window.location.pathname !== '/login.html') {
    window.location.href = "login.html";
  }
}

function showLoginState(isLoggedIn) {
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogin) btnLogin.classList.toggle("hidden", isLoggedIn);
  if (btnLogout) btnLogout.classList.toggle("hidden", !isLoggedIn);
}

async function logoutTMDB() {
  const sessionId = localStorage.getItem("session_id");

  if (sessionId) {
    const res = await fetch(
      `${BASE_URL}/authentication/session?api_key=${API_KEY}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      }
    );
    const data = await res.json();
    console.log("Delete Session:", data);
  }

  localStorage.clear();
  showLoginState(false);
  console.log("Logged out successfully!");
  window.location.href = "login.html";
}


const movieSection = document.getElementById("movie-section");
const tvSection = document.getElementById("tv-section");
const movieGrid = document.getElementById("movieGrid");
const tvGrid = document.getElementById("tvGrid");


//fetch movies
async function fetchPopular(page = 1) {
  const url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${page}`;
  console.log("Fetching movies:", url);

  const res = await fetch(url, options);

  if (!res.ok) {
    console.error("MOVIE API Error:", res.status);
    return null;
  }
  const data = await res.json();

  totalPages = data.total_pages;
  return data.results;
} 

//fetch tv 
async function fetchPopularTv(page = 1) {
    const url = `${BASE_URL}/tv/popular?api_key=${API_KEY}&page=${page}`; 
    console.log("Fetching TV shows:",url);

    const res = await fetch(url, options);

    if(!res.ok) {
        console.error("TV Api error:",res.status);
        return null;
    }
    const data = await res.json(); 

    totalPages = data.total_pages;
    return data.results;
} 

//fetch movie genres
async function fetchMovieGenres() {
  const res = await fetch(
    `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`
  );
  const data = await res.json();
  return data.genres || [];
}

//fetch tv genres
async function fetchTvGenres() {
  const res = await fetch(
    `${BASE_URL}/genre/tv/list?api_key=${API_KEY}`
  );
  const data = await res.json();
  return data.genres || [];
}

//setup Movie genre
async function setupMovieGenres() {
  const select = document.getElementById("movieGenreSelect");
  if (!select) return;

  const genres = await fetchMovieGenres();

  genres.forEach(g => {
    const option = document.createElement("option");
    option.value = g.id;
    option.textContent = g.name;
    select.appendChild(option);
  });

  const savedMovieGenre = localStorage.getItem("movieGenreId");
  if (savedMovieGenre) {
    movieGenreId = savedMovieGenre;
    select.value = savedMovieGenre;
  }

  select.addEventListener("change", async (e) => {
    movieGenreId = e.target.value || null;
    localStorage.setItem("movieGenreId", movieGenreId || "");
    currentSection = "movies";
    currentPage = 1;  

    localStorage.setItem("currentPage", 1);

    await loadCurrentSection();
  });
}


//setup Tv genre
async function setupTvGenres() {
  const select = document.getElementById("tvGenreSelect");
  if (!select) return;

  const genres = await fetchTvGenres();

  genres.forEach(g => {
    const option = document.createElement("option");
    option.value = g.id;
    option.textContent = g.name;
    select.appendChild(option);
  });

  const savedTvGenre = localStorage.getItem("tvGenreId");
  if (savedTvGenre) {
    tvGenreId = savedTvGenre;
    select.value = savedTvGenre;
  }

  select.addEventListener("change", async (e) => {
    tvGenreId = e.target.value || null;
    localStorage.setItem("tvGenreId", tvGenreId || "");
    currentSection = "tv";
    currentPage = 1;

    localStorage.setItem("currentPage", 1);

    await loadCurrentSection();
  })
}


//fetching movies by genre 
async function fetchMoviesByGenres(genreId, page = 1) {
  const url = genreId
  ? `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&page=${page}`
  :`${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${page}`;

  const res = await fetch(url);
  const data = await res.json();

  totalPages = data.total_pages;
  return data.results || [];
}

//fetching tv by genres
async function fetchTvByGenres(genreId, page = 1) {
  const url = genreId
  ? `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=${genreId}&page=${page}`
  :`${BASE_URL}/tv/popular?api_key=${API_KEY}&page=${page}`;

  const res = await fetch(url);
  const data = await res.json();

  totalPages = data.total_pages;
  return data.results || [];
} 

//search function
async function fetchSearch(query) {
  const url =`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  console.log("Searching :",url);

  const res = await fetch(url, options);

  if (!res.ok) {
    console.log("Search API Error:", res.status);
    return null;
  }

  const data = await res.json();
  return data.results;
}


//searching items
async function handleSearch(event) {
  event.preventDefault();
  const queryInput = document.getElementById("searchInput");
  const query = queryInput.value.trim();

  if (!query) {
    alert("Please enter a term for search.");
    return;
  }

  const results = await fetchSearch(query);
  const resultsContainer = document.getElementById("search-results");
  if (resultsContainer) {
    renderItems(results, resultsContainer, "multi");
    try {
      localStorage.setItem("lastSearchQuery", query);
      localStorage.setItem("lastSearchResults", JSON.stringify(results || []));
    } catch (e) {
      console.warn("Could not cache search results:", e);
    }
  }
  console.log("search results:", results);
}

const searchInput = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestions-list");


// function debounce(func, delay) {
//   let timeoutId;
//   return function (...args) {
//     clearTimeout(timeoutId);
//     timeoutId = setTimeout(() => func.apply(this, args), delay);
//   };
// }

// async function fetchSuggestion(query) {
//   if (!query) return [];
//   const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
//   const res = await fetch(url, options);
//   if (!res.ok) return [];
//   const data = await res.json();
//   return (data.results || []).filter(item => item.poster_path || item.profile_path).slice(0, 4);
// }

// const handleSuggestionInput = debounce(async (e) => {
//   const query = e.target.value.trim();
//   if (!query) {
//     suggestionsList.innerHTML = "";
//     suggestionsList.style.display = "none";
//     return;
//   }
//   const suggestions = await fetchSuggestion(query);
//   suggestionsList.innerHTML = suggestions
//     .map(item => `
//       <li class="suggestion-item" data-id="${item.id}" data-type="${item.media_type || 'movie'}">
//         <span class="suggestion-title">${item.title || item.name || 'Unknown'}</span>
//       </li>
//     `)
//     .join("");
  
//   if (suggestions.length > 0) {
//     suggestionsList.style.display = "block";
//   }

//   document.querySelectorAll(".suggestion-item").forEach(li => {
//     li.addEventListener("click", () => {
//       const id = li.dataset.id;
//       const type = li.dataset.type || "movie";
//       searchInput.value = li.querySelector(".suggestion-title").textContent;
//       const fakeEvent = new Event('submit', { cancelable: true });
//       handleSearch(fakeEvent);
//       suggestionsList.innerHTML = "";
//       suggestionsList.style.display = "none";
//     });
//   });
// }, 500);

if (searchInput && suggestionsList) {
  searchInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    handleSearch(event);
    suggestionsList.innerHTML = "";
    suggestionsList.style.display = "none";
  }
});

  // searchInput.addEventListener("input", handleSuggestionInput);
  
  searchInput.addEventListener("focus", () => {
    const query = searchInput.value.trim();
    if (query && suggestionsList.innerHTML.trim()) {
      suggestionsList.style.display = "block";
    }
  });
  
  searchInput.addEventListener("blur", () => {
    setTimeout(() => {
      suggestionsList.style.display = "none";
    }, 200);
  });
}

// function paginateArray(items, page) {
//   const start = (page - 1) * ITEMS_PER_PAGE;
//   const end = start + ITEMS_PER_PAGE;
//   return items.slice(start, end);
// }


function updatePagination() {
  const pagination = document.getElementById("pagination");
  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage"); 

  if (!pagination) return;

  if (
  ["movies", "tv", "favorites", "watchlist", "ratedlist"].includes(currentSection)
) {
  pagination.classList.remove("hidden");
} else {
  pagination.classList.add("hidden");
} 

  window.scrollTo({ top:0, behavior: "smooth" });

  pageInfo.textContent= `Page ${currentPage} of ${totalPages}`;

  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");

if (prevBtn && nextBtn) {
 prevBtn.onclick = async () => {
  if (currentPage > 1) {
    currentPage--;
    localStorage.setItem("currentPage", currentPage);
    await loadCurrentSection();
  }
}; 

nextBtn.onclick = async () => {
  if (currentPage < totalPages) {
    currentPage++;
    localStorage.setItem("currentPage", currentPage);
    await loadCurrentSection();
  }
};
}

//rendering items 
function renderItems(list, container, type = "movies") {
    if (!container) return;
    container.innerHTML = ""; 

    if (!list || list.length === 0) {
      container.innerHTML = `<div class="empty-message">No results found</div>`;
      return;
    }

    const placeholderImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect fill='%23333' width='200' height='300'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='16' font-family='Arial'%3ENo Image%3C/text%3E%3C/svg%3E";

    list.forEach(item => {
      if (!item.id) return;
      const title = item.title || item.name || "Unknown";
      const mediaType = item.media_type || type;
      const posterUrl = item.poster_path ? (API_IMG + item.poster_path) : (item.profile_path ? (API_IMG + item.profile_path) : placeholderImg);

      const card = document.createElement("div");
      card.classList.add("card");

      card.innerHTML = `
        <img src="${posterUrl}" alt="${title}" onerror="this.src='${placeholderImg}'">
        <div class="card-title">${title}</div>
      `;

      card.onclick = () => {
        
        window.location.href = `details.html#/${mediaType}/${item.id}`;
      };

      container.appendChild(card);
    });
} 

//favorites function
    async function fetchAllFavorites() {
      const sessionId = localStorage.getItem("session_id");
      const accountId = localStorage.getItem("account_id"); 

      if (!sessionId || !accountId) {
        alert("You must login to fetch favorites");
        return [];
      } 

      let allMovies = [];
      let moviePage = 1;
      let hasMoreMovies = true;

      while (hasMoreMovies) {
        const urlMovies = `${BASE_URL}/account/${accountId}/favorite/movies?api_key=${API_KEY}&session_id=${sessionId}&page=${moviePage}`;
        const resMovies = await fetch(urlMovies);
        const dataMovies = await resMovies.json();

        if (dataMovies.results && dataMovies.results.length > 0) {
          allMovies.push(...dataMovies.results);
          moviePage++;
          hasMoreMovies = moviePage <= dataMovies.total_pages;
        } else {
          hasMoreMovies = false;
        }
      } 

      let allTv = [];
      let tvPage = 1;
      let hasMoreTv = true; 

      while(hasMoreTv) {
        const urlTv = `${BASE_URL}/account/${accountId}/favorite/tv?api_key=${API_KEY}&session_id=${sessionId}&page=${tvPage}`;
        const resTv = await fetch(urlTv);
        const dataTv = await resTv.json();

        if (dataTv.results && dataTv.results.length > 0) {
          allTv.push(...dataTv.results);
          tvPage++;
          hasMoreTv = tvPage <= dataTv.total_pages;
        } else {
          hasMoreTv = false;
        }
      } 

      allFavorites = [
        ...allMovies.map(m => ({ ...m, media_type: "movie"})),
        ...allTv.map(t => ({ ...t, media_type: "tv"}))
      ];

      console.log("Total Favorites:", allFavorites.length);
      return allFavorites;
}  

//Get favorites pagination
function getFavorites(page = 1) {
  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;

  totalPages = Math.ceil(allFavorites.length / ITEMS_PER_PAGE);

  return allFavorites.slice(start, end);
}

//watchlist function
async function fetchAllWatchlist() {
  const  sessionId = localStorage.getItem("session_id");
  const accountId = localStorage.getItem("account_id"); 

  if (!sessionId || !accountId) {
    alert("You must Login to fetch Watchlist");
    return [];
  }

  let allMovies = [];
  let moviePage = 1;
  let hasMoreMovies = true;

  while (hasMoreMovies) {
  const urlMovies = `${BASE_URL}/account/${accountId}/watchlist/movies?api_key=${API_KEY}&&session_id=${sessionId}&page=${moviePage}`;
  const resMovies = await fetch(urlMovies);
  const dataMovies = await resMovies.json();

  if (dataMovies.results && dataMovies.results.length > 0) {
    allMovies.push(...dataMovies.results);
    moviePage++;
    hasMoreMovies = moviePage <= dataMovies.total_pages;
  }else {
    hasMoreMovies = false;
  }
  }
  
  let allTv = [];
  let tvPage = 1;
  let hasMoreTv = true;
  
  while (hasMoreTv) {
  const urlTv = `${BASE_URL}/account/${accountId}/watchlist/tv?api_key=${API_KEY}&&session_id=${sessionId}&page=${tvPage}`;
  const resTv = await fetch(urlTv);
  const dataTv = await resTv.json();

  if (dataTv.results && dataTv.results.length > 0) {
    allTv.push(...dataTv.results);
    tvPage++;
    hasMoreTv = tvPage <= dataTv.total_pages
  } else {
    hasMoreTv = false;
  }
  }

  allWatchlist = [
    ...allMovies.map(m => ({ ...m, media_type: "movie"})),
    ...allTv.map(t => ({ ...t, media_type: "tv"}))
  ];

  console.log("Total WatchList:", allWatchlist.length);
  return allWatchlist;
}

//get watchlist pagination
function getWatchlist(page = 1) {
  const start = (page -1 ) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;

  totalPages = Math.ceil(allWatchlist.length / ITEMS_PER_PAGE);

  return allWatchlist.slice(start, end);
}

//fetch rated items 
async function fetchAllRatedlist() {
  const sessionId = localStorage.getItem("session_id");
  const accountId = localStorage.getItem("account_id");
  const guestSessionId = localStorage.getItem("guest_session_id");

  if (sessionId && accountId) { 

    let allMovies = [];
    let moviePage = 1;
    let hasMoreMovies = true;

    while (hasMoreMovies) {
    const urlMovies =
      `${BASE_URL}/account/${accountId}/rated/movies?api_key=${API_KEY}&session_id=${sessionId}&page=${moviePage}`;
      const resMovies = await fetch(urlMovies);
      const dataMovies = await resMovies.json();

      if (dataMovies.results && dataMovies.results.length > 0) {
        allMovies.push(...dataMovies.results);
        moviePage++;
        hasMoreMovies = moviePage <= dataMovies.total_pages;
      }else {
        hasMoreMovies = false;
      }
    } 

    let allTv = [];
    let tvPage = 1;
    let hasMoreTv = true;

    while (hasMoreTv) {
    const urlTv =
      `${BASE_URL}/account/${accountId}/rated/tv?api_key=${API_KEY}&session_id=${sessionId}&page=${tvPage}`;
    const resTv = await fetch(urlTv);
    const dataTv = await resTv.json();

    if (dataTv.results && dataTv.results.length > 0) {
      allTv.push(...dataTv.results);
      tvPage++;
      hasMoreTv = tvPage <= dataTv.total_pages;
    } else {
      hasMoreTv = false;
    }
    }

    allRated = [
      ...allMovies.map(m => ({ ...m, media_type: "movie"})),
      ...allTv.map(t => ({ ...t, media_type: "tv"}))
    ];
  } else if (guestSessionId) {

    let allMovies = [];
    let moviePage = 1;
    let hasMoreMovies = true;

    while (hasMoreMovies) {
      const urlMovies =
      `${BASE_URL}/guest_session/${guestSessionId}/rated/movies?api_key=${API_KEY}&page=${moviePage}`;
      const resMovies = await fetch(urlMovies);
      const dataMovies = await resMovies.json();

      if (dataMovies.results && dataMovies.results.length > 0) {
        allMovies.push(...dataMovies.results);
        moviePage++;
        hasMoreMovies = moviePage <= dataMovies.total_pages;
      } else {
        hasMoreMovies = false;
      }
    }

    let allTv = [];
    let tvPage = 1;
    let hasMoreTv = true;
    
    while (hasMoreTv) {
     const urlTv =
      `${BASE_URL}/guest_session/${guestSessionId}/rated/tv?api_key=${API_KEY}&page=${moviePage}`;
      const resTv = await fetch(urlTv);
      const dataTv = await resTv.json();
      
      if (dataTv.results && dataTv.results.length > 0) {
        allTv.push(...dataTv.results);
        tvPage++;
        hasMoreTv = tvPage <= dataTv.total_pages;
      } else {
        hasMoreTv = false;
      }
    } 

    allRated = [
      ...allMovies.map(m => ({ ...m, media_type: "movie"})),
      ...allTv.map(t => ({ ...t, media_type: "tv"}))
    ];
  }

  console.log("Total Rated:", allRated.length);
  return allRated;
} 

//get rated pagination 
function getRated( page = 1 ) {
  const start = ( page - 1 ) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;

  totalPages = Math.ceil(allRated.length / ITEMS_PER_PAGE);

  return allRated.slice( start, end );
}


if (isIndexPage) { 

    const saved = localStorage.getItem("activeSection"); 
    const savedPage = Number(localStorage.getItem("currentPage")) || 1;

    const savedMovieGenre = localStorage.getItem("movieGenreId");
    const savedTvGenre = localStorage.getItem("tvGenreId");

    currentPage = savedPage;
    movieGenreId = savedMovieGenre || null;
    tvGenreId = savedTvGenre || null;

    if (saved) {
      switch (saved) {
      case "movies": showSection("movie-section"); 
      setActiveNav("btnMovies");
      break;
      case "tv": showSection("tv-section");
      setActiveNav("btnTv");
      break;
      case "favorites": showSection("fav-section"); 
      setActiveNav("btnFavs");
      break;
      case "watchlist": showSection("list-section");
      setActiveNav("btnList");
      break;
      case "ratedlist": showSection("rated-section");
      setActiveNav("btnRated");
      break;
      case "search": showSection  
      ("search-section");  
      setActiveNav("btnSearch");
      break;
      default: showSection("movie-section");
     }
 
     if (saved === "favorites") {
       (async () => {
        const favSection = document.getElementById("fav-section");
         if (favSection) {
          currentSection = saved;
          await loadCurrentSection();
        }
       })();
     }

     if (saved === "watchlist") {
       (async () => {
         const listSection = document.getElementById("list-section");
         if (listSection) {
           currentSection = saved;
          await loadCurrentSection();
         }
       })();
     } 

     if (saved === "ratedlist") {
        (async () => {
          const ratedSection = document.getElementById("rated-section");
          if (ratedSection) {
            currentSection = saved;
            await loadCurrentSection();
            // renderItems(ratedItems, ratedSection);
          }
        })();
     }

    //  if (saved === "search") {     
    //    const q = localStorage.getItem("lastSearchQuery");
    //    const raw = localStorage.getItem("lastSearchResults");
    //    const results = raw ? JSON.parse(raw) : null;
    //    const resultsContainer = document.getElementById("search-results");
    //    const queryInput = document.getElementById("searchInput");
    //    if (queryInput && q) queryInput.value = q;
    //    if (resultsContainer && results) renderItems(results, resultsContainer, "multi");
    //  }
   }

    const savedSection = localStorage.getItem("activeSection") || "movies";

    (async () => {
        if (savedSection === "movies") {
          currentSection = "movies";
          await loadCurrentSection();
        }

        if (savedSection === "tv") {
          currentSection = "tv";
          await loadCurrentSection();
        }
    })();
  

    function setActiveNav(buttonId) {
      const navButtons = document.querySelectorAll("nav button");
      navButtons.forEach(btn => btn.classList.remove("active"));

      const activeBtn = document.getElementById(buttonId);
      if (activeBtn) activeBtn.classList.add("active");
    }

    document.getElementById("btnMovies").onclick = async () => {
      currentSection = "movies";
      currentPage = 1;

      localStorage.setItem("activeSection", "movies");
      localStorage.setItem("currentPage", 1);

      showSection("movie-section");
      setActiveNav("btnMovies");
      await loadCurrentSection();
      updatePagination();
    };

    document.getElementById("btnTv").onclick = async () => {
      currentSection = "tv";
      currentPage = 1;

      localStorage.setItem("activeSection", "tv");
      localStorage.setItem("currentPage", 1);
      
      showSection("tv-section");
      setActiveNav("btnTv");
      await loadCurrentSection();
      updatePagination();
    };

    document.getElementById("btnFavs").onclick = async () => {
        currentSection = "favorites"
        currentPage = 1;
        allFavorites = [];

        localStorage.setItem("activeSection", "favorites");
        localStorage.setItem("currentPage", 1);

        showSection("fav-section");
        setActiveNav("btnFavs");

        await loadCurrentSection();
    }; 

    document.getElementById("btnList").onclick = async () => {
      currentSection = "watchlist"
      currentPage = 1;
      allWatchlist = [];

      localStorage.setItem("activeSection", "watchlist");
      localStorage.setItem("currentPage", 1);

      showSection("list-section");
      setActiveNav("btnList");

      await loadCurrentSection();
    };  

    document.getElementById("btnRated").onclick = async () => {
      currentSection = "ratedlist"
      currentPage = 1;
      allRated = [];

      localStorage.setItem("activeSection", "ratedlist");
      localStorage.setItem("currentPage", 1);

      showSection("rated-section");
      setActiveNav("btnRated");

      await loadCurrentSection();
    };

    document.getElementById("btnSearch").onclick = () => {
      localStorage.setItem("activeSection", "search");
      showSection("search-section");
      setActiveNav("btnSearch"); 

      if (searchInput) searchInput.focus();
    };

    document.getElementById("btnLogin").onclick = () => {
      window.location.href = "login.html";
    };

    document.getElementById("btnLogout").onclick = () => {
      logoutTMDB();
    };

    handleRedirectAfterLogin().catch(e => console.error(e));

    setupMovieGenres();
    setupTvGenres();
} 

if (isLoginPage) {
  const sessionId = localStorage.getItem("session_id");
  const guestSessionId = localStorage.getItem("guest_session_id");
  if (sessionId || guestSessionId) {
    window.location.href = "index.html";
  }

  handleRedirectAfterLogin().catch(e => console.error(e));

  document.getElementById("btnLogin").onclick = async () => {
    const token = await createRequestToken();
    if (token) redirectToTMDB(token);
  };

  document.getElementById("btnGuest").onclick = async () => {
    const guestId = await createGuestSession();
    if (guestId) {
      alert("Guest session created!");
      window.location.href = "index.html";
    }
  };
}
 

function showSection(sectionId) {
  const sections = document.querySelectorAll("main > section");
  sections.forEach(sec => sec.classList.add("hidden"));
  const target = document.getElementById(sectionId);
  if (target) target.classList.remove("hidden"); 

  if (sectionId !== "search-section") {
    if(document.getElementById("searchInput")) {
      document.getElementById("searchInput").value="";
    }
    if (document.getElementById("suggestions-list")){
      document.getElementById("suggestions-list").innerHTML="";
    }
    if (document.getElementById("search-results")){
      document.getElementById("search-results").innerHTML="";
    }  
  }
}

async function loadCurrentSection() {
  let data = [];

  switch (currentSection) {
    case "movies":
      data = movieGenreId
      ? await fetchMoviesByGenres(movieGenreId, currentPage)
      : await fetchPopular(currentPage);
      renderItems(data, movieGrid, "movie");
      break;

    case "tv":
      data = tvGenreId
        ? await fetchTvByGenres(tvGenreId, currentPage)
        : await fetchPopularTv(currentPage);
      renderItems(data, tvGrid, "tv");
      break;

    case "favorites":
      if (allFavorites.length === 0 || currentPage === 1 ) {
        await fetchAllFavorites();
      }
      data = getFavorites(currentPage);
      renderItems(data, document.getElementById("fav-section"));
      break;

    case "watchlist":
      if (allWatchlist.length === 0 || currentPage === 1) {
        await fetchAllWatchlist();
      }
      data = getWatchlist(currentPage);
      renderItems(data, document.getElementById("list-section"));
      break;

    case "ratedlist":
      if (allRated.length === 0 || currentPage === 1){
        await fetchAllRatedlist();
      }
      data = getRated(currentPage);
      renderItems(data, document.getElementById("rated-section"));
      break;
  }

  updatePagination();
}
 

//details secton..
if (isDetailsPage){
  initDetailsPage();
} 

async function initDetailsPage() { 

const detailsContainer = document.getElementById("details-container");
if (detailsContainer) {
  detailsContainer.innerHTML = "";
}

let movieId = null;
let type = null;

const hash = window.location.hash.substring(1);
console.log("=== DETAILS PAGE LOADED ===");
console.log("Hash:", hash);

if (hash) {
  const parts = hash.split("/").filter(Boolean);
  console.log("Hash parts:", parts);

  if (parts.length >= 2) {
    type = parts[0];
    movieId = parts[1];
  }
}

// console.log("Parsed:", { movieId, type });
  
// if (!movieId || !type) {
//   const match = window.location.pathname.match(
//     /^\/details\/(movie|tv)\/(\d+)$/
//   );

//   if (match) {
//     type = match[1];
//     movieId = match[2];
//   }
// }

// if (!movieId || !type) {
//   const params = new URLSearchParams(window.location.search);
//   movieId = params.get("id");
//   type = params.get("type");
// }

console.log("Parsed:", { movieId, type });

if (!movieId || !type) {
  console.error("Missing movieId or type in URL");
  alert ("No Movie/Show data found. Redirecting to home.....");
  window.location.href="index.html";
  return;
}


// const detailsContainer = document.getElementById("details-container");
const streamingSection = document.getElementById("streaming-section");
// const reviewSection = document.getElementById("review-section");
const imgSection = document.getElementById("img-section");

// fetching functions
async function fetchDetails(type, id) {
    const url = `${BASE_URL}/${type}/${id}?api_key=${API_KEY}`;
    console.log("DETAILS URL =", url);
    const res = await fetch(url);
    return res.json();
} 

async function fetchPlatforms(type, id) {
  const url = `${BASE_URL}/${type}/${id}/watch/providers?api_key=${API_KEY}`;
  console.log("Watch provider =", url)
  const res = await fetch(url);
  const data = await res.json();
  return data?.results?.IN || null;
}

async function fetchCast(type, id) {
    const url = `${BASE_URL}/${type}/${id}/credits?api_key=${API_KEY}`;
    console.log("CAST URL =", url);
    const res = await fetch(url);
    return res.json();
} 

// async function fetchReviews(type, id) {
//   const url = `${BASE_URL}/${type}/${id}/reviews?api_key=${API_KEY}`;
//   console.log("Reviews URL:", url);
//   const res = await fetch(url);
//   const data = await res.json();
//   return data.results || [];
// }

async function fetchImages(type, id) {
  const url = `${BASE_URL}/${type}/${id}/images?api_key=${API_KEY}`;
  console.log("Images URL=", url);
  const res = await fetch(url);
  return res.json();
}

async function fetchRelated(type, id) {
    const url = `${BASE_URL}/${type}/${id}/similar?api_key=${API_KEY}`;
    console.log("RELATED URL =", url);
    const res = await fetch(url);
    return res.json();
} 

async function fetchVideos(type, id) {
  const url = `${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

async function fetchTrailer(type, id) {
  const url = `${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.results) return null;

  return data.results.find(
    v => v.type.toLowerCase() === "trailer" && v.site.toLowerCase() === "youtube"
  )?.key || null;
} 

async function fetchCertification(type, id) {
  if (type === "movie") {
    const url = `${BASE_URL}/movie/${id}/release_dates?api_key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const india = data.results?.find(r => r.iso_3166_1 === "IN");
    if (!india || !india.release_date?.length) return "N/A";

    return india.release_date.find(r => r.certification)?.certification || "N/A";
  } 

  if (type === "tv") {
    const url = `${BASE_URL}/tv/${id}/content_ratings?api_key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json(); 

    const india = data.results?.find(r => r.iso_3166_1 === "IN")
    return india?.rating || "N/A"
  }
  return "N/A";
} 

async function render() { 
  if (!movieId || !type) {
    console.error("Missing movieId or type in URl");
    return ;
  } 

  window.scrollTo({ top:0, behavior: "smooth" });

  const details = await fetchDetails(type, movieId);
  const streaming = await fetchPlatforms(type, movieId);
  const cast = await fetchCast(type, movieId);
  // const reviews = await fetchReviews(type, movieId);
  const images = await fetchImages(type, movieId);
  const related = await fetchRelated(type, movieId);
  const certification = await fetchCertification(type, movieId);

  detailsContainer.innerHTML = `
  <div class="details-card">
    <img src="${API_IMG + details.poster_path}" class="details-poster">
    <div class="details-info">
      <h1>${details.title || details.name}</h1>
      <p><strong>Rating:</strong> ⭐${(details.vote_average || 0).toFixed(1)}</p>
      <p><strong>Release:</strong> ${details.release_date || details.first_air_date}</p>
      <p><strong>Certification (IN):</strong> ${certification} </p>
      <p>${details.overview}</p>
      <button id="favToggle" class="fav-btn" style="cursor: pointer">🤍</button>
      <button id="watchTrailer" class="watch-btn" style="cursor:pointer">▶ Watch Trailer</button>
      <button id="listToggle" class="list-btn"
      style="cursor:pointer">➕</button>
      <div class="rating-box">
        <h3>Add Rating</h3>
        <div id="starRating" class="stars">
          <span data-value="1">★</span>
          <span data-value="2">★</span>
          <span data-value="3">★</span>
          <span data-value="4">★</span>
          <span data-value="5">★</span>
        </div>
        <button id="deleteRating" class="delete-btn" style="font-size:20px; margin-top:5px;
        cursor:pointer;color: white; background: transparent">🗑</button>
     </div>
    </div>
  </div>
`; 


//trailer section
const trailerBtn = document.getElementById("watchTrailer");
const modal = document.getElementById("trailerModal");
const iframe = document.getElementById("trailerFrame");
const closeModal = document.getElementById("closeModal");

if (trailerBtn && modal && iframe && closeModal) {
  
  trailerBtn.onclick = () => {
    if (!trailerKey) {
      alert("Trailer not available for this title.");
      return;
    }
    iframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1`;
    modal.classList.remove("hidden");
  };

  closeModal.onclick = () => {
    iframe.src = "";
    modal.classList.add("hidden");
  };
}


//favorite section
const btnFav = document.getElementById("favToggle");

btnFav.onclick = async () => {
  const sessionId = localStorage.getItem("session_id");
  const accountId = localStorage.getItem("account_id");

  if (!sessionId || !accountId) {
    alert("You must Login for Adding to Favorites");
    return;
  }

  const isActive = btnFav.classList.contains("active");

  const body = {
    media_type: type,
    media_id: Number(movieId),
    favorite: !isActive
  };

  const url = `${BASE_URL}/account/${accountId}/favorite?api_key=${API_KEY}&session_id=${sessionId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (data.success) {
  btnFav.classList.toggle("active");
  btnFav.textContent = btnFav.classList.contains("active") ? "❤️" : "🤍";
  showToast(
    btnFav.classList.contains("active")
      ? "Added to Favorites"
      : "Removed from Favorites",
      "error"
    );
  }
};

 
//list section
const btnList = document.getElementById("listToggle");

btnList.onclick = async () => {
  const sessionId = localStorage.getItem("session_id");
  const accountId = localStorage.getItem("account_id");

  if (!sessionId || !accountId) {
    alert("You must Login for Adding to Watchlist ");
    return;
  }

  const isActive = btnList.classList.contains("active");

  const body = {
    media_type: type,
    media_id: Number(movieId),
    watchlist: !isActive
  };

  const url = `${BASE_URL}/account/${accountId}/watchlist?api_key=${API_KEY}&session_id=${sessionId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (data.success) {
    btnList.classList.toggle("active");
    btnList.textContent = btnList.classList.contains("active") ? "✔️" : "➕";
    showToast(
      btnList.classList.contains("active")
      ? "Added to Watchlist"
      :"Removed from Watchlist",
      "success"
    );
  } 
};

//user rating section
async function fetchAccountStates(type, id) {
  const sessionId = localStorage.getItem("session_id");
  if (!sessionId) return null;

  const url = `${BASE_URL}/${type}/${id}/account_states?api_key=${API_KEY}&session_id=${sessionId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  
  return {
    favorite: data.favorite,
    watchlist: data.watchlist,
    rating: data.rated?.value ? Math.round((data.rated.value / 10) * 5) : null
  };
} 

//btn toggle section
const accountStates = await fetchAccountStates(type, movieId);
if (accountStates?.favorite) {
  btnFav.textContent = "❤️";
  btnFav.classList.add("active");
}

if (accountStates?.watchlist) {
  btnList.textContent = "✔️";
  btnList.classList.add("active");
}

//rating section 
function setupStarRating(type, id, existingRating = null) {
  const stars = document.querySelectorAll("#starRating span");
  const deleteBtn = document.getElementById("deleteRating");

  if (!stars.length) return;

  const sessionId = localStorage.getItem("session_id");
  const guestSessionId = localStorage.getItem("guest_session_id");

  if (!sessionId && !guestSessionId) {
    stars.forEach(s => (s.style.pointerEvents = "none"));
    if (deleteBtn) deleteBtn.style.display = "none";
    return;
  }

  let selected = existingRating || 0;

  function updateUI(value = selected) {
    stars.forEach(star => {
      star.classList.toggle(
        "filled",
        Number(star.dataset.value) <= value
      );
    });
  }

  updateUI();

  stars.forEach(star => {
    const value = Number(star.dataset.value);

    star.addEventListener("mouseover", () => updateUI(value));

    star.addEventListener("mouseleave", () => updateUI());

    star.addEventListener("click", async () => {
      const tmdbValue = value * 2;

      const authParam = sessionId
        ?`session_id=${sessionId}`
        :`guest_session_id=${guestSessionId}`;

      const url = `${BASE_URL}/${type}/${id}/rating?api_key=${API_KEY}&${authParam}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: tmdbValue })
      });

      const data = await res.json();

      if (data.success ) {
        selected = value;
        updateUI();
        showToast("Rating Submitted", "info");
      }
    });
  });

  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      const authParam = sessionId
      ?`session_id=${sessionId}`
      :`guest_session_id=${guestSessionId}`;

      const url = `${BASE_URL}/${type}/${id}/rating?api_key=${API_KEY}&${authParam}`;

      const res = await fetch(url, {method: "DELETE"});
      const data = await res.json();

      if (data.success) {
        selected = 0;
        updateUI();
        showToast("Rating removed", "info");
      }
    };
  }
}
 
//Delete rating section
const trailerKey = await fetchTrailer(type, movieId);

const accountState = await fetchAccountStates(type, movieId);
setupStarRating(type, movieId, accountState?.rating ?? 0);


//render platforms
streamingSection.innerHTML="";
const providers = streaming?.flatrate || streaming?.buy || streaming?.rent || [];
if (providers.length === 0) {
  streamingSection.innerHTML = "<p>No platform's streaming the above Movie/Show in your region</p>";
} else {
  providers.slice(0,10).forEach(p => {
    streamingSection.innerHTML += `
    <div class="stream-card">
      <img src="${API_IMG + p.logo_path}">
      <p>${p.provider_name}</p>
    </div>
    `;
  });
}

// render cast
const castSlider = document.getElementById("cast-slider");
castSlider.innerHTML = "";

cast.cast?.slice(0, 20).forEach(actor => {
  castSlider.innerHTML += `
    <div class="cast-card">
      <img src="${API_IMG + actor.profile_path}">
      <p>${actor.name}</p>
      <span>${actor.character}</span>
    </div>
  `;
});

// render reviews 
//   reviewSection.innerHTML = "";
//   if (!reviews || reviews.length === 0) {
//     reviewSection.innerHTML = `<p>No reviews   Available..</p>`;
//   } else {
//   reviews.forEach(r => {
//     reviewSection.innerHTML = `
//     <div class="review-card">
//       <h2>${r.author}</h2>
//       <p>$${r.content}</p>
//     </div>
//     `;
//   })
// }

//render img
  imgSection.innerHTML = ""; 
  if (!images.backdrops || images.backdrops.length === 0) {
  imgSection.innerHTML = "<p>No images available</p>";
  } else {
    images.backdrops?.slice(0,6).forEach(i => {
    imgSection.innerHTML += `
    <div class="img-card">
      <img src="${API_IMG + i.file_path}">
    </div> 
    `;
   });
  }
console.log("Images Response:", images);

  // render related
   const relatedSlider = document.getElementById("related-slider");
    relatedSlider.innerHTML = "";

    if (related.results && related.results.length > 0) {
      related.results.forEach(r => {
        const card = document.createElement("div");
        card.className = "card";
        card.style.cursor = "pointer";
        card.innerHTML = `
        <img src="${API_IMG + r.poster_path}" alt="${r.title || r.name}">
        <div class="card-title">${r.title || r.name}</div>
        `;
        
        card.onclick = () => {
          const newType = type;
          const newId = r.id;

          window.location.hash = `#/${newType}/${newId}`;
        };
        
        relatedSlider.appendChild(card);
      });
    } else {
      relatedSlider.innerHTML = "<p>No Related Content Available</p>";
    }

 const userRating = await fetchAccountStates(type, movieId);
  
} 

document.querySelectorAll(".slide-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const slider = document.getElementById(btn.dataset.target);
    const scrollAmount = 300;

    if (btn.classList.contains("left")) {
      slider.scrollLeft -= scrollAmount;
    } else {
      slider.scrollLeft += scrollAmount;
    }
  });
});
 render();
}
window.addEventListener("hashchange", () => {
  if (document.getElementById("details-container")) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    initDetailsPage();
  }
});
