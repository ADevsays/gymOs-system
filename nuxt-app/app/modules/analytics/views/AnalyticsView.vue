<template>
  <div class="w-full flex flex-col pb-12">
    <!-- Top Header -->
    <header class="px-6 lg:px-8 py-5 lg:py-6 border-b border-border/30 flex items-center justify-between gap-4 shrink-0">
      <div class="pt-1.5 md:pt-2">
        <h1 class="font-display font-bold text-2xl tracking-wide uppercase text-text">
          Métricas y Análisis
        </h1>
      </div>
    </header>

    <!-- Sub-Navigation Tabs -->
    <div class="px-6 lg:px-8 border-b border-border/20 flex gap-2 pt-3 overflow-x-auto">
      <button 
        v-for="t in tabs" 
        :key="t.id"
        @click="activeTab = t.id"
        :class="[
          'pb-3 px-3 text-xs lg:text-sm font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0',
          activeTab === t.id 
            ? 'border-accent text-text font-bold' 
            : 'border-transparent text-muted hover:text-text'
        ]"
      >
        <component :is="t.icon" class="w-4 h-4" />
        <span>{{ t.label }}</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !data" class="flex-1 flex items-center justify-center py-24">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mx-6 lg:mx-8 my-6 p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-sm">
      {{ error }}
    </div>

    <!-- Content Sections -->
    <div v-else-if="data" class="px-6 lg:px-8 py-6 flex flex-col gap-8 animate-reveal">
      
      <!-- 1. ASISTENCIA SECTION -->
      <section v-if="activeTab === 'attendance'" class="flex flex-col gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UserCheck class="w-5 h-5 text-accent" />
            <h2 class="text-lg font-display font-bold text-text uppercase">Tendencia de Asistencia</h2>
          </div>

          <!-- Attendance Local Controls & Period Switcher -->
          <div class="flex items-center flex-wrap gap-2.5">
            <div class="flex items-center bg-surface-2 border border-border p-1 rounded-xl shadow-xs">
              <button 
                v-for="p in periods" 
                :key="p.value"
                @click="attendancePeriod = p.value"
                :class="[
                  'px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                  attendancePeriod === p.value 
                    ? 'bg-surface text-text shadow-xs border border-border/80' 
                    : 'text-muted hover:text-text'
                ]"
              >
                {{ p.label }}
              </button>
            </div>

            <button
              type="button"
              @click="handleDeleteLatest"
              :disabled="deletingAttendance || !data?.attendance?.totalVisits"
              class="bg-surface-2 border border-border text-muted hover:text-danger hover:border-danger/50 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider py-2 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40 shrink-0"
              title="Eliminar el último registro de asistencia"
            >
              <RotateCcw v-if="!deletingAttendance" class="w-3.5 h-3.5" />
              <span v-else class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-danger"></span>
              <span>Deshacer Última</span>
            </button>

            <button
              type="button"
              @click="recordQuickAttendance"
              :disabled="recordingAttendance"
              class="bg-accent text-white hover:bg-accent-soft active:scale-95 transition-all text-xs font-bold uppercase tracking-wider py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 shrink-0"
            >
              <span v-if="recordingAttendance" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
              <Plus v-else class="w-4 h-4" />
              <span>Agregar Asistencia</span>
            </button>
          </div>
        </div>

        <!-- Attendance KPIs (GymOS Pattern) -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-accent shrink-0">
              <UserCheck class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Total Asistencias</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-text">{{ data.attendance.totalVisits }}</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-accent shrink-0">
              <Activity class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Promedio Diario</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-accent">{{ data.attendance.averagePerDay }}</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-success shrink-0">
              <Users class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Asistencias Hoy</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-success">{{ data.attendance.todayCount }}</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text shrink-0">
              <Calendar class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Día Pico</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-text">{{ data.attendance.peakDay?.count || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Attendance Main Line Chart -->
        <div class="bg-surface border border-border rounded-2xl p-5 lg:p-6 shadow-xs flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <span class="text-xs font-bold text-text uppercase tracking-wider">Fluctuación de Asistencia Diaria</span>
            <span class="text-xs text-muted font-mono">{{ attendancePeriodLabel }}</span>
          </div>
          <div class="h-64 sm:h-80 w-full">
            <Line :data="attendanceChartData" :options="attendanceChartOptions" />
          </div>
        </div>

        <!-- Attendance History & Delete Controls -->
        <div class="bg-surface border border-border rounded-2xl p-5 lg:p-6 shadow-xs flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-text uppercase">Registro Reciente de Asistencias</h3>
            <span class="text-xs text-muted font-mono">{{ attendanceHistory.length }} recientes</span>
          </div>

          <div v-if="attendanceHistory.length === 0" class="py-8 text-center text-xs text-muted">
            No hay asistencias registradas recientemente.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-surface-2 text-muted uppercase font-bold text-xs tracking-wider border-b border-border">
                <tr>
                  <th class="py-3 px-4">Fecha y Hora</th>
                  <th class="py-3 px-4">Socio / Identificación</th>
                  <th class="py-3 px-4">Tipo</th>
                  <th class="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/40 text-xs lg:text-sm">
                <tr v-for="att in attendanceHistory" :key="att.id" class="hover:bg-surface-2/40 transition-colors">
                  <td class="py-3 px-4 font-mono text-text">
                    {{ formatDateTime(att.checkInAt || att.createdAt) }}
                  </td>
                  <td class="py-3 px-4">
                    <span v-if="att.memberFirstName" class="font-medium text-text">
                      {{ att.memberFirstName }} {{ att.memberLastName }}
                      <span class="text-xs text-muted font-mono block">{{ att.memberCedula }}</span>
                    </span>
                    <span v-else class="text-muted italic">
                      Ingreso General / Manual
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="bg-surface-2 border border-border px-2.5 py-0.5 rounded-md text-[11px] font-medium text-text uppercase">
                      Check-in
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <button
                      type="button"
                      @click="deleteAttendanceById(att.id)"
                      class="text-muted hover:text-danger p-1.5 rounded-lg hover:bg-danger/10 transition-colors cursor-pointer"
                      title="Eliminar esta asistencia"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 2. CANCELACIONES Y RENOVACIONES SECTION -->
      <section v-if="activeTab === 'churn'" class="flex flex-col gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UserX class="w-5 h-5 text-danger" />
            <h2 class="text-lg font-display font-bold text-text uppercase">Cancelaciones y Renovaciones</h2>
          </div>

          <!-- Churn Local Period Switcher -->
          <div class="flex items-center bg-surface-2 border border-border p-1 rounded-xl shadow-xs">
            <button 
              v-for="p in periods" 
              :key="p.value"
              @click="churnPeriod = p.value"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                churnPeriod === p.value 
                  ? 'bg-surface text-text shadow-xs border border-border/80' 
                  : 'text-muted hover:text-text'
              ]"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- Churn KPIs (GymOS Pattern) -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-danger shrink-0">
              <UserX class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Tasa Deserción</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-danger">{{ data.churn.rate }}%</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-danger shrink-0">
              <UserMinus class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Cancelaciones</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-danger">{{ data.churn.totalChurned }}</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-success shrink-0">
              <UserCheck class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Renovaciones</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-success">{{ data.churn.totalRenewals }}</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text shrink-0">
              <Users class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Miembros Activos</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-text">{{ data.churn.totalActive }}</span>
            </div>
          </div>
        </div>

        <!-- INTERACTIVE GRAPH WITH TWO INDEPENDENT CURVES (RED FOR CANCELLATIONS, GREEN FOR RENEWALS) AND COMPACT AVATARS -->
        <div class="bg-surface border border-border rounded-2xl p-5 lg:p-6 shadow-xs flex flex-col">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div class="flex items-center gap-4">
              <!-- Visual Legend -->
              <div class="flex items-center gap-3 text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-danger"></span>
                  <span class="font-bold text-text uppercase tracking-wider text-[11px]">Cancelaciones</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-success"></span>
                  <span class="font-bold text-text uppercase tracking-wider text-[11px]">Renovaciones</span>
                </div>
              </div>
            </div>

            <!-- Filter view -->
            <div class="flex items-center gap-1.5 bg-surface-2 p-1 rounded-xl border border-border self-start sm:self-auto">
              <button
                v-for="f in eventFilters"
                :key="f.value"
                @click="selectedEventFilter = f.value"
                :class="[
                  'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer uppercase tracking-wider',
                  selectedEventFilter === f.value
                    ? 'bg-surface text-text shadow-xs border border-border/80'
                    : 'text-muted hover:text-text'
                ]"
              >
                {{ f.label }} ({{ f.count(data.churn.events) }})
              </button>
            </div>
          </div>

          <!-- Dual-Curve Interactive Canvas -->
          <div class="relative w-full h-72 sm:h-96 pt-6 pb-8">
            <!-- Background Grid Lines -->
            <div class="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div class="border-b border-border w-full"></div>
              <div class="border-b border-border w-full"></div>
              <div class="border-b border-border w-full"></div>
              <div class="border-b border-border w-full"></div>
            </div>

            <!-- SVG Curves -->
            <svg class="w-full h-full overflow-visible pointer-events-none" viewBox="0 0 1000 300" preserveAspectRatio="none">
              <defs>
                <linearGradient id="cancelCurveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#EF4444" stop-opacity="0.18" />
                  <stop offset="100%" stop-color="#EF4444" stop-opacity="0.0" />
                </linearGradient>
                <linearGradient id="renewCurveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#10B981" stop-opacity="0.18" />
                  <stop offset="100%" stop-color="#10B981" stop-opacity="0.0" />
                </linearGradient>
              </defs>

              <!-- Cancellations Area & Line (Red) -->
              <g v-if="selectedEventFilter === 'all' || selectedEventFilter === 'cancellation'">
                <path v-if="cancelSvgAreaPath" :d="cancelSvgAreaPath" fill="url(#cancelCurveGrad)" />
                <path v-if="cancelSvgLinePath" :d="cancelSvgLinePath" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </g>

              <!-- Renewals Area & Line (Green) -->
              <g v-if="selectedEventFilter === 'all' || selectedEventFilter === 'renewal'">
                <path v-if="renewalSvgAreaPath" :d="renewalSvgAreaPath" fill="url(#renewCurveGrad)" />
                <path v-if="renewalSvgLinePath" :d="renewalSvgLinePath" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </g>
            </svg>

            <!-- Embedded Compact Profile Avatars Positioned Directly on Curves -->
            <template v-for="point in dualChartPoints" :key="point.date">
              <!-- 1. Cancellations Avatars on Red Curve -->
              <div 
                v-if="(selectedEventFilter === 'all' || selectedEventFilter === 'cancellation') && point.cancellationEvents.length > 0"
                class="absolute transition-all duration-300 pointer-events-auto"
                :style="{ left: point.xPercent + '%', top: point.yPercentCancel + '%' }"
              >
                <div class="flex items-center -space-x-2.5 hover:space-x-1.5 transition-all duration-200 transform -translate-x-1/2 -translate-y-1/2 z-15 hover:z-40">
                  <NuxtLink
                    v-for="ev in point.cancellationEvents"
                    :key="'c-' + ev.memberId"
                    :to="'/members?id=' + ev.memberId"
                    class="relative group/avatar block transition-transform duration-150 hover:scale-125 hover:z-50 cursor-pointer"
                    :title="'Cancelación: ' + ev.name"
                  >
                    <div class="w-8 h-8 rounded-full overflow-hidden border-2 border-danger ring-2 ring-danger/30 flex items-center justify-center font-bold text-[11px] shadow-md bg-surface text-danger">
                      <img v-if="ev.photoPath" :src="ev.photoPath" :alt="ev.name" class="w-full h-full object-cover" />
                      <span v-else class="font-display font-bold">{{ getInitials(ev.name) }}</span>
                    </div>

                    <!-- Mini dot -->
                    <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white bg-danger border border-surface shadow-xs">✕</span>

                    <!-- Tooltip -->
                    <div class="opacity-0 group-hover/avatar:opacity-100 pointer-events-none group-hover/avatar:pointer-events-auto transition-all duration-150 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border shadow-xl rounded-xl p-2.5 text-xs whitespace-nowrap min-w-[160px]">
                      <div class="font-display font-bold text-text uppercase text-xs">{{ ev.name }}</div>
                      <div class="text-[10px] text-muted font-mono mt-0.5">Cédula: {{ ev.cedula }}</div>
                      <div class="text-[10px] text-muted truncate mt-0.5">Plan: {{ ev.planName }}</div>
                      <div class="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-border/40">
                        <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded font-mono bg-danger/15 text-danger">No Renovó</span>
                        <span class="text-[10px] text-muted font-mono">{{ ev.eventDate }}</span>
                      </div>
                      <div class="text-[9px] text-accent font-bold mt-1 uppercase tracking-wider">Ver perfil →</div>
                    </div>
                  </NuxtLink>
                </div>
              </div>

              <!-- 2. Renewals Avatars on Green Curve -->
              <div 
                v-if="(selectedEventFilter === 'all' || selectedEventFilter === 'renewal') && point.renewalEvents.length > 0"
                class="absolute transition-all duration-300 pointer-events-auto"
                :style="{ left: point.xPercent + '%', top: point.yPercentRenewal + '%' }"
              >
                <div class="flex items-center -space-x-2.5 hover:space-x-1.5 transition-all duration-200 transform -translate-x-1/2 -translate-y-1/2 z-20 hover:z-40">
                  <NuxtLink
                    v-for="ev in point.renewalEvents"
                    :key="'r-' + ev.memberId"
                    :to="'/members?id=' + ev.memberId"
                    class="relative group/avatar block transition-transform duration-150 hover:scale-125 hover:z-50 cursor-pointer"
                    :title="'Renovación: ' + ev.name"
                  >
                    <div class="w-8 h-8 rounded-full overflow-hidden border-2 border-success ring-2 ring-success/30 flex items-center justify-center font-bold text-[11px] shadow-md bg-surface text-success">
                      <img v-if="ev.photoPath" :src="ev.photoPath" :alt="ev.name" class="w-full h-full object-cover" />
                      <span v-else class="font-display font-bold">{{ getInitials(ev.name) }}</span>
                    </div>

                    <!-- Mini dot -->
                    <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white bg-success border border-surface shadow-xs">✓</span>

                    <!-- Tooltip -->
                    <div class="opacity-0 group-hover/avatar:opacity-100 pointer-events-none group-hover/avatar:pointer-events-auto transition-all duration-150 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border shadow-xl rounded-xl p-2.5 text-xs whitespace-nowrap min-w-[160px]">
                      <div class="font-display font-bold text-text uppercase text-xs">{{ ev.name }}</div>
                      <div class="text-[10px] text-muted font-mono mt-0.5">Cédula: {{ ev.cedula }}</div>
                      <div class="text-[10px] text-muted truncate mt-0.5">Plan: {{ ev.planName }}</div>
                      <div class="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-border/40">
                        <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded font-mono bg-success/15 text-success">Renovación</span>
                        <span class="text-[10px] text-muted font-mono">{{ ev.eventDate }}</span>
                      </div>
                      <div class="text-[9px] text-accent font-bold mt-1 uppercase tracking-wider">Ver perfil →</div>
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </template>

            <!-- X-Axis Labels Along Bottom -->
            <div class="absolute bottom-0 inset-x-0 flex justify-between text-[10px] font-mono text-muted px-2 pt-2 border-t border-border/20 pointer-events-none">
              <span v-for="(lbl, idx) in chartTimelineLabels" :key="idx">{{ lbl }}</span>
            </div>
          </div>
        </div>

        <!-- 3. ACTION TABLE: RECENT EXPIRED MEMBERS TO RECOVER (GymOS Design) -->
        <div v-if="data.churn.recentExpired.length > 0" class="bg-surface border border-border rounded-2xl p-5 lg:p-6 shadow-xs flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-text uppercase">Socios a Recuperar (Recién Vencidos)</h3>
            <NuxtLink to="/members" class="text-xs text-accent hover:underline font-bold uppercase">
              Ver todos en directorio →
            </NuxtLink>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-surface-2 text-muted uppercase font-bold text-xs tracking-wider border-b border-border">
                <tr>
                  <th class="py-3 px-4">Miembro</th>
                  <th class="py-3 px-4">Cédula</th>
                  <th class="py-3 px-4">Último Plan</th>
                  <th class="py-3 px-4">Vencimiento</th>
                  <th class="py-3 px-4">Días Vencido</th>
                  <th class="py-3 px-4 text-right">Contacto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/40 text-xs lg:text-sm">
                <tr v-for="m in data.churn.recentExpired" :key="m.id" class="hover:bg-surface-2/40 transition-colors group">
                  <td class="py-3 px-4 flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl overflow-hidden bg-surface-2 border border-border flex items-center justify-center shrink-0">
                      <span class="font-display font-bold text-xs text-text">{{ getInitials(m.name) }}</span>
                    </div>
                    <div class="min-w-0">
                      <NuxtLink :to="'/members?id=' + m.id" class="font-medium text-text text-sm hover:text-accent transition-colors truncate block">
                        {{ m.name }}
                      </NuxtLink>
                    </div>
                  </td>
                  <td class="py-3 px-4 font-mono text-xs lg:text-sm text-text">{{ m.cedula }}</td>
                  <td class="py-3 px-4">
                    <span class="bg-surface-2 border border-border px-2.5 py-1 rounded-md text-xs font-medium text-text">
                      {{ m.planName }}
                    </span>
                  </td>
                  <td class="py-3 px-4 font-mono text-xs lg:text-sm text-muted">{{ m.endDate }}</td>
                  <td class="py-3 px-4">
                    <span class="px-2.5 py-1 rounded-md bg-danger/10 text-danger border border-danger/20 font-bold text-xs font-mono">
                      hace {{ m.daysExpired }} días
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <a 
                      v-if="m.phone" 
                      :href="`https://wa.me/57${m.phone.replace(/\\D/g, '')}`" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 text-success hover:underline font-bold font-mono text-xs"
                    >
                      <Phone class="w-3.5 h-3.5" />
                      <span>{{ m.phone }}</span>
                    </a>
                    <span v-else class="text-muted/60 italic text-xs">Sin teléfono</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 3. BALANCE FINANCIERO Y CARTERA ACTIVA SECTION -->
      <section v-if="activeTab === 'revenue'" class="flex flex-col gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-success" />
            <h2 class="text-lg font-display font-bold text-text uppercase">Flujo Financiero y Cartera Activa</h2>
          </div>

          <!-- Revenue Local Period Switcher -->
          <div class="flex items-center bg-surface-2 border border-border p-1 rounded-xl shadow-xs">
            <button 
              v-for="p in periods" 
              :key="p.value"
              @click="revenuePeriod = p.value"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                revenuePeriod === p.value 
                  ? 'bg-surface text-text shadow-xs border border-border/80' 
                  : 'text-muted hover:text-text'
              ]"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- Revenue & Active Subscriptions KPIs (Context-Aware to Portfolio vs Cash) -->
        <!-- A. Portfolio View Mode KPIs -->
        <div v-if="financialViewMode === 'portfolio'" class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div class="bg-surface border border-accent/40 bg-accent/5 rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-accent/30 flex items-center justify-center text-accent shrink-0">
              <CreditCard class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-accent uppercase">Cartera Activa (MRR)</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-accent">${{ formatCurrency(data.revenue.activeSubscriptionsTotal) }}</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-success shrink-0">
              <TrendingUp class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Vs Mes Anterior</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-success">
                {{ data.revenue.growthPercent !== null ? (data.revenue.growthPercent >= 0 ? '▲ +' : '▼ ') + data.revenue.growthPercent + '%' : 'Base' }}
              </span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text shrink-0">
              <Users class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Socios en Cartera</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-text">{{ data.revenue.activeSubscriptionsCount }}</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text shrink-0">
              <DollarSign class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Ticket Promedio</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-text">${{ formatCurrency(data.revenue.averageTicket) }}</span>
            </div>
          </div>
        </div>

        <!-- B. Cash View Mode KPIs -->
        <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-success shrink-0">
              <ArrowDownLeft class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Total Ingresos</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-success">${{ formatCurrency(data.revenue.totalIncome) }}</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-danger shrink-0">
              <ArrowUpRight class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Total Egresos</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-danger">${{ formatCurrency(data.revenue.totalExpenses) }}</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text shrink-0">
              <DollarSign class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Balance en Caja</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-text">${{ formatCurrency(data.revenue.netBalance) }}</span>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text shrink-0">
              <Activity class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="block truncate leading-none tracking-wider text-[11px] font-bold text-muted uppercase">Movimientos</span>
              <span class="font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate text-text">{{ data.revenue.movementsCount }}</span>
            </div>
          </div>
        </div>

        <!-- Dual Financial Chart: Cartera Activa (MRR) vs Flujo Diario de Caja -->
        <div class="bg-surface border border-border rounded-2xl p-5 lg:p-6 shadow-xs flex flex-col">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <span class="text-xs font-bold text-text uppercase tracking-wider">
                {{ financialViewMode === 'portfolio' ? 'Evolución Histórica de Cartera Activa (MRR)' : 'Flujo Diario de Ingresos y Egresos en Caja' }}
              </span>
            </div>

            <!-- View Mode Switcher -->
            <div class="flex items-center gap-1.5 bg-surface-2 p-1 rounded-xl border border-border self-start sm:self-auto">
              <button
                type="button"
                @click="financialViewMode = 'portfolio'"
                :class="[
                  'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer uppercase tracking-wider',
                  financialViewMode === 'portfolio'
                    ? 'bg-surface text-accent shadow-xs border border-border/80'
                    : 'text-muted hover:text-text'
                ]"
              >
                Cartera Activa (MRR)
              </button>
              <button
                type="button"
                @click="financialViewMode = 'cash'"
                :class="[
                  'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer uppercase tracking-wider',
                  financialViewMode === 'cash'
                    ? 'bg-surface text-text shadow-xs border border-border/80'
                    : 'text-muted hover:text-text'
                ]"
              >
                Caja Diaria
              </button>
            </div>
          </div>

          <!-- Chart Display -->
          <div class="h-64 sm:h-80 w-full">
            <Line 
              v-if="financialViewMode === 'portfolio'" 
              :data="portfolioChartData" 
              :options="portfolioChartOptions" 
            />
            <Line 
              v-else 
              :data="revenueChartData" 
              :options="revenueChartOptions" 
            />
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { 
  UserCheck, 
  UserX, 
  UserMinus,
  TrendingUp, 
  CreditCard,
  RotateCcw, 
  Plus, 
  Trash2, 
  Phone, 
  Activity,
  Calendar,
  Users,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight 
} from 'lucide-vue-next';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useAnalytics, type AnalyticsTab, type MemberEvent } from '../composables/useAnalytics';
import type { AnalyticsPeriod } from '~~/server/services/analyticsService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const route = useRoute();
const { 
  selectedPeriod, 
  attendancePeriod,
  churnPeriod,
  revenuePeriod,
  activeTab, 
  loading, 
  recordingAttendance, 
  deletingAttendance,
  error, 
  data, 
  attendanceHistory, 
  fetchAnalytics, 
  fetchAttendanceHistory,
  recordQuickAttendance,
  deleteAttendanceById,
  deleteLatestAttendance,
} = useAnalytics();

