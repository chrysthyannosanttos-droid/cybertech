import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addAuditLog } from '@/data/mockData';

export function useEmployees(tenantId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['employees', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data: storesData } = await supabase.from('stores').select('id, name');
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map((emp) => ({
        ...emp,
        storeName: storesData?.find((s) => s.id === emp.store_id)?.name || 'Unidade Desconhecida',
        admissionDate: emp.admission_date,
        birthDate: emp.birth_date,
        tenantId: emp.tenant_id,
        storeId: emp.store_id,
        contaItau: emp.conta_itau,
        valeFlexivel: emp.vale_flexivel,
        valeTransporte: emp.vale_transporte,
        valeRefeicao: emp.vale_refeicao,
        insalubridade: emp.insalubridade,
        periculosidade: emp.periculosidade,
        gratificacao: emp.gratificacao,
        flexivel: emp.flexivel,
        mobilidade: emp.mobilidade,
        adicionalNoturno: emp.adicional_noturno,
        flexivelSelo: emp.flexivel_selo,
        email: emp.email,
        phone: emp.phone,
      })) as Employee[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (newEmployee: Partial<Employee>) => {
      const { error } = await supabase.from('employees').insert([newEmployee]);
      if (error) throw error;
      return newEmployee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', tenantId] });
      toast({ title: 'Funcionário cadastrado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      const { error } = await supabase.from('employees').update(data).eq('id', id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', tenantId] });
      toast({ title: 'Funcionário atualizado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', tenantId] });
      toast({ title: 'Funcionário excluído' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  });

  return {
    employees: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    createEmployee: createMutation.mutateAsync,
    updateEmployee: updateMutation.mutateAsync,
    deleteEmployee: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
