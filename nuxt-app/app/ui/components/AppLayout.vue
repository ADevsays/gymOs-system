<template>
  <div class="flex h-screen w-full bg-bg text-text overflow-hidden font-body bg-noise">
    <!-- Thin Icon Sidebar Navigation -->
    <SidebarNav />

    <!-- Secondary Context Sidebar -->
    <SecondarySidebar />

    <!-- Main Content Area: Consistent container across all views -->
    <main class="flex-1 min-w-0 flex flex-col overflow-y-auto">
      <slot />
    </main>

    <!-- Global Command Palette Hook (Ctrl+K) -->
    <CommandPalette />

    <!-- Global Auto Update Notification Banner -->
    <AppUpdateBanner />
  </div>
</template>

<script setup lang="ts">
import SidebarNav from '~/ui/components/SidebarNav.vue';
import SecondarySidebar from '~/ui/components/SecondarySidebar.vue';
import CommandPalette from '~/ui/components/CommandPalette.vue';
import AppUpdateBanner from '~/ui/components/AppUpdateBanner.vue';
import { useCommandPalette } from '~/composables/useCommandPalette';

useCommandPalette();
</script>
