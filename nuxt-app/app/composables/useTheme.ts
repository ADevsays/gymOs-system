import { ref, onMounted, watch } from 'vue';

export function useTheme() {
  const isDark = ref(false);

  const toggleTheme = () => {
    isDark.value = !isDark.value;
  };

  onMounted(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('gymos-theme');
    if (savedTheme) {
      isDark.value = savedTheme === 'dark';
    } else {
      // Fallback to system preference
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Apply the initial class if it's true (to avoid FOUC wait)
    if (isDark.value) {
      document.documentElement.classList.add('dark');
    }
  });

  watch(isDark, (val) => {
    // Disable transitions globally before changing theme
    const css = document.createElement('style')
    css.appendChild(
      document.createTextNode(
        `* {
       -webkit-transition: none !important;
       -moz-transition: none !important;
       -o-transition: none !important;
       -ms-transition: none !important;
       transition: none !important;
    }`
      )
    )
    document.head.appendChild(css)

    if (val) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gymos-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('gymos-theme', 'light');
    }

    // Force repaint to apply the theme without transitions, then restore
    const _ = window.getComputedStyle(css).opacity
    document.head.removeChild(css)
  });

  return {
    isDark,
    toggleTheme
  };
}
