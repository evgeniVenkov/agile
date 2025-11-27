<template>
    <div class="user-card">
        <h3>{{ user.name }}</h3>
        <p><strong>Email:</strong> {{ user.email }}</p>
        <p><strong>Город:</strong> {{ user.address?.city || "-" }}</p>
    </div>
</template>

<script setup>
    const props = defineProps({ user: { type: Object, required: true } });
</script>
