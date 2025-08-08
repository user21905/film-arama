<template>
  <div class="movie-detail-container" v-if="movie">
    <div class="detail-backdrop" :style="{ backgroundImage: `url(${getBackdropUrl(movie.backdrop_path)})` }">
      <div class="backdrop-overlay"></div>
    </div>
    
    <div class="detail-content">
      <div class="detail-poster-section">
        <img :src="getPosterUrl(movie.poster_path)" class="detail-poster" :alt="movie.title" />
        <div class="detail-actions">
          <button 
            class="favorite-btn"
            @click="handleFavoriteClick(movie)"
            :class="{ 'is-favorite': isFavorite(movie) }"
          >
            <svg v-if="isFavorite(movie)" xmlns="http://www.w3.org/2000/svg" fill="#e63946" viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#cccccc" stroke-width="2" viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>{{ isFavorite(movie) ? 'Favorilerde' : 'Favorilere Ekle' }}</span>
          </button>
        </div>
      </div>
      
      <div class="detail-info">
        <h1 class="detail-title">{{ movie.title }}</h1>
        <div class="detail-meta">
          <div class="detail-genres">
            <span class="genre-badge" v-for="genre in movie.genres" :key="genre.id">{{ genre.name }}</span>
          </div>
          <div class="detail-rating">
            <div class="stars">
              <span v-for="n in 5" :key="n" class="star" :class="{ filled: n <= Math.round(movie.vote_average/2) }">★</span>
            </div>
            <span class="score">{{ movie.vote_average.toFixed(1) }}</span>
            <span class="vote-count">({{ movie.vote_count }} oy)</span>
          </div>
          <div class="detail-dates">
            <span class="release-date">{{ formatDate(movie.release_date) }}</span>
            <span class="runtime" v-if="movie.runtime">{{ movie.runtime }} dk</span>
          </div>
        </div>
        
        <p class="detail-overview" v-if="movie.overview">{{ movie.overview }}</p>
        
        <div class="detail-cast" v-if="cast.length">
          <h3>Oyuncular</h3>
          <div class="cast-list">
            <div v-for="actor in cast.slice(0, 8)" :key="actor.id" class="cast-item">
              <img v-if="actor.profile_path" :src="getProfileUrl(actor.profile_path)" :alt="actor.name" class="cast-photo" />
              <div v-else class="cast-photo-placeholder"></div>
              <span class="cast-name">{{ actor.name }}</span>
              <span class="cast-character">{{ actor.character }}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-crew" v-if="director">
          <h3>Yönetmen</h3>
          <p>{{ director }}</p>
        </div>
        
        <div class="detail-extra" v-if="movie.production_companies?.length">
          <h3>Yapım Şirketi</h3>
          <p>{{ movie.production_companies.map(c => c.name).join(', ') }}</p>
        </div>
        
        <div class="detail-budget" v-if="movie.budget">
          <h3>Bütçe</h3>
          <p>${{ movie.budget.toLocaleString() }}</p>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="loading-container">
    <div class="loading-spinner"></div>
    <p>Film bilgileri yükleniyor...</p>
  </div>
</template>