if (route.query.tab && (route.query.tab === 'attendance' || route.query.tab === 'churn' || route.query.tab === 'revenue')) {
  activeTab.value = route.query.tab as AnalyticsTab;
}

const periods: { label: string; value: AnalyticsPeriod }[] = [
  { label: '7 Días', value: '7d' },
  { label: '30 Días', value: '30d' },
  { label: '90 Días', value: '90d' },
  { label: 'Histórico', value: 'all' },
];

const tabs: { id: AnalyticsTab; label: string; icon: any }[] = [
  { id: 'attendance', label: 'Asistencia', icon: UserCheck },
  { id: 'churn', label: 'Cancelaciones y Renovaciones', icon: UserX },
  { id: 'revenue', label: 'Flujo y Cartera', icon: TrendingUp },
];

const selectedEventFilter = ref<'all' | 'cancellation' | 'renewal'>('all');
const financialViewMode = ref<'portfolio' | 'cash'>('portfolio');

const eventFilters = [
  { 
    label: 'Todos', 
    value: 'all' as const, 
    count: (events: MemberEvent[] = []) => events.length 
  },
  { 
    label: 'Cancelaciones', 
    value: 'cancellation' as const, 
    count: (events: MemberEvent[] = []) => events.filter(e => e.eventType === 'cancellation').length 
  },
  { 
    label: 'Renovaciones', 
    value: 'renewal' as const, 
    count: (events: MemberEvent[] = []) => events.filter(e => e.eventType === 'renewal').length 
  },
];

