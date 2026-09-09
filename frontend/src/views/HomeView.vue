<script setup lang="ts">
const greet = () => {
  alert('Hello!')
}
</script>

<template>
   <div class="home">
     <h1>Mileage Tracker</h1>
     <p>Welcome to the mileage tracker.</p>
     <button class="btn" @click="greet">Get Started</button>
   </div>
</template>

<style scoped>
.home {
  text-align: center;
}
</style>
