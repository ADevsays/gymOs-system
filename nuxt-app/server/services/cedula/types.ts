export interface CedulaResultData {
  cedula: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  bloodType: string;
  rawMrz?: string[];
  isReverseScan?: boolean;
}

export interface ParseCedulaResponse {
  success: boolean;
  data?: CedulaResultData;
  error?: string;
}
