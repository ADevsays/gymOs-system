<template>
  <div class="animate-reveal relative w-full shrink-0 min-h-[150px] md:min-h-[160px] 2xl:min-h-[220px] rounded-[24px] md:rounded-[32px] overflow-hidden p-4 md:p-5 2xl:p-8 flex flex-col justify-between shadow-sm border border-border">
    <!-- Hero Background Image -->
    <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
    
    <!-- Theme color overlay with diagonal cut -->
    <div class="absolute inset-0 bg-linear-to-br from-accent/80 from-10% via-accent/12 via-50% to-accent/12"></div>

    <!-- Noise -->
    <div class="absolute inset-0 bg-noise opacity-20 mix-blend-overlay"></div>
    
    <div class="relative z-10 flex justify-between items-start text-white">
      <div>
        <h1 class="text-2xl md:text-3xl 2xl:text-5xl font-display font-bold mb-1 drop-shadow-md">Gym AGOD</h1>
        <div class="flex items-center gap-2 md:gap-3 opacity-90 text-xs md:text-sm 2xl:text-base font-medium">
          <span>Panel de Control</span>
          <span class="w-1.5 h-1.5 rounded-full bg-white/80"></span>
          <span class="flex items-center gap-1">
            <Users class="w-4 h-4" />
            {{ totalMembers }} miembros
          </span>
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <img src="/img/logo-agod.png" alt="Gym AGOD" class="w-10 h-10 md:w-12 md:h-12 2xl:w-16 2xl:h-16 object-cover rounded-full drop-shadow-xl border-2 border-white/20 bg-black/20" />
      </div>
    </div>
    
    <div class="relative z-10 flex items-center gap-4">
      <div class="flex -space-x-4" v-if="totalMembers > 0">
        <div v-for="i in Math.min(totalMembers, 3)" :key="i" class="w-7 h-7 md:w-8 md:h-8 2xl:w-10 2xl:h-10 rounded-full border-2 border-white/30 bg-white/20 backdrop-blur-sm overflow-hidden flex justify-center items-center shadow-lg">
          <User class="w-3.5 h-3.5 md:w-4 md:h-4 2xl:w-5 2xl:h-5 text-white opacity-90" />
        </div>
        <div v-if="totalMembers > 3" class="w-7 h-7 md:w-8 md:h-8 2xl:w-10 2xl:h-10 rounded-full border-2 border-white/30 bg-surface text-text flex items-center justify-center font-bold text-[9px] md:text-[10px] 2xl:text-xs z-10 shadow-lg">
          +{{ totalMembers - 3 }}
        </div>
      </div>
      <div v-else class="text-white/90 text-sm font-medium flex items-center gap-2">
        <UserPlus class="w-5 h-5" />
        Registra tu primer miembro para empezar
      </div>
    </div>

    <!-- Angled decoration -->
    <div class="absolute right-0 bottom-0 w-1/2 h-[120%] bg-linear-to-t from-black/30 to-transparent skew-x-[-20deg] translate-x-10 pointer-events-none"></div>
  </div>
</template>

<script setup lang="ts">
import { Users, User, UserPlus } from 'lucide-vue-next';

defineProps<{
  totalMembers: number;
}>();
</script>

<style scoped lang="postcss">
@reference "~/assets/css/main.css";
</style>
