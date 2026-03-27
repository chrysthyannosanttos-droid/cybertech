
const isValidCPF = (cpf) => {
  if (!cpf) return false;
  const cleanCPF = String(cpf).replace(/[^\d]+/g, '');
  if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) return false;
  const split = cleanCPF.split('');
  let v1 = 0, v2 = 0;
  for (let i = 0, p = 10; i < 9; i++, p--) v1 += parseInt(split[i]) * p;
  v1 = ((v1 * 10) % 11) % 10;
  if (parseInt(split[9]) !== v1) return false;
  for (let i = 0, p = 11; i < 10; i++, p--) v2 += parseInt(split[i]) * p;
  v2 = ((v2 * 10) % 11) % 10;
  return parseInt(split[10]) === v2;
}

const parseNumeric = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
  return isNaN(Number(str)) ? 0 : Number(str);
}

const parseExcelDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const parts = val.split(/[/-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return val;
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return null;
}

const MOCK_MAPPING = {
    name: 'Nome',
    cpf: 'Documento',
    admission_date: 'Admissão'
};

const MOCK_ROWS = [
    { 'Nome': 'João Silva', 'Documento': '123.456.789-01', 'Admissão': '20/03/2024' },
    { 'Nome': 'Maria Oliveira', 'Documento': '98765432100', 'Admissão': 45371 }, // Excel date
    { 'Nome': 'Inválido', 'Documento': '123', 'Admissão': null }, // Error case
];

const processed = MOCK_ROWS.map((row, index) => {
    const rowData = { _originalIndex: index + 1, _errors: {} };
    Object.entries(MOCK_MAPPING).forEach(([key, fileCol]) => {
        let val = fileCol ? row[fileCol] : null;
        if (key === 'salary') val = parseNumeric(val);
        if (key.includes('date')) val = parseExcelDate(val);
        if (key === 'name' && val) val = String(val).trim().toUpperCase();
        if (key === 'cpf' && val) val = String(val).replace(/\D/g, '');
        rowData[key] = val;
    });
    
    // Validation
    if (!rowData.name || rowData.name.length < 2) rowData._errors.name = 'Nome inválido';
    if (!rowData.cpf || !isValidCPF(rowData.cpf)) rowData._errors.cpf = 'CPF inválido';
    if (!rowData.admission_date) rowData._errors.admission_date = 'Data de admissão obrigatória';
    
    return rowData;
});

console.log('Processed Rows:');
console.log(JSON.stringify(processed, null, 2));

const validRows = processed.filter(r => Object.keys(r._errors).length === 0);
console.log('Valid Rows Count:', validRows.length);
console.log('Error Rows Count:', processed.length - validRows.length);
