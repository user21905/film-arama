<template>
  <div class="container">
    <h1 class="main-title">
      <span class="emoji">🎬</span>
      <span class="brand">CineScope</span>
      <span class="subtitle">Favorilerim</span>
    </h1>
    
    <div v-if="favorites.length" class="movie-grid">
      <div 
        v-for="movie in favorites" 
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
          <div class="movie-genres" v-if="movie.genre_ids">
            <span 
              v-for="genreId in movie.genre_ids.slice(0, 2)" 
              :key="genreId" 
              class="genre-tag"
            >
              {{ getGenreName(genreId) }}
            </span>
          </div>
          
          <!-- Yıldızlı Puan -->
          <div class="movie-rating" v-if="movie.vote_average">
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
          <div class="movie-year" v-if="movie.release_date">
            {{ movie.release_date.slice(0, 4) }}
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
          :aria-label="'Favorilerden Çıkar'"
        >
          <HeartSolidIcon class="heart-solid" />
        </button>
        
        <span class="fav-label">Favorilerde</span>
        <div class="fav-count-container">
          <HeartIcon class="fav-count-icon" />
          <span class="fav-count-text">{{ favoriteCounts[movie.id] || 0 }} kez favorilendi</span>
        </div>
      </div>
    </div>
    
    <div v-else class="no-favorites">
      <HeartIcon class="no-favorites-icon" />
      <p>Henüz favori film eklemediniz.</p>
      <router-link to="/" class="go-home-btn">
        <HomeIcon class="btn-icon" />
        Anasayfaya Git
      </router-link>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { doc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  HeartIcon, 
  StarIcon,
  HomeIcon
} from '@heroicons/vue/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/vue/24/solid';

export default {
  name: 'FavoritesPage',
  components: {
    HeartIcon,
    HeartSolidIcon,
    StarIcon,
    HomeIcon
  },
  data() {
    return {
      favorites: [],
      favoriteCounts: {},
      genres: [],
      hoveredMovieId: null
    }
  },
  async mounted() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
      this.$router.push('/login');
      return;
    }
    await this.fetchGenres();
    await this.fetchFavorites();
  },
  methods: {
    async fetchFavorites() {
      try {
        const userEmail = JSON.parse(localStorage.getItem('user')).email;
        const userDocRef = doc(db, 'users', userEmail);
        const favoritesRef = collection(userDocRef, 'favorites');
        const querySnapshot = await getDocs(favoritesRef);
        
        this.favorites = querySnapshot.docs.map(doc => doc.data());
        console.log('Favoriler yüklendi:', this.favorites.length);
        
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
      return this.favorites.some(fav => fav.id === movie.id);
    },
    
    async handleFavoriteClick(movie) {
      try {
        const userEmail = JSON.parse(localStorage.getItem('user')).email;
        const userDocRef = doc(db, 'users', userEmail);
        const favoritesRef = doc(userDocRef, 'favorites', movie.id.toString());
        
        await deleteDoc(favoritesRef);
        this.favorites = this.favorites.filter(fav => fav.id !== movie.id);
        
        // Favori sayısını azalt
        await this.updateFavoriteCount(movie.id, -1);
        
        console.log('Film favorilerden çıkarıldı');
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
    
    getPosterUrl(path) {
      return `https://image.tmdb.org/t/p/w500${path}`;
    },
    
    async fetchGenres() {
      try {
        const response = await axios.get(`https://api.themoviedb.org/3/genre/movie/list?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77&language=tr-TR`);
        this.genres = response.data.genres;
      } catch (error) {
        console.error('Film türleri yüklenirken hata:', error);
      }
    },
    
    getGenreName(genreId) {
      const genre = this.genres.find(g => g.id === genreId);
      return genre ? genre.name : '';
    },
    
    goToDetail(movieId) {
      this.$router.push(`/movie/${movieId}`);
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

.favorite-icon-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: #64b5f6;
  transform: scale(1.1);
}

.heart-solid {
  width: 1.5rem;
  height: 1.5rem;
  color: #e63946;
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

.no-favorites {
  text-align: center;
  color: #888888;
  font-size: 1.2rem;
  margin: 3rem 0;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.no-favorites-icon {
  width: 4rem;
  height: 4rem;
  color: #888888;
  margin: 0 auto 1rem auto;
  opacity: 0.5;
}

.go-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.8rem 1.5rem;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  color: #ffffff;
  text-decoration: none;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.go-home-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(100, 181, 246, 0.4);
}

.btn-icon {
  width: 1.2rem;
  height: 1.2rem;
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