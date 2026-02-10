<template>
  <section class="auth-section">
    <div class="auth-card">
      <div class="auth-tabs">
        <button
          class="tab"
          :class="{ active: authMode === 'login' }"
          type="button"
          @click="emit('switchMode', 'login')"
        >
          Вход
        </button>
        <button
          class="tab"
          :class="{ active: authMode === 'register' }"
          type="button"
          @click="emit('switchMode', 'register')"
        >
          Регистрация
        </button>
      </div>

      <form v-if="authMode === 'login'" class="auth-form" @submit.prevent="emit('login')">
        <label>
          Логин
          <input v-model="loginForm.username" placeholder="scrum.master" />
        </label>
        <label>
          Пароль
          <div class="password-field">
            <input
              v-model="loginForm.password"
              :type="showLoginPassword ? 'text' : 'password'"
              placeholder="••••••"
            />
            <button
              type="button"
              class="eye-btn"
              :aria-label="showLoginPassword ? 'Скрыть пароль' : 'Показать пароль'"
              @click="emit('toggleLoginPassword')"
            >
              {{ showLoginPassword ? '🙈' : '👁️' }}
            </button>
          </div>
        </label>
        <button class="primary" type="submit">Войти</button>
        <p v-if="authError" class="error">{{ authError }}</p>
        <p v-if="infoMessage" class="info">{{ infoMessage }}</p>
      </form>

      <form v-else class="auth-form" @submit.prevent="emit('register')">
        <label>
          Логин
          <input v-model="registerForm.username" placeholder="product.owner" />
        </label>
        <label>
          Пароль
          <input v-model="registerForm.password" type="password" placeholder="минимум 6 символов" />
        </label>
        <label>
          Роль
          <select v-model="registerForm.role">
            <option value="admin">Администратор</option>
            <option value="team-lead">Тим лид</option>
            <option value="backend-developer">Бэк разработчик</option>
            <option value="frontend-developer">Фронт разработчик</option>
            <option value="designer">Дизайнер</option>
          </select>
        </label>
        <button class="primary" type="submit">Создать аккаунт</button>
        <p v-if="registerError" class="error">{{ registerError }}</p>
      </form>
    </div>
  </section>
</template>

<script setup>
defineProps({
  authMode: {
    type: String,
    default: 'login',
  },
  loginForm: {
    type: Object,
    required: true,
  },
  registerForm: {
    type: Object,
    required: true,
  },
  showLoginPassword: {
    type: Boolean,
    default: false,
  },
  authError: {
    type: String,
    default: '',
  },
  registerError: {
    type: String,
    default: '',
  },
  infoMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['switchMode', 'login', 'register', 'toggleLoginPassword'])
</script>
