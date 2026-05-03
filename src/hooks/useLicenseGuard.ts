/**
 * useLicenseGuard — CyberTech RH
 * Hook de monitoramento contínuo de licença.
 * Camada 2 do sistema de controle: Heartbeat + Realtime Supabase.
 *
 * Funciona tanto no sistema instalado (desktop) quanto na nuvem.
 * - Verifica status a cada 30 minutos
 * - Escuta mudanças em tempo real via Supabase Realtime
 * - Implementa grace period de 3 dias para uso offline
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export type LicenseStatus = 'active' | 'past_due' | 'suspended' | 'checking' | 'offline_grace' | 'offline_blocked';

export interface LicenseInfo {
  status: LicenseStatus;
  expiryDate?: string;
  daysRemaining?: number;
  monthlyFee?: number;
  tenantName?: string;
  blockedReason?: string;
}

const GRACE_PERIOD_DAYS = 3;
const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos
const GRACE_KEY = 'cybertech_license_grace';
const LAST_VALID_KEY = 'cybertech_license_last_valid';

function getGraceData(): { expires: string; status: LicenseStatus } | null {
  try {
    const raw = localStorage.getItem(GRACE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setGraceData(status: LicenseStatus) {
  const expires = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  localStorage.setItem(GRACE_KEY, JSON.stringify({ expires, status }));
  localStorage.setItem(LAST_VALID_KEY, new Date().toISOString());
}

function clearGraceData() {
  localStorage.removeItem(GRACE_KEY);
  localStorage.removeItem(LAST_VALID_KEY);
}

function isGracePeriodValid(): boolean {
  const grace = getGraceData();
  if (!grace) return false;
  return new Date(grace.expires) > new Date();
}

export function useLicenseGuard(tenantId: string | undefined, isSuperAdmin: boolean) {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>({ status: 'checking' });
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const checkLicense = useCallback(async (tenantId: string): Promise<LicenseInfo> => {
    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('name, subscription, plan')
        .eq('id', tenantId)
        .maybeSingle();

      if (error || !tenant) {
        // Falha na consulta — verificar grace period offline
        if (isGracePeriodValid()) {
          return { status: 'offline_grace', blockedReason: 'Sem conexão com o servidor. Modo offline ativo.' };
        }
        return {
          status: 'offline_blocked',
          blockedReason: `Sem conexão com o servidor de licenças por mais de ${GRACE_PERIOD_DAYS} dias. Entre em contato com a CyberTech.`,
        };
      }

      const sub = tenant.subscription || {};
      const status: LicenseStatus = sub.status || 'active';
      const expiryDate: string = sub.expiryDate || '';
      const monthlyFee: number = sub.monthlyFee || 0;

      // Calcular dias restantes
      let daysRemaining: number | undefined;
      if (expiryDate) {
        const diff = new Date(expiryDate).getTime() - Date.now();
        daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      const info: LicenseInfo = {
        status,
        expiryDate,
        daysRemaining,
        monthlyFee,
        tenantName: tenant.name,
      };

      if (status === 'active') {
        // Renovar grace period enquanto ativo
        setGraceData('active');
      } else if (status === 'suspended') {
        info.blockedReason = `O acesso da empresa "${tenant.name}" está suspenso. Entre em contato com a CyberTech para regularizar.`;
        clearGraceData();
      } else if (status === 'past_due') {
        // Vencido mas não suspenso ainda — grace period ativo
        setGraceData('past_due');
        info.blockedReason = `A licença da empresa "${tenant.name}" está vencida. Regularize o pagamento para continuar usando.`;
      }

      return info;
    } catch {
      if (isGracePeriodValid()) {
        return { status: 'offline_grace', blockedReason: 'Sem conexão com o servidor. Modo offline ativo.' };
      }
      return {
        status: 'offline_blocked',
        blockedReason: `Período de uso offline esgotado. Conecte-se à internet para validar sua licença.`,
      };
    }
  }, []);

  useEffect(() => {
    // Superadmin nunca é bloqueado
    if (isSuperAdmin) {
      setLicenseInfo({ status: 'active' });
      return;
    }

    // Sem tenant (usuário sem empresa) — não bloqueia
    if (!tenantId) {
      setLicenseInfo({ status: 'active' });
      return;
    }

    // Verificação inicial
    checkLicense(tenantId).then(setLicenseInfo);

    // Heartbeat a cada 30 minutos
    heartbeatRef.current = setInterval(async () => {
      const info = await checkLicense(tenantId);
      setLicenseInfo(info);
    }, HEARTBEAT_INTERVAL_MS);

    // Realtime: mudança instantânea de status
    channelRef.current = supabase
      .channel(`license_watch_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          table: 'tenants',
          schema: 'public',
          filter: `id=eq.${tenantId}`,
        },
        async (payload) => {
          console.log('🔔 Mudança de licença detectada em tempo real:', payload.new);
          const info = await checkLicense(tenantId);
          setLicenseInfo(info);
        }
      )
      .subscribe();

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [tenantId, isSuperAdmin, checkLicense]);

  return licenseInfo;
}