const filteredMemberEvents = computed(() => {
  const events = data.value?.churn?.events || [];
  if (selectedEventFilter.value === 'all') return events;
  return events.filter(e => e.eventType === selectedEventFilter.value);
});

const attendancePeriodLabel = computed(() => {
  const match = periods.find(p => p.value === attendancePeriod.value);
  return match?.label || '30 Días';
});

const churnPeriodLabel = computed(() => {
  const match = periods.find(p => p.value === churnPeriod.value);
  return match?.label || '30 Días';
});

const revenuePeriodLabel = computed(() => {
  const match = periods.find(p => p.value === revenuePeriod.value);
  return match?.label || '30 Días';
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val);
};

const formatDateTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getInitials = (name: string) => {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const handleDeleteLatest = async () => {
  if (confirm('¿Deseas eliminar el último registro de asistencia?')) {
    await deleteLatestAttendance();
  }
};

const accentColor = ref('#E60000');
const dangerColor = ref('#EF4444');
const successColor = ref('#10B981');

onMounted(() => {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    const cssAccent = getComputedStyle(root).getPropertyValue('--color-accent').trim();
    if (cssAccent) accentColor.value = cssAccent;
    const cssDanger = getComputedStyle(root).getPropertyValue('--color-danger').trim();
    if (cssDanger) dangerColor.value = cssDanger;
    const cssSuccess = getComputedStyle(root).getPropertyValue('--color-success').trim();
    if (cssSuccess) successColor.value = cssSuccess;
  }
  fetchAttendanceHistory();
});

