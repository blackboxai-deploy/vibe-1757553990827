// Utility functions for formatting and address lookup

// Format CPF: 000.000.000-00
export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return value;
};

// Format CNPJ: 00.000.000/0000-00
export const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
};

// Auto-detect and format CPF or CNPJ
export const formatCPFCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) {
    // Format as CPF
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (numbers.length <= 14) {
    // Format as CNPJ
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return value;
};

// Format RG: 00.000.000-0
export const formatRG = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 9) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
  }
  return value;
};

// Format phone: (00) 00000-0000
export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return value;
};

// Extract CEP from address
export const extractCEP = (address: string): string | null => {
  const cepRegex = /(\d{5})-?(\d{3})/;
  const match = address.match(cepRegex);
  return match ? `${match[1]}-${match[2]}` : null;
};

// Address lookup using ViaCEP API
export const lookupAddressByCEP = async (cep: string): Promise<{
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
} | null> => {
  try {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return null;
    
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      logradouro: data.logradouro,
      bairro: data.bairro,
      localidade: data.localidade,
      uf: data.uf
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

// Extract neighborhood from full address using common patterns
export const extractNeighborhood = (address: string): string => {
  // Common patterns for Brazilian addresses
  const patterns = [
    /bairro\s+([^,]+)/i,
    /,\s*([^,]+)\s*,\s*[^,]+\s*-\s*[A-Z]{2}/i, // ...bairro, cidade - UF
    /,\s*([^,]+)\s*$/i // Last part after comma
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '';
};

// Auto-complete address suggestion
export const suggestAddressCompletion = async (partialAddress: string): Promise<string> => {
  // Extract potential CEP from the address
  const cep = extractCEP(partialAddress);
  
  if (cep) {
    const addressData = await lookupAddressByCEP(cep);
    if (addressData && !addressData.erro) {
      // If we have street name and city info, suggest completion
      const suggestion = `${addressData.logradouro || ''}, ${addressData.bairro || ''}, ${addressData.localidade || ''} - ${addressData.uf || ''}`.replace(/^,\s*|,\s*$/, '');
      return suggestion;
    }
  }
  
  return partialAddress;
};