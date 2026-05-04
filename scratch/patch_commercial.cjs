const fs = require('fs');
const path = 'src/pages/Commercial.tsx';
let content = fs.readFileSync(path, 'utf8');

// Define o novo bloco para o Servidor Nuvem
const newCloudBlock = `                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-xl flex justify-between items-center border border-primary/20">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase text-primary">Investimento Setup</span>
                      <p className="text-[9px] text-muted-foreground uppercase">Pago apenas uma vez</p>
                    </div>
                    <span className="text-xl font-black text-white">R$ {Number(pricing.cloud.setup).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Mensalidade Base</span>
                    <span className="text-xl font-black text-white">R$ {calculateMonthlyTotal('cloud').toLocaleString('pt-BR')}</span>
                  </div>
                  {selectedModules.length > 0 && (
                    <div className="px-4 py-2 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Com todos os módulos:</span>
                      <span className="text-sm font-black text-primary">R$ {calculateFullTotal('cloud').toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>`;

// Define o novo bloco para o Servidor Local
const newLocalBlock = `                <div className="space-y-4">
                  <div className="p-4 bg-white/10 rounded-xl flex justify-between items-center border border-white/20">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase text-white">Investimento Setup</span>
                      <p className="text-[9px] text-muted-foreground uppercase">Pago apenas uma vez</p>
                    </div>
                    <span className="text-xl font-black text-white">R$ {Number(pricing.local.setup).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Mensalidade Base</span>
                    <span className="text-xl font-black text-white">R$ {calculateMonthlyTotal('local').toLocaleString('pt-BR')}</span>
                  </div>
                  {selectedModules.length > 0 && (
                    <div className="px-4 py-2 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Com todos os módulos:</span>
                      <span className="text-sm font-black text-primary">R$ {calculateFullTotal('local').toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>`;

// Regex para encontrar as seções de "Total Mensal" e substituir
const cloudRegex = /<div className="p-4 bg-primary\/10 rounded-xl flex justify-between items-center">[\s\S]*?calculateMonthlyTotal\('cloud'\)[\s\S]*?<\/div>/;
const localRegex = /<div className="p-4 bg-white\/5 rounded-xl flex justify-between items-center">[\s\S]*?calculateMonthlyTotal\('local'\)[\s\S]*?<\/div>/;

if (content.match(cloudRegex)) {
  console.log('Encontrado bloco Cloud. Substituindo...');
  content = content.replace(cloudRegex, newCloudBlock);
} else {
  console.log('Bloco Cloud NÃO encontrado via regex.');
}

if (content.match(localRegex)) {
  console.log('Encontrado bloco Local. Substituindo...');
  content = content.replace(localRegex, newLocalBlock);
} else {
  console.log('Bloco Local NÃO encontrado via regex.');
}

fs.writeFileSync(path, content);
console.log('Fim do script de patch.');
