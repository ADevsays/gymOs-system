import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

export const useCommandPalette = () => {
  const router = useRouter();

  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      e.stopPropagation();

      router.push({ path: '/members', query: { focus: '1' } });

      const tryFocus = (attempts = 0) => {
        const input = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        } else if (attempts < 15) {
          setTimeout(() => tryFocus(attempts + 1), 40);
        }
      };
      tryFocus();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown, true);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown, true);
  });

  return {
    isOpen: ref(false),
    toggle: () => {},
    close: () => {},
    open: () => {}
  };
};