<script>
import axios from 'axios';
import { doc, getDoc, setDoc, updateDoc, increment, deleteDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

export default {
  name: 'MovieDetailPage',
  props: ['id'],
  data() {
    return {
      movie: null,
      cast: [],
      director: '',
      isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
      favorites: []
    }
  },
  async mounted() {
    await this.fetchMovieDetails();
    await this.fetchUserFavorites();
  },
  methods: {
    async fetchMovieDetails() {
      try {
        const apiKey = '8c247ea0b4b56ed2ff7d41c9a833aa77';
        
        // Film detayları - Türkçe dil desteği ile
        const movieRes = await axios.get(`https://api.themoviedb.org/3/movie/${this.id}?api_key=${apiKey}&language=tr-TR&region=TR&append_to_response=credits,translations`);
        this.movie = movieRes.data;
        
        // Türkçe çeviri kontrolü - daha kapsamlı
        const translations = movieRes.data.translations?.translations || [];
        const turkishTranslation = translations.find(t => t.iso_639_1 === 'tr');
        
        if (turkishTranslation && turkishTranslation.data.title) {
          this.movie.title = turkishTranslation.data.title;
          console.log('Türkçe başlık uygulandı:', this.movie.title);
        } else {
          console.log('Türkçe başlık bulunamadı, orijinal kullanılıyor:', this.movie.title);
        }
        
        if (turkishTranslation && turkishTranslation.data.overview) {
          this.movie.overview = turkishTranslation.data.overview;
          console.log('Türkçe özet uygulandı');
        } else {
          console.log('Türkçe özet bulunamadı, orijinal kullanılıyor');
        }
        
        // Oyuncular
        this.cast = movieRes.data.credits?.cast || [];
        
        // Yönetmen
        const directorObj = movieRes.data.credits?.crew?.find(c => c.job === 'Director');
        this.director = directorObj ? directorObj.name : '';
        
      } catch (error) {
        console.error('Film detayları yüklenirken hata:', error);
      }
    },
    
    async fetchUserFavorites() {
      if (!this.isLoggedIn) return;
      
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.email) return;
        
        const q = query(collection(db, 'favoriler'), where('users', 'array-contains', user.email));
        const querySnapshot = await getDocs(q);
        this.favorites = querySnapshot.docs.map(doc => doc.data());
      } catch (error) {
        console.error('Favoriler yüklenirken hata:', error);
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
      
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.email) {
        this.$router.push('/login');
        return;
      }
      
      if (this.isFavorite(movie)) {
        await this.removeFromFavorites(movie);
      } else {
        await this.addToFavorites(movie);
      }
      
      await this.fetchUserFavorites();
    },
    
    async addToFavorites(movie) {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const movieRef = doc(db, 'favoriler', movie.id.toString());
        const movieSnap = await getDoc(movieRef);
        
        if (movieSnap.exists()) {
          await updateDoc(movieRef, {
            users: arrayUnion(user.email),
            count: increment(1)
          });
        } else {
          await setDoc(movieRef, {
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            overview: movie.overview,
            vote_average: movie.vote_average,
            release_date: movie.release_date,
            users: [user.email],
            count: 1
          });
        }
      } catch (error) {
        console.error('Favorilere ekleme hatası:', error);
      }
    },
    
    async removeFromFavorites(movie) {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const movieRef = doc(db, 'favoriler', movie.id.toString());
        const movieSnap = await getDoc(movieRef);
        
        if (movieSnap.exists()) {
          const data = movieSnap.data();
          const updatedUsers = data.users.filter(email => email !== user.email);
          
          if (updatedUsers.length === 0) {
            await deleteDoc(movieRef);
          } else {
            await updateDoc(movieRef, {
              users: updatedUsers,
              count: increment(-1)
            });
          }
        }
      } catch (error) {
        console.error('Favorilerden çıkarma hatası:', error);
      }
    },
    
    getPosterUrl(path) {
      return path ? `https://image.tmdb.org/t/p/w500${path}` : '';
    },
    
    getBackdropUrl(path) {
      return path ? `https://image.tmdb.org/t/p/original${path}` : '';
    },
    
    getProfileUrl(path) {
      return path ? `https://image.tmdb.org/t/p/w185${path}` : '';
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }
}
</script>

<style scoped>
.movie-detail-container {
  min-height: 100vh;
  background: #181828;
  color: #f4f4f4;
  position: relative;
}

.detail-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60vh;
  background-size: cover;
  background-position: center;
  z-index: 1;
}

.backdrop-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(24, 24, 40, 0.3), rgba(24, 24, 40, 0.9));
}

.detail-content {
  position: relative;
  z-index: 2;
  padding: 120px 32px 32px;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 48px;
  align-items: flex-start;
}

.detail-poster-section {
  flex-shrink: 0;
  width: 300px;
}

.detail-poster {
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  margin-bottom: 24px;
}

.detail-actions {
  display: flex;
  justify-content: center;
}

.favorite-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #f4f4f4;
  padding: 12px 24px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
  font-weight: 600;
}

.favorite-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.favorite-btn.is-favorite {
  background: rgba(230, 57, 70, 0.2);
  border-color: #e63946;
  color: #e63946;
}

.detail-info {
  flex: 1;
  min-width: 0;
}

.detail-title {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 24px 0;
  line-height: 1.2;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 32px;
  align-items: center;
}

.detail-genres {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.genre-badge {
  background: linear-gradient(135deg, #4cc9f0, #4361ee);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-rating {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stars {
  display: flex;
  gap: 2px;
}

.star {
  font-size: 20px;
  color: #666;
}

.star.filled {
  color: #ffd700;
}

.score {
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
}

.vote-count {
  color: #999;
  font-size: 14px;
}

.detail-dates {
  display: flex;
  gap: 16px;
  color: #ccc;
  font-size: 16px;
}

.detail-overview {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 40px;
  color: #e0e0e0;
  max-width: 800px;
}

.detail-cast h3,
.detail-crew h3,
.detail-extra h3,
.detail-budget h3 {
  font-size: 24px;
  font-weight: 600;
  margin: 32px 0 16px 0;
  color: #4cc9f0;
}

.cast-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.cast-item {
  text-align: center;
}

.cast-photo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 8px;
  border: 3px solid #4cc9f0;
}

.cast-photo-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #333;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #4cc9f0;
}

.cast-name {
  display: block;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.cast-character {
  display: block;
  font-size: 12px;
  color: #999;
}

.detail-crew p,
.detail-extra p,
.detail-budget p {
  font-size: 16px;
  color: #e0e0e0;
  margin: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #f4f4f4;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #333;
  border-top: 4px solid #4cc9f0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .detail-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 100px 16px 32px;
  }
  
  .detail-poster-section {
    width: 250px;
  }
  
  .detail-title {
    font-size: 2.5rem;
  }
}

@media (max-width: 768px) {
  .detail-backdrop {
    height: 40vh;
  }
  
  .detail-content {
    padding: 80px 12px 24px;
  }
  
  .detail-poster-section {
    width: 200px;
  }
  
  .detail-title {
    font-size: 2rem;
  }
  
  .detail-meta {
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  
  .cast-list {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;
  }
  
  .cast-photo,
  .cast-photo-placeholder {
    width: 60px;
    height: 60px;
  }
}
</style> 