<script setup lang="ts">
import { UButton } from '@nuxt/ui'

const greet = () => {
  alert('Hello!')
}
</script>

<template>
  <div class="home">
    <UContainer>
      <h1>Mileage Tracker</h1>
      <p>Welcome to the mileage tracker.</p>
      <UButton label="Get Started" />
    </UContainer>
  </div>
</template>