// Group filtered events by date and type
const eventsByDate = computed(() => {
  const cancelMap = new Map<string, MemberEvent[]>();
  const renewMap = new Map<string, MemberEvent[]>();
  const events = data.value?.churn?.events || [];
  for (const ev of events) {
    if (!ev.eventDate) continue;
    const dateKey = ev.eventDate.slice(0, 10);
    if (ev.eventType === 'cancellation') {
      const list = cancelMap.get(dateKey) || [];
      list.push(ev);
      cancelMap.set(dateKey, list);
    } else {
      const list = renewMap.get(dateKey) || [];
      list.push(ev);
      renewMap.set(dateKey, list);
    }
  }
  return { cancelMap, renewMap };
});

// Separate points for dual independent curves
const dualChartPoints = computed(() => {
  const timeline = data.value?.churn?.timeline || [];
  if (timeline.length === 0) return [];

  const maxCount = Math.max(
    ...timeline.map(t => {
      const c = t.cancellations ?? 0;
      const r = t.renewals ?? 0;
      return Math.max(c, r);
    }),
    1
  );
  const n = timeline.length;
  const { cancelMap, renewMap } = eventsByDate.value;

  return timeline.map((t, idx) => {
    const cancellations = t.cancellations ?? 0;
    const renewals = t.renewals ?? 0;
    const cancelEvs = cancelMap.get(t.date) || [];
    const renewEvs = renewMap.get(t.date) || [];

    const xPercent = n > 1 ? (idx / (n - 1)) * 96 + 2 : 50;
    // Independent Y coordinates mapped between 18% (top) and 82% (bottom)
    const yPercentCancel = 82 - (cancellations / maxCount) * 64;
    const yPercentRenewal = 82 - (renewals / maxCount) * 64;

    const svgX = n > 1 ? (idx / (n - 1)) * 960 + 20 : 500;
    const svgYCancel = 260 - (cancellations / maxCount) * 200;
    const svgYRenewal = 260 - (renewals / maxCount) * 200;

    return {
      date: t.date,
      label: t.label,
      cancellations,
      renewals,
      cancellationEvents: cancelEvs,
      renewalEvents: renewEvs,
      xPercent,
      yPercentCancel,
      yPercentRenewal,
      svgX,
      svgYCancel,
      svgYRenewal,
    };
  });
});

