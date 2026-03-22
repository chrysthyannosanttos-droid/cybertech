/**
 * eSocial Engine - Geração de XML (Simplificado)
 * Gera a estrutura básica necessária para comunicação com o eSocial.
 */

export const generateS1000 = (companyData: any) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtInfoEmpregador/v_S_01_01_00">
  <evtInfoEmpregador>
    <ideEvento>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${companyData.cnpj.replace(/\D/g, '')}</nrInsc>
    </ideEmpregador>
    <infoEmpregador>
      <nmRazao>${companyData.name}</nmRazao>
      <nmContato>${companyData.contact || 'RH'}</nmContato>
    </infoEmpregador>
  </evtInfoEmpregador>
</eSocial>`;
};

export const generateS1200 = (employeeData: any, payrollData: any) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtRemun/v_S_01_01_00">
  <evtRemun>
    <ideEvento>
      <indRetif>1</indRetif>
      <perApur>${payrollData.year}-${String(payrollData.month).padStart(2, '0')}</perApur>
    </ideEvento>
    <ideEmpregador>
      <nrInsc>${employeeData.cnpj.replace(/\D/g, '')}</nrInsc>
    </ideEmpregador>
    <ideTrabalhador>
      <cpfTrab>${employeeData.cpf.replace(/\D/g, '')}</cpfTrab>
      <dmDev>
        <ideDmDev>1</ideDmDev>
        <infoPerApur>
          <ideEstabLot>
            <remunPerApur>
              <vrBaseCP>${payrollData.baseSalary}</vrBaseCP>
            </remunPerApur>
          </ideEstabLot>
        </infoPerApur>
      </dmDev>
    </ideTrabalhador>
  </evtRemun>
</eSocial>`;
};
