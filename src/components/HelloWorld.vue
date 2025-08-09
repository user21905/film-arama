<template>
  <div class="container">
    <h1 class="main-title">
      <span class="emoji">🎬</span>
      <span class="brand">CineScope</span>
      <span class="subtitle">Film Arama ve İzleme Listesi</span>
    </h1>
    <div class="search-container">
      <MagnifyingGlassIcon class="search-icon" />
      <input
        v-model="search"
        @input="searchMovies"
        type="text"
        placeholder="Film ara..."
        class="search-bar"
      />
    </div>
    
    <!-- Filtreleme Alanı -->
    <div class="filter-bar">
      <select v-model="selectedGenre" @change="applyFilters" class="filter-select" :disabled="genres.length === 0">
        <option value="">{{ genres.length === 0 ? 'Türler Yükleniyor...' : 'Tüm Türler' }}</option>
        <option v-for="genre in genres" :key="genre.id" :value="genre.id">{{ genre.name }}</option>
      </select>
      
      <select v-model="selectedYear" @change="applyFilters" class="filter-select" :disabled="years.length === 0">
        <option value="">{{ years.length === 0 ? 'Yıllar Yükleniyor...' : 'Tüm Yıllar' }}</option>
        <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
      </select>
      
      <select v-model="selectedRating" @change="applyFilters" class="filter-select" :disabled="ratings.length === 0">
        <option value="">{{ ratings.length === 0 ? 'Puanlar Yükleniyor...' : 'Tüm Puanlar' }}</option>
        <option v-for="rating in ratings" :key="rating" :value="rating">{{ rating }}+ yıldız</option>
      </select>
      
      <button @click="clearFilters" class="clear-filters-btn">
        <XMarkIcon class="clear-icon" />
        Filtreleri Temizle
      </button>
    </div>
    
    <div v-if="movies.length">
      <h2 class="page-title">
        {{ getPageTitle() }}
      </h2>
      <div class="movie-grid">
        <div 
          v-for="movie in filteredMovies" 
          :key="movie.id" 
          class="movie-card"
          @click="goToDetail(movie.id)"
          @mouseenter="hoveredMovieId = movie.id"
          @mouseleave="hoveredMovieId = null"
        >
          <img v-if="movie.poster_path" :src="getPosterUrl(movie.poster_path)" alt="poster" class="poster" />
          
          <!-- Film Bilgileri -->
          <div class="movie-info">
            <h3 class="movie-title">{{ movie.title }}</h3>
            
            <!-- Tür Etiketleri -->
            <div class="movie-genres">
              <span 
                v-for="genreId in movie.genre_ids.slice(0, 2)" 
                :key="genreId" 
                class="genre-tag"
              >
                {{ getGenreName(genreId) }}
              </span>
            </div>
            
            <!-- Yıldızlı Puan -->
            <div class="movie-rating">
              <div class="stars">
                <StarIcon 
                  v-for="n in 5" 
                  :key="n" 
                  class="star" 
                  :class="{ filled: n <= Math.round(movie.vote_average/2) }" 
                />
              </div>
              <span class="rating-score">{{ movie.vote_average.toFixed(1) }}</span>
            </div>
            
            <!-- Yıl -->
            <div class="movie-year">
              {{ movie.release_date?.slice(0, 4) }}
            </div>
          </div>
          
          <!-- Hover Özeti -->
          <div v-if="hoveredMovieId === movie.id && movie.overview" class="movie-hover">
            <p class="hover-overview">{{ movie.overview }}</p>
          </div>
          <!-- Özet Yoksa Bilgi Mesajı -->
          <div v-if="hoveredMovieId === movie.id && !movie.overview" class="movie-hover no-overview">
            <p class="hover-overview">Bu film için henüz özet bulunmuyor.</p>
          </div>
          
          <!-- Favori Butonu -->
          <button
            class="favorite-icon-btn"
            @click.stop="handleFavoriteClick(movie)"
            :aria-label="isFavorite(movie) ? 'Favorilerde' : 'Favorilere Ekle'"
          >
            <HeartSolidIcon v-if="isFavorite(movie)" class="heart-solid" />
            <HeartIcon v-else class="heart-outline" />
          </button>
          
                           <span v-if="isFavorite(movie)" class="fav-label">Favorilerde</span>
                 <div class="fav-count-container">
                   <HeartIcon class="fav-count-icon" />
                   <span class="fav-count-text">{{ favoriteCounts[movie.id] || 0 }} kez favorilendi</span>
                 </div>
        </div>
      </div>
      <!-- Daha Fazla Yükle Butonu -->
      <button v-if="!isLoading && currentPage < totalPages" @click="loadMore" class="load-more-btn">
        <PlayIcon class="load-icon" />
        Daha Fazla Yükle
      </button>
      <div v-if="isLoading" class="loading-more">Yükleniyor...</div>
    </div>
    <div v-else>
      <div class="no-movies-message">
        <p>Film aramak için yukarıya yazmaya başlayın.</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  HeartIcon, 
  MagnifyingGlassIcon, 
  XMarkIcon,
  StarIcon,
  PlayIcon
} from '@heroicons/vue/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/vue/24/solid';

