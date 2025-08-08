<template>
  <div class="login-container">
    <h2>Giriş Yap</h2>
    <form @submit.prevent="login" class="login-form">
      <div class="form-group">
        <label for="email">E-posta:</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          placeholder="E-posta adresinizi girin"
        />
      </div>
      <div class="form-group">
        <label for="password">Şifre:</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          placeholder="Şifrenizi girin"
        />
      </div>
      <button type="submit" class="login-btn">Giriş Yap</button>
    </form>
    <p class="register-link">
      Hesabınız yok mu? <router-link to="/register">Kayıt Ol</router-link>
    </p>
  </div>
</template>

<script>
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default {
  name: 'LoginPage',
  data() {
    return {
      email: '',
      password: ''
    };
  },
  methods: {
    async login() {
      try {
        // Firestore'dan kullanıcıyı kontrol et
        const userRef = doc(db, 'users', this.email);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          alert('Bu e-posta adresi kayıtlı değil!');
          return;
        }

        const userData = userSnap.data();
        
        if (userData.password !== this.password) {
          alert('Şifre yanlış!');
          return;
        }

        // Giriş başarılı - localStorage'a kaydet
        const user = {
          name: userData.name,
          email: userData.email,
          password: userData.password
        };
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');

        // Navbar'ın güncellenmesi için custom event tetikle
        window.dispatchEvent(new CustomEvent('loginStatusChanged'));

        // Sayfa kapatıldığında oturumu kapat
        window.addEventListener('beforeunload', this.logoutOnClose);

        // Anasayfaya yönlendir
        this.$router.push('/');
        
        console.log('Kullanıcı başarıyla giriş yaptı:', this.email);
      } catch (error) {
        console.error('Giriş hatası:', error);
        alert('Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
    },
    logoutOnClose() {
      localStorage.removeItem('isLoggedIn');
    }
  }
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 48px auto;
  padding: 32px;
  background: #23233a;
  border-radius: 18px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.4);
  color: #f4f4f4;
}

.login-container h2 {
  text-align: center;
  color: #4cc9f0;
  margin-bottom: 24px;
  font-size: 1.8rem;
  font-weight: 600;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #f4f4f4;
  font-size: 0.95rem;
}

.form-group input {
  padding: 12px 16px;
  border: 1.5px solid #2c2c3a;
  border-radius: 12px;
  background: #2c2c3a;
  color: #f4f4f4;
  font-size: 1rem;
  transition: border-color 0.18s;
  outline: none;
}

.form-group input:focus {
  border-color: #4cc9f0;
}

.form-group input::placeholder {
  color: #f4f4f4;
  opacity: 0.6;
}

.login-btn {
  background: #4cc9f0;
  color: #14141f;
  border: none;
  padding: 14px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s;
  margin-top: 8px;
}

.login-btn:hover {
  background: #3db8df;
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: #f4f4f4;
  font-size: 0.95rem;
}

.register-link a {
  color: #4cc9f0;
  text-decoration: none;
  font-weight: 500;
}

.register-link a:hover {
  text-decoration: underline;
}
</style> 