
<template>
<div>
    <div v-if="loading">Загрузка...</div>
    <div v-else-if="error" class="error">Ошибка: {{ error }}</div>
    <div v-else>
    <div v-if="filtered.length === 0" class="empty">
        Пользователи не найдены.
    </div>
    <ul>
        <li v-for="user in filtered" :key="user.id">
        <UserItem :user="user" />
        </li>
    </ul>
    </div>
</div>
</template>

<script setup>
    const props = defineProps({ user: { type: Object, required: true } });
</script>