const chartTimelineLabels = computed(() => {
  const points = dualChartPoints.value;
  if (points.length <= 8) {
    return points.map(p => p.label);
  }
  const step = Math.ceil(points.length / 6);
  const labels: string[] = [];
  for (let i = 0; i < points.length; i += step) {
    labels.push(points[i].label);
  }
  if (labels[labels.length - 1] !== points[points.length - 1].label) {
    labels.push(points[points.length - 1].label);
  }
  return labels;
});

// SVG Smooth Curve Path for Cancellations (Red)
const cancelSvgLinePath = computed(() => {
  const points = dualChartPoints.value;
  if (points.length < 2) return '';

  let d = `M ${points[0].svgX} ${points[0].svgYCancel}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.svgX + (p1.svgX - p0.svgX) / 2;
    const cpY1 = p0.svgYCancel;
    const cpX2 = p0.svgX + (p1.svgX - p0.svgX) / 2;
    const cpY2 = p1.svgYCancel;
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.svgX} ${p1.svgYCancel}`;
  }
  return d;
});

const cancelSvgAreaPath = computed(() => {
  const line = cancelSvgLinePath.value;
  const points = dualChartPoints.value;
  if (!line || points.length < 2) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.svgX} 280 L ${first.svgX} 280 Z`;
});

// SVG Smooth Curve Path for Renewals (Green)
const renewalSvgLinePath = computed(() => {
  const points = dualChartPoints.value;
  if (points.length < 2) return '';

  let d = `M ${points[0].svgX} ${points[0].svgYRenewal}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.svgX + (p1.svgX - p0.svgX) / 2;
    const cpY1 = p0.svgYRenewal;
    const cpX2 = p0.svgX + (p1.svgX - p0.svgX) / 2;
    const cpY2 = p1.svgYRenewal;
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.svgX} ${p1.svgYRenewal}`;
  }
  return d;
});

const renewalSvgAreaPath = computed(() => {
  const line = renewalSvgLinePath.value;
  const points = dualChartPoints.value;
  if (!line || points.length < 2) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.svgX} 280 L ${first.svgX} 280 Z`;
});

