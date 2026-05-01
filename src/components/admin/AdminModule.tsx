import { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  Key, 
  Plus, 
  ShieldCheck, 
  Pencil,
  Trash2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Usuario = {
  nomeCompleto: string;
  login: string;
  senha: string;
  perfil: string;
  modulos: string[];
};

type LancamentoLicenca = {
  mesReferencia: string;
  valor: number;
  dataLancamento: string;
};

type Empresa = {
  nome: string;
  cnpj: string;
  inicioLicenca: string;
  vencimentoLicenca: string;
  mensalidade: number;
  usuarios: Usuario[];
  historicoLicencas: LancamentoLicenca[];
};


export function AdminModule() {
  const [empresas, setEmpresas] = useState<Empresa[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cybertech_admin_data");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure all empresas have required arrays initialized
        return parsed.map((e: any) => ({
          ...e,
          usuarios: e.usuarios || [],
          historicoLicencas: e.historicoLicencas || [],
        }));
      }
      return [];
    }
    return [];
  });
  
  const [activeTab, setActiveTab] = useState<"empresas" | "usuarios" | "licencas">("empresas");
  
  // Empresa State
  const [empresaNome, setEmpresaNome] = useState("");
  const [empresaCnpj, setEmpresaCnpj] = useState("");
  const [inicioLicenca, setInicioLicenca] = useState("");
  const [vencimentoLicenca, setVencimentoLicenca] = useState("");
  const [mensalidade, setMensalidade] = useState(0);
  
  // Usuario State
  const [usuarioNomeCompleto, setUsuarioNomeCompleto] = useState("");
  const [usuarioLogin, setUsuarioLogin] = useState("");
  const [usuarioSenha, setUsuarioSenha] = useState("");
  const [usuarioPerfil, setUsuarioPerfil] = useState("Empresa");
  const [usuarioModulos, setUsuarioModulos] = useState<string[]>([]);
  
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [qtdLicencas, setQtdLicencas] = useState(0);
  const [mesReferencia, setMesReferencia] = useState(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  });
  
  // Edit state
  const [editingUser, setEditingUser] = useState<{ empresa: string; index: number } | null>(null);

   const MODULOS_SISTEMA = [
    { id: "dashboard", label: "Dashboard", desc: "Visão geral e indicadores principais" },
    { id: "agenda", label: "Agenda", desc: "Gestão de horários e agendamentos" },
    { id: "clientes", label: "Clientes", desc: "Cadastro e histórico de clientes" },
    { id: "financeiro", label: "Financeiro", desc: "Fluxo de caixa, receitas e despesas" },
    { id: "estoque", label: "Estoque", desc: "Controle de produtos e suprimentos" },
    { id: "equipe", label: "Equipe", desc: "Gestão de profissionais e barbeiros" },
    { id: "marketing", label: "Marketing", desc: "Campanhas e fidelização" },
    { id: "configuracoes", label: "Configurações", desc: "Ajustes do sistema e permissões" },
  ];

  // Persistence
  useEffect(() => {
    localStorage.setItem("cybertech_admin_data", JSON.stringify(empresas));
    console.log("Admin Data Updated:", empresas);
  }, [empresas]);

  const addEmpresa = () => {
    if (!empresaNome.trim() || !empresaCnpj.trim()) {
      alert("Nome e CNPJ são obrigatórios.");
      return;
    }
    const exists = empresas.find(e => e.nome.toLowerCase() === empresaNome.toLowerCase() || e.cnpj === empresaCnpj);
    if (exists) {
      alert("Esta empresa ou CNPJ já está cadastrado.");
      return;
    }
    setEmpresas([...empresas, { 
      nome: empresaNome.trim(), 
      cnpj: empresaCnpj.trim(),
      inicioLicenca,
      vencimentoLicenca,
      mensalidade,
      usuarios: [], 
      historicoLicencas: [] 
    }]);
    setEmpresaNome("");
    setEmpresaCnpj("");
    setInicioLicenca("");
    setVencimentoLicenca("");
    setMensalidade(0);
  };

  const addUsuario = () => {
    if (!usuarioNomeCompleto.trim() || !usuarioSenha.trim() || !selectedEmpresa) {
      alert("Preencha o Nome Completo, a Senha e selecione a Empresa.");
      return;
    }

    const novoDados = {
      nomeCompleto: usuarioNomeCompleto.trim(),
      login: usuarioLogin.trim() || usuarioNomeCompleto.toLowerCase().replace(/\s/g, "."),
      senha: usuarioSenha.trim(),
      perfil: usuarioPerfil,
      modulos: usuarioModulos
    };

    if (editingUser) {
      setEmpresas(empresas.map(e => 
        e.nome === selectedEmpresa 
          ? { 
              ...e, 
              usuarios: e.usuarios.map((u, i) => i === editingUser.index ? novoDados : u) 
            } 
          : e
      ));
      setEditingUser(null);
    } else {
      setEmpresas(empresas.map(e => 
        e.nome === selectedEmpresa 
          ? { ...e, usuarios: [...e.usuarios, novoDados] } 
          : e
      ));
    }

    setUsuarioNomeCompleto("");
    setUsuarioLogin("");
    setUsuarioSenha("");
    setUsuarioModulos([]);
  };

  const deleteUsuario = (empresaNome: string, index: number) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    setEmpresas(empresas.map(e => 
      e.nome === empresaNome 
        ? { ...e, usuarios: e.usuarios.filter((_, i) => i !== index) } 
        : e
    ));
  };

  const startEditUsuario = (empresaNome: string, index: number, usuario: Usuario) => {
    setActiveTab("usuarios");
    setSelectedEmpresa(empresaNome);
    setUsuarioNomeCompleto(usuario.nomeCompleto);
    setUsuarioLogin(usuario.login);
    setUsuarioSenha(usuario.senha);
    setUsuarioPerfil(usuario.perfil);
    setUsuarioModulos(usuario.modulos || []);
    setEditingUser({ empresa: empresaNome, index });
  };

  const addLicenca = () => {
    if (!selectedEmpresa) {
      alert("Selecione uma empresa primeiro.");
      return;
    }
    
    setEmpresas(empresas.map(e => {
      if (e.nome === selectedEmpresa) {
        const historico = [...e.historicoLicencas];
        const index = historico.findIndex(l => l.mesReferencia === mesReferencia);
        const novoLancamento = {
          mesReferencia,
          valor: qtdLicencas,
          dataLancamento: new Date().toLocaleDateString("pt-BR")
        };
        
        if (index >= 0) {
          historico[index] = novoLancamento;
        } else {
          historico.push(novoLancamento);
        }
        
        return { ...e, historicoLicencas: historico };
      }
      return e;
    }));
    
    alert(`Lançamento para ${selectedEmpresa} no mês ${mesReferencia} realizado.`);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">SaaS Management</h1>
            <p className="text-muted-foreground mt-1 text-sm italic">
              Controle mestre de empresas e licenças
            </p>
          </div>

          <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl">
            <button 
              onClick={() => setActiveTab("empresas")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "empresas" ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
            >
              <Building2 size={16} />
              Empresas
            </button>
            <button 
              onClick={() => setActiveTab("usuarios")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "usuarios" ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
            >
              <Users size={16} />
              Usuários
            </button>
            <button 
              onClick={() => setActiveTab("licencas")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "licencas" ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
            >
              <Key size={16} />
              Licenças
            </button>
          </div>
        </header>

        <div className="glass-card rounded-3xl p-8">
          {activeTab === "empresas" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="max-w-xl space-y-6">
                <h2 className="text-xl font-bold text-foreground">Cadastrar Empresa Cliente</h2>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Nome da Empresa *</label>
                    <Input 
                      placeholder="Ex: Super Atacado Group" 
                      value={empresaNome}
                      onChange={(e) => setEmpresaNome(e.target.value)}
                      className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">CNPJ *</label>
                    <Input 
                      placeholder="00.000.000/0001-00" 
                      value={empresaCnpj}
                      onChange={(e) => setEmpresaCnpj(e.target.value)}
                      className="bg-white/5 border-white/10 h-10 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Início Licença</label>
                      <Input 
                        type="date"
                        value={inicioLicenca}
                        onChange={(e) => setInicioLicenca(e.target.value)}
                        className="bg-white/5 border-white/10 h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Vencimento Licença</label>
                      <Input 
                        type="date"
                        value={vencimentoLicenca}
                        onChange={(e) => setVencimentoLicenca(e.target.value)}
                        className="bg-white/5 border-white/10 h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Mensalidade (R$)</label>
                    <Input 
                      type="number"
                      placeholder="0.00" 
                      value={mensalidade}
                      onChange={(e) => setMensalidade(parseFloat(e.target.value))}
                      className="bg-white/5 border-white/10 h-10 rounded-xl"
                    />
                  </div>

                  <Button onClick={addEmpresa} className="w-full h-12 gap-2 bg-gradient-cyan rounded-xl text-lg font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all">
                    Cadastrar Empresa
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-8 border-t border-white/5">
                {empresas.map((emp, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-primary/30 transition-all hover:bg-primary/5">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-foreground">{emp.nome}</h3>
                      <button 
                         onClick={() => {
                           if(confirm("Excluir empresa?")) {
                             setEmpresas(empresas.filter((_, idx) => idx !== i));
                           }
                         }}
                         className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{emp.cnpj}</p>
                    <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Usuários:</span>
                        <span className="font-bold text-foreground">{emp.usuarios.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mensalidade:</span>
                        <span className="font-bold text-primary">R$ {(emp.mensalidade || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {empresas.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground italic bg-white/5 rounded-3xl border border-dashed border-white/20">
                    Nenhuma empresa cadastrada. Comece adicionando uma acima.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "usuarios" && (
            <div className="space-y-10 animate-in fade-in duration-500">
               <div className="max-w-4xl space-y-8">
                  <h2 className="text-xl font-bold text-foreground">Gerenciamento de Usuário</h2>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Nome Completo *</label>
                      <Input 
                        placeholder="Ex: Cintia" 
                        value={usuarioNomeCompleto}
                        onChange={(e) => setUsuarioNomeCompleto(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Login (Usuário) *</label>
                      <Input 
                        placeholder="Login para acesso" 
                        value={usuarioLogin}
                        onChange={(e) => setUsuarioLogin(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                      {editingUser ? "Nova Senha (deixe em branco para manter)" : "Senha *"}
                    </label>
                    <div className="relative">
                      <Input 
                        type="password"
                        placeholder="Defina uma senha" 
                        value={usuarioSenha}
                        onChange={(e) => setUsuarioSenha(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 rounded-xl pr-12"
                      />
                      <Key className="absolute right-4 top-3.5 text-muted-foreground/50" size={18} />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Perfil de Acesso</label>
                      <select 
                        value={usuarioPerfil}
                        onChange={(e) => setUsuarioPerfil(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 h-12 rounded-xl px-4 outline-none focus:border-primary transition-all text-foreground"
                      >
                        <option value="Empresa">Empresa</option>
                        <option value="Admin">Admin</option>
                        <option value="Gerente">Gerente</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Empresa Vinculada</label>
                      <select 
                        value={selectedEmpresa}
                        onChange={(e) => setSelectedEmpresa(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 h-12 rounded-xl px-4 outline-none focus:border-primary transition-all text-foreground"
                      >
                        <option value="">Selecione...</option>
                        {empresas.map((e, i) => (
                          <option key={i} value={e.nome}>{e.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Modulos de Acesso */}
                  <div className="space-y-6 pt-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <div>
                        <h3 className="text-base font-bold text-foreground">Módulos de Acesso</h3>
                        <p className="text-xs text-muted-foreground italic">Selecione quais seções este usuário pode ver</p>
                      </div>
                      <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                        <button onClick={() => setUsuarioModulos(MODULOS_SISTEMA.map(m => m.id))} className="text-primary hover:text-primary/80">Tudo</button>
                        <div className="w-[1px] bg-white/10"></div>
                        <button onClick={() => setUsuarioModulos([])} className="text-destructive hover:text-destructive/80">Nenhum</button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                       {MODULOS_SISTEMA.map(mod => {
                         const isActive = usuarioModulos.includes(mod.id);
                         return (
                           <div 
                             key={mod.id} 
                             onClick={() => {
                               setUsuarioModulos(prev => 
                                 prev.includes(mod.id) ? prev.filter(i => i !== mod.id) : [...prev, mod.id]
                               );
                             }}
                             className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${isActive ? "border-primary/50 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.05)]" : "border-white/5 bg-white/2 hover:border-white/20"}`}
                           >
                              <div>
                                <span className={`text-sm font-bold block ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{mod.label}</span>
                                <span className="text-[10px] text-muted-foreground block mt-0.5">{mod.desc}</span>
                              </div>
                              <div className={`w-10 h-5 rounded-full transition-colors relative ${isActive ? "bg-primary" : "bg-white/10"}`}>
                                 <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isActive ? "left-6" : "left-1"}`} />
                              </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button onClick={addUsuario} className="h-12 gap-2 bg-gradient-cyan rounded-xl flex-1 text-base font-bold shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                      {editingUser ? <ShieldCheck size={18} /> : <Plus size={18} />}
                      {editingUser ? "Salvar Alterações" : "Cadastrar Usuário"}
                    </Button>
                    {editingUser && (
                      <Button onClick={() => setEditingUser(null)} variant="ghost" className="h-12 border border-white/10 rounded-xl px-6">
                        Cancelar
                      </Button>
                    )}
                  </div>
               </div>

               <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/2">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider">Usuário</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider">Empresa</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider">Perfil</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {empresas.flatMap(e => e.usuarios.map((u, i) => ({ ...u, empresa: e.nome, index: i, key: `${e.nome}-${i}` }))).map((u) => (
                      <tr key={u.key} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{u.nomeCompleto}</div>
                          <div className="text-xs text-muted-foreground">@{u.login}</div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{u.empresa}</td>
                        <td className="px-6 py-4">
                           <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">{u.perfil}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEditUsuario(u.empresa, u.index, u as Usuario)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-primary transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={() => deleteUsuario(u.empresa, u.index)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-destructive/20 text-destructive transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "licencas" && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="grid gap-6 md:grid-cols-4 items-end">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Empresa</label>
                  <select 
                    value={selectedEmpresa}
                    onChange={(e) => setSelectedEmpresa(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 h-10 rounded-xl px-4 outline-none focus:border-primary/50 transition-all text-foreground"
                  >
                    <option value="">Selecione...</option>
                    {empresas.map((e, i) => (
                      <option key={i} value={e.nome}>{e.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mês Referência</label>
                  <Input 
                    placeholder="MM/AAAA" 
                    value={mesReferencia}
                    onChange={(e) => setMesReferencia(e.target.value)}
                    className="bg-white/5 border-white/10 h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valor (R$)</label>
                  <Input 
                    type="number"
                    value={qtdLicencas}
                    onChange={(e) => setQtdLicencas(parseInt(e.target.value))}
                    className="bg-white/5 border-white/10 h-10 rounded-xl text-primary font-bold"
                  />
                </div>
                <Button onClick={addLicenca} className="h-10 gap-2 bg-gradient-cyan rounded-xl">
                  Lançar Licença
                </Button>
              </div>

              <div className="grid gap-6">
                {empresas.map((emp, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="bg-white/5 px-6 py-4 flex justify-between items-center border-b border-white/5">
                      <h3 className="text-lg font-bold text-foreground">{emp.nome}</h3>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Histórico de Lançamentos</div>
                    </div>
                    <div className="p-0">
                      <table className="w-full text-left text-sm">
                        <thead className="text-muted-foreground text-[10px] uppercase">
                          <tr>
                            <th className="px-6 py-3 font-bold">Mês</th>
                            <th className="px-6 py-3 font-bold">Valor</th>
                            <th className="px-6 py-3 font-bold">Lançado em</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(emp.historicoLicencas || []).map((h, idx) => (
                            <tr key={idx} className="hover:bg-primary/5">
                              <td className="px-6 py-3 font-medium">{h.mesReferencia}</td>
                              <td className="px-6 py-3 text-primary font-bold">R$ {(h.valor || 0).toFixed(2)}</td>
                              <td className="px-6 py-3 text-muted-foreground">{h.dataLancamento}</td>
                            </tr>
                          ))}
                          {(emp.historicoLicencas || []).length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground italic">Nenhum lançamento mensal registrado.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
