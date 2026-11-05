import { ref, computed, watch, provide, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useFetch } from '#app';

export const RegisterFormKey = Symbol('RegisterForm');

export function provideRegisterForm() {
  const router = useRouter();
  
  const form = ref({
    cedula: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'M' as 'M' | 'F',
    bloodType: '',
    phone: '',
    eps: '',
    notes: '',
  });

  const selectedPlanId = ref<number | null>(null);
  const paymentMethod = ref('cash');
  const customPrice = ref<number | null>(null);
  const customPriceReason = ref<string>('');
  const isCustomPriceMode = ref(false);
  const customStartDate = ref<string>('');
  const beneficiaries = ref<any[]>([]);
  const saving = ref(false);

  // Transfer receipt state
  const transferReceipt = ref<string | null>(null);
  const transferReceiptPreview = ref<string | null>(null);
  const transferReference = ref<string>('');

  function setTransferReceipt(file: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      transferReceipt.value = result;
      transferReceiptPreview.value = result;
    };
    reader.readAsDataURL(file);
  }

  function removeTransferReceipt() {
    transferReceipt.value = null;
    transferReceiptPreview.value = null;
  }

  const { data: plansData } = useFetch<any>('/api/plans');
  const plans = computed(() => plansData.value?.data || []);
  const selectedPlanObj = computed(() => plans.value.find((p: any) => p.id === selectedPlanId.value));

  watch(selectedPlanId, (newId) => {
    if (!newId) {
      beneficiaries.value = [];
      isCustomPriceMode.value = false;
      customPrice.value = null;
      customPriceReason.value = '';
      return;
    }
    const plan = selectedPlanObj.value;
    if (plan) {
      customPrice.value = plan.price;
      customPriceReason.value = '';
      isCustomPriceMode.value = false;
      
      if (plan.maxMembers > 1) {
        beneficiaries.value = Array.from({ length: plan.maxMembers - 1 }, () => ({
          cedula: '',
          lastSearchedCedula: '',
          firstName: '',
          lastName: '',
          loading: false,
          found: false,
          id: null
        }));
      } else {
        beneficiaries.value = [];
      }
    }
  });

  const isFormValid = computed(() =>
    !!form.value.cedula && !!form.value.firstName && !!form.value.lastName && selectedPlanId.value !== null
  );

  async function searchBeneficiary(index: number) {
    const b = beneficiaries.value[index];
    if (!b.cedula || b.cedula.length < 5 || b.cedula === b.lastSearchedCedula) return;
    
    b.lastSearchedCedula = b.cedula;
    b.loading = true;
    try {
      const res = await $fetch<any>(`/api/members/search?cedula=${b.cedula}`);
      if (res.success && res.data) {
        b.found = true;
        b.id = res.data.id;
        b.firstName = res.data.firstName;
        b.lastName = res.data.lastName;
      } else {
        b.found = false;
        b.id = null;
      }
    } catch (e) {
      b.found = false;
    } finally {
      b.loading = false;
    }
  }

  async function submit() {
    if (!isFormValid.value || saving.value) return;
    saving.value = true;
    try {
      const res = await $fetch<any>('/api/members', {
        method: 'POST',
        body: {
          cedula: form.value.cedula,
          firstName: form.value.firstName,
          lastName: form.value.lastName,
          birthDate: form.value.birthDate,
          gender: form.value.gender,
          bloodType: form.value.bloodType,
          phone: form.value.phone ? form.value.phone.replace(/\D/g, '') : null,
          eps: form.value.eps ? form.value.eps.trim() : null,
          notes: form.value.notes,
          planId: selectedPlanId.value,
          paymentMethod: paymentMethod.value,
          customPrice: customPrice.value,
          customPriceReason: customPriceReason.value,
          startDate: customStartDate.value || undefined,
          transferReceipt: paymentMethod.value === 'transfer' ? transferReceipt.value : null,
          transferReference: paymentMethod.value === 'transfer' ? transferReference.value : null,
          beneficiaries: beneficiaries.value.filter((b: any) => b.cedula && b.cedula.trim().length >= 5)
        }
      });

      if (res.success) {
        router.push(`/members?id=${res.memberId}`);
      } else if (res.error === 'MEMBER_EXISTS') {
        router.push(`/members?id=${res.memberId}`);
      } else {
        alert(`Error: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      saving.value = false;
    }
  }

  const state = {
    form,
    selectedPlanId,
    paymentMethod,
    customPrice,
    customPriceReason,
    isCustomPriceMode,
    customStartDate,
    beneficiaries,
    saving,
    plans,
    selectedPlanObj,
    isFormValid,
    transferReceipt,
    transferReceiptPreview,
    transferReference,
    setTransferReceipt,
    removeTransferReceipt,
    searchBeneficiary,
    submit
  };

  provide(RegisterFormKey, state);
  return state;
}

export function useRegisterForm() {
  const state = inject(RegisterFormKey);
  return state as ReturnType<typeof provideRegisterForm>;
}