// Attendance Chart Configuration
const attendanceChartData = computed(() => {
  const timeline = data.value?.attendance?.timeline || [];
  const color = accentColor.value;

  return {
    labels: timeline.map(t => t.label),
    datasets: [{
      label: 'Asistencias',
      data: timeline.map(t => t.count),
      borderColor: color,
      borderWidth: 2.5,
      pointBackgroundColor: color,
      pointRadius: timeline.length > 35 ? 0 : 3,
      pointHoverRadius: 5,
      tension: 0.35,
      fill: true,
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, `${color}40`);
        gradient.addColorStop(1, `${color}00`);
        return gradient;
      }
    }]
  };
});

const attendanceChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => `${context.parsed.y} asistencias`,
        title: (items: any[]) => {
          const idx = items[0]?.dataIndex;
          const t = data.value?.attendance?.timeline[idx];
          return t?.date || '';
        }
      }
    }
  },
  scales: {
    x: { grid: { display: false } },
    y: { min: 0, ticks: { precision: 0 } }
  }
};

// Revenue Chart Configuration (Daily Cash Movements)
const revenueChartData = computed(() => {
  const timeline = data.value?.revenue?.timeline || [];
  const sColor = successColor.value;
  const dColor = dangerColor.value;

  return {
    labels: timeline.map(t => t.label),
    datasets: [
      {
        label: 'Ingresos',
        data: timeline.map(t => t.income),
        borderColor: sColor,
        borderWidth: 2,
        pointBackgroundColor: sColor,
        pointRadius: timeline.length > 35 ? 0 : 2.5,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Egresos',
        data: timeline.map(t => t.expense),
        borderColor: dColor,
        borderWidth: 2,
        pointBackgroundColor: dColor,
        pointRadius: timeline.length > 35 ? 0 : 2.5,
        tension: 0.3,
        fill: false,
      }
    ]
  };
});

const revenueChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: true, position: 'top' as const },
    tooltip: {
      callbacks: {
        label: (context: any) => `${context.dataset.label}: $${new Intl.NumberFormat('es-CO').format(context.parsed.y)}`
      }
    }
  },
  scales: {
    x: { grid: { display: false } },
    y: { min: 0 }
  }
};

// Portfolio Historical Evolution Chart (MRR Progression)
const portfolioChartData = computed(() => {
  const list = data.value?.revenue?.portfolioTimeline || [];
  const color = accentColor.value;

  return {
    labels: list.map(item => item.label),
    datasets: [{
      label: 'Cartera Activa (MRR)',
      data: list.map(item => item.total),
      borderColor: color,
      borderWidth: 2.5,
      pointBackgroundColor: color,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.3,
      fill: true,
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, `${color}40`);
        gradient.addColorStop(1, `${color}00`);
        return gradient;
      }
    }]
  };
});

const portfolioChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const item = data.value?.revenue?.portfolioTimeline[context.dataIndex];
          const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(context.parsed.y);
          return `${formatted} (${item?.count || 0} socios activos)`;
        }
      }
    }
  },
  scales: {
    x: { grid: { display: false } },
    y: { 
      min: 0,
      ticks: {
        callback: (val: any) => `$${new Intl.NumberFormat('es-CO').format(val)}`
      }
    }
  }
};

await fetchAnalytics();
</script>

<style scoped>
@reference "~/assets/css/main.css";
</style>