export default {
  components: {
    HeartIcon,
    HeartSolidIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    StarIcon,
    PlayIcon
  },
  data() {
    return {
      search: "",
      movies: [],
      popularMovies: [],
      favorites: [],
      isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
      favoriteCounts: {}, // filmId: count
      // Filtreleme için yeni değişkenler
      selectedGenre: "",
      selectedYear: "",
      selectedRating: "",
      genres: [],
      years: [],
      ratings: [],
      hoveredMovieId: null,
      currentPage: 1,
      totalPages: 1,
      isLoading: false,
      lastQueryType: 'popular', // 'popular', 'search', 'filter'
      lastQuery: ''
    }
  },
  computed: {
    filteredMovies() {
      let filtered = this.movies;
      
      // Tür filtresi
      if (this.selectedGenre) {
        filtered = filtered.filter(movie => 
          movie.genre_ids && movie.genre_ids.includes(parseInt(this.selectedGenre))
        );
      }
      
      // Yıl filtresi
      if (this.selectedYear) {
        filtered = filtered.filter(movie => 
          movie.release_date && movie.release_date.startsWith(this.selectedYear)
        );
      }
      
      // Puan filtresi
      if (this.selectedRating) {
        filtered = filtered.filter(movie => 
          movie.vote_average >= this.selectedRating
        );
      }
      
      return filtered;
    }
  },
  async mounted() {
    await this.fetchPopularMovies();
    await this.fetchGenres();
    this.fetchYears();
    this.generateRatings();
    
    // Login durumu değişikliklerini dinle
    window.addEventListener('storage', this.handleLogout);
    window.addEventListener('logout', this.handleLogout);
    
    // Eğer kullanıcı giriş yapmışsa favorileri yükle
    if (this.isLoggedIn) {
      await this.loadUserFavorites();
    }
  },
  beforeUnmount() {
    window.removeEventListener('storage', this.handleLogout);
    window.removeEventListener('logout', this.handleLogout);
  },
  methods: {
    async fetchPopularMovies() {
      try {
        this.isLoading = true;
        const response = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR&region=TR&page=${this.currentPage}&append_to_response=translations`);
        
        // Türkçe çevirileri kontrol et ve uygula
        const moviesWithTranslations = await Promise.all(
          response.data.results.map(async (movie) => {
            try {
              // Her film için ayrı detay isteği yap
              const detailResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR&region=TR&append_to_response=translations`);
              const translations = detailResponse.data.translations?.translations || [];
              const turkishTranslation = translations.find(t => t.iso_639_1 === 'tr');
              
              if (turkishTranslation && turkishTranslation.data.title) {
                movie.title = turkishTranslation.data.title;
                console.log(`Film ${movie.id} Türkçe başlık uygulandı: ${movie.title}`);
              } else {
                console.log(`Film ${movie.id} Türkçe başlık bulunamadı, orijinal: ${movie.title}`);
              }
              
              if (turkishTranslation && turkishTranslation.data.overview) {
                movie.overview = turkishTranslation.data.overview;
              }
              
              return movie;
            } catch (error) {
              console.error(`Film ${movie.id} çevirisi alınırken hata:`, error);
              return movie;
            }
          })
        );
        
        this.movies = moviesWithTranslations;
        this.popularMovies = moviesWithTranslations;
        this.totalPages = response.data.total_pages;
        this.lastQueryType = 'popular';
        this.lastQuery = '';
        console.log('Popüler filmler yüklendi:', this.movies.length);
      } catch (error) {
        console.error('Popüler filmler yüklenirken hata:', error);
        // Hata durumunda boş array ata
        this.movies = [];
        this.popularMovies = [];
      } finally {
        this.isLoading = false;
      }
    },
    
    async searchMovies() {
      if (this.search.trim().length < 2) {
        this.movies = this.popularMovies;
        this.lastQueryType = 'popular';
        this.lastQuery = '';
        return;
      }
      
      try {
        this.isLoading = true;
        const response = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR&region=TR&query=${encodeURIComponent(this.search)}&page=${this.currentPage}`);
        
        // Türkçe çevirileri kontrol et ve uygula
        const moviesWithTranslations = await Promise.all(
          response.data.results.map(async (movie) => {
            try {
              // Her film için ayrı detay isteği yap
              const detailResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR&region=TR&append_to_response=translations`);
              const translations = detailResponse.data.translations?.translations || [];
              const turkishTranslation = translations.find(t => t.iso_639_1 === 'tr');
              
              if (turkishTranslation && turkishTranslation.data.title) {
                movie.title = turkishTranslation.data.title;
                console.log(`Film ${movie.id} Türkçe başlık uygulandı: ${movie.title}`);
              } else {
                console.log(`Film ${movie.id} Türkçe başlık bulunamadı, orijinal: ${movie.title}`);
              }
              
              if (turkishTranslation && turkishTranslation.data.overview) {
                movie.overview = turkishTranslation.data.overview;
              }
              
              return movie;
            } catch (error) {
              console.error(`Film ${movie.id} çevirisi alınırken hata:`, error);
              return movie;
            }
          })
        );
        
        this.movies = moviesWithTranslations;
        this.totalPages = response.data.total_pages;
        this.lastQueryType = 'search';
        this.lastQuery = this.search;
        console.log('Arama sonuçları:', this.movies.length);
      } catch (error) {
        console.error('Film arama hatası:', error);
      } finally {
        this.isLoading = false;
      }
    },
    
    async applyFilters() {
      if (!this.selectedGenre && !this.selectedYear && !this.selectedRating) {
        this.movies = this.popularMovies;
        this.lastQueryType = 'popular';
        this.lastQuery = '';
        return;
      }
      
      try {
        this.isLoading = true;
        let url = `https://api.themoviedb.org/3/discover/movie?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR&region=TR&page=${this.currentPage}`;
        
        if (this.selectedGenre) {
          url += `&with_genres=${this.selectedGenre}`;
        }
        if (this.selectedYear) {
          url += `&primary_release_year=${this.selectedYear}`;
        }
        if (this.selectedRating) {
          url += `&vote_average.gte=${this.selectedRating}`;
        }
        
        const response = await axios.get(url);
        
        // Türkçe çevirileri kontrol et ve uygula
        const moviesWithTranslations = await Promise.all(
          response.data.results.map(async (movie) => {
            try {
              // Her film için ayrı detay isteği yap
              const detailResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR&region=TR&append_to_response=translations`);
              const translations = detailResponse.data.translations?.translations || [];
              const turkishTranslation = translations.find(t => t.iso_639_1 === 'tr');
              
              if (turkishTranslation && turkishTranslation.data.title) {
                movie.title = turkishTranslation.data.title;
                console.log(`Film ${movie.id} Türkçe başlık uygulandı: ${movie.title}`);
              } else {
                console.log(`Film ${movie.id} Türkçe başlık bulunamadı, orijinal: ${movie.title}`);
              }
              
              if (turkishTranslation && turkishTranslation.data.overview) {
                movie.overview = turkishTranslation.data.overview;
              }
              
              return movie;
            } catch (error) {
              console.error(`Film ${movie.id} çevirisi alınırken hata:`, error);
              return movie;
            }
          })
        );
        
        this.movies = moviesWithTranslations;
        this.totalPages = response.data.total_pages;
        this.lastQueryType = 'filter';
        this.lastQuery = `${this.selectedGenre}-${this.selectedYear}-${this.selectedRating}`;
        console.log('Filtrelenmiş sonuçlar:', this.movies.length);
      } catch (error) {
        console.error('Filtreleme hatası:', error);
      } finally {
        this.isLoading = false;
      }
    },
    
    async clearFilters() {
      this.selectedGenre = "";
      this.selectedYear = "";
      this.selectedRating = "";
      this.currentPage = 1;
      await this.fetchPopularMovies();
    },
    
    async loadMore() {
      if (this.isLoading || this.currentPage >= this.totalPages) return;
      
      this.currentPage++;
      
      try {
        this.isLoading = true;
        let url = '';
        
        if (this.lastQueryType === 'popular') {
          url = `https://api.themoviedb.org/3/movie/popular?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR&region=TR&page=${this.currentPage}`;
        } else if (this.lastQueryType === 'search') {
                      url = `https://api.themoviedb.org/3/search/movie?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR&region=TR&query=${encodeURIComponent(this.lastQuery)}&page=${this.currentPage}`;
        } else if (this.lastQueryType === 'filter') {
                      url = `https://api.themoviedb.org/3/discover/movie?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR&region=TR&page=${this.currentPage}`;
          if (this.selectedGenre) url += `&with_genres=${this.selectedGenre}`;
          if (this.selectedYear) url += `&primary_release_year=${this.selectedYear}`;
          if (this.selectedRating) url += `&vote_average.gte=${this.selectedRating}`;
        }
        
        const response = await axios.get(url);
        
        // Türkçe çevirileri kontrol et ve uygula
        const moviesWithTranslations = await Promise.all(
          response.data.results.map(async (movie) => {
            try {
              // Her film için ayrı detay isteği yap
              const detailResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR&region=TR&append_to_response=translations`);
              const translations = detailResponse.data.translations?.translations || [];
              const turkishTranslation = translations.find(t => t.iso_639_1 === 'tr');
              
              if (turkishTranslation && turkishTranslation.data.title) {
                movie.title = turkishTranslation.data.title;
                console.log(`Film ${movie.id} Türkçe başlık uygulandı: ${movie.title}`);
              } else {
                console.log(`Film ${movie.id} Türkçe başlık bulunamadı, orijinal: ${movie.title}`);
              }
              
              if (turkishTranslation && turkishTranslation.data.overview) {
                movie.overview = turkishTranslation.data.overview;
              }
              
              return movie;
            } catch (error) {
              console.error(`Film ${movie.id} çevirisi alınırken hata:`, error);
              return movie;
            }
          })
        );
        
        this.movies = [...this.movies, ...moviesWithTranslations];
        console.log('Daha fazla film yüklendi:', moviesWithTranslations.length);
      } catch (error) {
        console.error('Daha fazla film yüklenirken hata:', error);
        this.currentPage--; // Hata durumunda sayfa numarasını geri al
      } finally {
        this.isLoading = false;
      }
    },
    
    async fetchGenres() {
      try {
        const response = await axios.get(`https://api.themoviedb.org/3/genre/movie/list?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR`);
        this.genres = response.data.genres;
        console.log('Türler yüklendi:', this.genres.length);
      } catch (error) {
        console.error('Türler yüklenirken hata:', error);
      }
    },
    
    async fetchYears() {
      const currentYear = new Date().getFullYear();
      this.years = [];
      for (let year = currentYear; year >= 1900; year--) {
        this.years.push(year);
      }
    },
    
    generateRatings() {
      this.ratings = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    },
    
    getGenreName(genreId) {
      const genre = this.genres.find(g => g.id === genreId);
      return genre ? genre.name : '';
    },
    
    getPosterUrl(posterPath) {
      return `https://image.tmdb.org/t/p/w500${posterPath}`;
    },
    
    getPageTitle() {
      if (this.search.trim()) {
        return 'Arama Sonuçları';
      } else if (this.selectedGenre || this.selectedYear || this.selectedRating) {
        return 'Filtrelenmiş Sonuçlar';
      } else {
        return 'Öne Çıkanlar';
      }
    },
    
    goToDetail(movieId) {
      this.$router.push(`/movie/${movieId}`);
    },
    
    async loadUserFavorites() {
      try {
        const userEmail = JSON.parse(localStorage.getItem('user')).email;
        const userDocRef = doc(db, 'users', userEmail);
        const favoritesRef = collection(userDocRef, 'favorites');
        const querySnapshot = await getDocs(favoritesRef);
        
        this.favorites = querySnapshot.docs.map(doc => doc.data());
        console.log('Kullanıcı favorileri yüklendi:', this.favorites.length);
        
        // Favori sayılarını yükle
        await this.loadFavoriteCounts();
      } catch (error) {
        console.error('Favoriler yüklenirken hata:', error);
        this.favorites = [];
      }
    },
    
    async loadFavoriteCounts() {
      try {
        // Tüm kullanıcıların favorilerini say
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        // Her kullanıcının favorilerini kontrol et
        for (const userDoc of usersSnapshot.docs) {
          const userFavoritesRef = collection(userDoc.ref, 'favorites');
          const favoritesSnapshot = await getDocs(userFavoritesRef);
          
          favoritesSnapshot.docs.forEach(favDoc => {
            const movieId = favDoc.data().id;
            this.favoriteCounts[movieId] = (this.favoriteCounts[movieId] || 0) + 1;
          });
        }
        
        console.log('Favori sayıları hesaplandı:', Object.keys(this.favoriteCounts).length);
      } catch (error) {
        console.error('Favori sayıları yüklenirken hata:', error);
      }
    },
    
    isFavorite(movie) {
      if (!this.isLoggedIn) return false;
      return this.favorites.some(fav => fav.id === movie.id);
    },
    
    async handleFavoriteClick(movie) {
      if (!this.isLoggedIn) {
        this.$router.push('/login');
        return;
      }
      
      try {
        const userEmail = JSON.parse(localStorage.getItem('user')).email;
        const userDocRef = doc(db, 'users', userEmail);
        const favoritesRef = doc(userDocRef, 'favorites', movie.id.toString());
        
        if (this.isFavorite(movie)) {
          // Favorilerden çıkar
          await deleteDoc(favoritesRef);
          this.favorites = this.favorites.filter(fav => fav.id !== movie.id);
          
          // Favori sayısını azalt
          await this.updateFavoriteCount(movie.id, -1);
        } else {
          // Favorilere ekle
          await setDoc(favoritesRef, {
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            vote_average: movie.vote_average,
            release_date: movie.release_date,
            addedAt: new Date()
          });
          this.favorites.push(movie);
          
          // Favori sayısını artır
          await this.updateFavoriteCount(movie.id, 1);
        }
        
        console.log('Favori durumu güncellendi');
      } catch (error) {
        console.error('Favori işlemi hatası:', error);
      }
    },
    
    async updateFavoriteCount(movieId, change) {
      try {
        // Lokal sayacı güncelle
        this.favoriteCounts[movieId] = Math.max(0, (this.favoriteCounts[movieId] || 0) + change);
        
        if (this.favoriteCounts[movieId] === 0) {
          delete this.favoriteCounts[movieId];
        }
        
        console.log(`Film ${movieId} favori sayısı güncellendi: ${change > 0 ? '+' : ''}${change}`);
      } catch (error) {
        console.error('Favori sayısı güncellenirken hata:', error);
      }
    },
    
    handleLogout() {
      this.favorites = [];
      this.favoriteCounts = {};
      this.isLoggedIn = false;
    }
  }
}
</script>

<style scoped>
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  margin-top: 80px;
  background: #1a1a2e;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.main-title {
  text-align: center;
  margin-bottom: 3rem;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.emoji {
  font-size: 3rem;
}

.brand {
  color: #64b5f6;
  font-size: 3rem;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(100, 181, 246, 0.3);
}

.subtitle {
  color: #cccccc;
  font-size: 1.4rem;
  font-weight: 500;
}

.search-container {
  position: relative;
  max-width: 600px;
  margin: 0 auto 2rem auto;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 1.5rem;
  color: #888888;
  z-index: 2;
}

.search-bar {
  width: 100%;
  padding: 1.2rem 1.5rem 1.2rem 3rem;
  font-size: 1.1rem;
  border: 2px solid #2a2a3e;
  border-radius: 15px;
  background: #2a2a3e;
  color: #ffffff;
  transition: all 0.3s ease;
  display: block;
}

.search-bar:focus {
  outline: none;
  border-color: #64b5f6;
  box-shadow: 0 0 20px rgba(100, 181, 246, 0.2);
}

.search-bar::placeholder {
  color: #888888;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.filter-select {
  padding: 0.8rem 1rem;
  border: 2px solid #2a2a3e;
  border-radius: 10px;
  background: #2a2a3e;
  color: #ffffff;
  min-width: 180px;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #64b5f6;
}

.filter-select:hover {
  border-color: #64b5f6;
  background: #3a3a4e;
}

.clear-filters-btn {
  padding: 0.8rem 1.5rem;
  background: linear-gradient(135deg, #e63946, #d32f2f);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.clear-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.clear-filters-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(230, 57, 70, 0.4);
}

.movie-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.movie-card {
  background: #2a2a3e;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.movie-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
  border-color: rgba(100, 181, 246, 0.3);
}

.poster {
  width: 100%;
  height: 320px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.movie-card:hover .poster {
  transform: scale(1.05);
}

.movie-info {
  padding: 1rem;
}

.movie-title {
  color: #ffffff;
  font-size: 1rem;
  margin-bottom: 0.6rem;
  font-weight: 600;
  line-height: 1.3;
  min-height: 2.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.movie-genres {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}

.genre-tag {
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  color: #ffffff;
  padding: 0.2rem 0.6rem;
  border-radius: 15px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 6px rgba(100, 181, 246, 0.3);
}

.movie-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.stars {
  display: flex;
  gap: 2px;
}

.star {
  width: 1rem;
  height: 1rem;
  color: #333333;
  transition: color 0.3s ease;
}

.star.filled {
  color: #ffd700;
  filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.5));
}

.rating-score {
  color: #ffffff;
  font-weight: 600;
  font-size: 0.9rem;
  background: rgba(255, 215, 0, 0.2);
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.movie-year {
  color: #888888;
  font-size: 0.8rem;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
  display: inline-block;
}

.movie-hover {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(5px);
}

.movie-card:hover .movie-hover {
  opacity: 1;
}

.hover-overview {
  color: #ffffff;
  text-align: center;
  line-height: 1.6;
  font-size: 0.95rem;
  font-weight: 500;
  max-height: 80%;
  overflow-y: auto;
}

.favorite-icon-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.heart-solid {
  width: 1.5rem;
  height: 1.5rem;
  color: #e63946;
}

.heart-outline {
  width: 1.5rem;
  height: 1.5rem;
  color: #cccccc;
}

.favorite-icon-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: #64b5f6;
  transform: scale(1.1);
}

.fav-label {
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  color: #ffffff;
  padding: 0.2rem 0.6rem;
  border-radius: 15px;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 6px rgba(100, 181, 246, 0.3);
}

.fav-count-container {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.9);
  color: #ffffff;
  padding: 0.4rem 0.8rem;
  border-radius: 15px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.fav-count-icon {
  width: 0.9rem;
  height: 0.9rem;
  color: #e63946;
}

.fav-count-text {
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 600;
}

.load-more-btn {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin: 3rem auto;
  padding: 1.2rem 3rem;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  color: #ffffff;
  border: none;
  border-radius: 15px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(100, 181, 246, 0.3);
}

.load-icon {
  width: 1.3rem;
  height: 1.3rem;
}

.load-more-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(100, 181, 246, 0.4);
}

.loading-more {
  text-align: center;
  color: #64b5f6;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 3rem 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.no-movies-message {
  text-align: center;
  color: #888888;
  font-size: 1.2rem;
  margin: 3rem 0;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.page-title {
  color: #ffffff;
  font-size: 1.8rem;
  font-weight: 700;
  margin: 2rem 0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
    margin-top: 60px;
    border-radius: 0;
  }
  
  .main-title {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .brand {
    font-size: 2.5rem;
  }
  
  .subtitle {
    font-size: 1.1rem;
  }
  
  .search-bar {
    max-width: 100%;
    padding: 1rem;
  }
  
  .filter-bar {
    flex-direction: column;
    gap: 1rem;
  }
  
  .filter-select {
    min-width: 100%;
  }
  
  .movie-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .poster {
    height: 280px;
  }
  
  .movie-info {
    padding: 0.8rem;
  }
  
  .movie-title {
    font-size: 0.95rem;
    min-height: 2.2rem;
  }
  
  .fav-count-container {
    padding: 0.3rem 0.6rem;
    font-size: 0.6rem;
  }
  
  .fav-count-text {
    font-size: 0.6rem;
  }
}

@media (max-width: 480px) {
  .movie-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.8rem;
  }
  
  .poster {
    height: 250px;
  }
  
  .brand {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
  
  .fav-count-container {
    padding: 0.25rem 0.5rem;
    font-size: 0.55rem;
  }
  
  .fav-count-text {
    font-size: 0.55rem;
  }
  
  .fav-count-icon {
    width: 0.8rem;
    height: 0.8rem;
  }
}
</style>
