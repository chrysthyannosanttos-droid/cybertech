import { MOCK_STORES } from '@/data/mockData';
import { MOCK_EMPLOYEES } from '@/data/mockData';
import { Store, MapPin } from 'lucide-react';

export default function Stores() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Lojas</h1>
        <p className="text-[13px] text-muted-foreground">Unidades pré-cadastradas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_STORES.map((store, i) => {
          const empCount = MOCK_EMPLOYEES.filter(e => e.storeId === store.id).length;
          return (
            <div key={store.id} className={`bg-card rounded-lg shadow-card p-5 animate-fade-in-up stagger-${i + 1}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                  <Store className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{store.name}</p>
                  <p className="text-[11px] font-mono-data text-muted-foreground">{store.cnpj}</p>
                </div>
              </div>
              <div className="divider mb-3" />
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Funcionários</span>
                <span className="font-semibold tabular-nums">{empCount}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
