<template>
  <nav class="navbar">
    <div class="navbar-left">
      <img src="@/assets/logo.png" alt="Logo" class="navbar-logo" />
      <span class="navbar-title">CineScope</span>
      <router-link to="/" class="navbar-link">
        <HomeIcon class="nav-icon" />
        Anasayfa
      </router-link>
      <router-link to="/favorites" class="navbar-link">
        <HeartIcon class="nav-icon" />
        Favoriler
      </router-link>
    </div>
    <div class="navbar-right">
      <template v-if="!shouldShowAuthButtons">
        <span class="navbar-username">{{ user.name }}</span>
        <button class="navbar-btn logout" @click="logout">
          <ArrowRightOnRectangleIcon class="btn-icon" />
          Çıkış Yap
        </button>
      </template>
      <template v-else>
        <router-link to="/login" class="navbar-btn login">
          <UserIcon class="btn-icon" />
          Giriş Yap
        </router-link>
        <router-link to="/register" class="navbar-btn register">
          <UserIcon class="btn-icon" />
          Kayıt Ol
        </router-link>
      </template>
      <button class="navbar-hamburger" @click="toggleMenu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
    
    <!-- Mobil Menü -->
    <div v-if="mobileMenu" class="navbar-mobile-menu">
      <router-link to="/" class="navbar-link" @click="toggleMenu">
        <HomeIcon class="nav-icon" />
        Anasayfa
      </router-link>
      <router-link to="/favorites" class="navbar-link" @click="toggleMenu">
        <HeartIcon class="nav-icon" />
        Favoriler
      </router-link>
      
      <template v-if="!shouldShowAuthButtons">
        <span class="navbar-username">{{ user.name }}</span>
        <button class="navbar-btn logout" @click="logout">
          <ArrowRightOnRectangleIcon class="btn-icon" />
          Çıkış Yap
        </button>
      </template>
      <template v-else>
        <router-link to="/login" class="navbar-btn login" @click="toggleMenu">
          <UserIcon class="btn-icon" />
          Giriş Yap
        </router-link>
        <router-link to="/register" class="navbar-btn register" @click="toggleMenu">
          <UserIcon class="btn-icon" />
          Kayıt Ol
        </router-link>
      </template>
    </div>
  </nav>
</template>

<script>
import { 
  HomeIcon, 
  HeartIcon, 
  UserIcon, 
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'AppNavbar',
  components: {
    HomeIcon,
    HeartIcon,
    UserIcon,
    ArrowRightOnRectangleIcon
  },
  data() {
    return {
      isLoggedIn: false,
      user: null,
      mobileMenu: false
    }
  },
  computed: {
    shouldShowAuthButtons() {
      return !this.isLoggedIn || !this.user;
    }
  },
  methods: {
    logout() {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
      this.isLoggedIn = false;
      this.user = null;
      
      // Login durumu değişikliğini bildir
      window.dispatchEvent(new CustomEvent('loginStatusChanged'));
      
      // Favorileri temizle
      window.dispatchEvent(new CustomEvent('logout'));
      
      this.$router.push('/');
      
      console.log('Kullanıcı çıkış yaptı');
    },
    toggleMenu() {
      this.mobileMenu = !this.mobileMenu;
    },
    checkLoginStatus() {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      
      // Sadece değişiklik varsa güncelle
      if (this.isLoggedIn !== isLoggedIn || JSON.stringify(this.user) !== JSON.stringify(user)) {
        this.isLoggedIn = isLoggedIn;
        this.user = user;
        console.log('Navbar login durumu güncellendi:', this.isLoggedIn, this.user?.name);
      }
    },
    handleStorageChange(e) {
      if (e.key === 'isLoggedIn') {
        this.checkLoginStatus();
      }
    }
  },
  mounted() {
    this.checkLoginStatus();
    // Login durumu değişikliklerini dinle
    window.addEventListener('storage', this.handleStorageChange);
    window.addEventListener('loginStatusChanged', this.checkLoginStatus);
    
    // Sayfa yüklendiğinde de kontrol et
    window.addEventListener('load', this.checkLoginStatus);
  },
  beforeUnmount() {
    window.removeEventListener('storage', this.handleStorageChange);
    window.removeEventListener('loginStatusChanged', this.checkLoginStatus);
    window.removeEventListener('load', this.checkLoginStatus);
  },
}
</script>

<style scoped>
.navbar {
  background: #1a1a2e;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.navbar-logo {
  width: 40px;
  height: 40px;
}

.navbar-title {
  color: #64b5f6;
  font-size: 1.5rem;
  font-weight: bold;
}

.navbar-link {
  color: #ffffff;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.navbar-link:hover {
  color: #64b5f6;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.navbar-username {
  color: #ffffff;
  font-weight: 500;
}

.navbar-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 5px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.navbar-btn.login {
  background: #64b5f6;
  color: #ffffff;
}

.navbar-btn.login:hover {
  background: #42a5f5;
}

.navbar-btn.register {
  background: #1a1a2e;
  color: #ffffff;
  border: 2px solid #64b5f6;
}

.navbar-btn.register:hover {
  background: #64b5f6;
}

.navbar-btn.logout {
  background: #e63946;
  color: #ffffff;
}

.navbar-btn.logout:hover {
  background: #d32f2f;
}

.navbar-hamburger {
  display: none;
  flex-direction: column;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}

.navbar-hamburger span {
  width: 25px;
  height: 3px;
  background: #ffffff;
  margin: 3px 0;
  transition: 0.3s;
}

.navbar-mobile-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a2e;
  padding: 1rem;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .navbar {
    padding: 1rem;
  }
  
  .navbar-left {
    gap: 1rem;
  }
  
  .navbar-link {
    display: none;
  }
  
  .navbar-hamburger {
    display: flex;
  }
  
  .navbar-mobile-menu {
    display: flex;
  }
}
</style> 