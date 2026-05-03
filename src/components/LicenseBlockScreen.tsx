/**
 * LicenseBlockScreen — CyberTech RH
 * Tela de bloqueio exibida quando a licença está suspensa, vencida ou offline bloqueada.
 * Impede qualquer navegação no sistema até que a situação seja regularizada.
 */

import { ShieldX, Clock, WifiOff, Phone, Mail, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LicenseInfo } from '@/hooks/useLicenseGuard';
import { useAuth } from '@/contexts/AuthContext';

interface LicenseBlockScreenProps {
  licenseInfo: LicenseInfo;
  onRetry?: () => void;
}

const WHATSAPP_NUMBER = '5511999999999'; // Substitua pelo número da CyberTech
const SUPPORT_EMAIL = 'suporte@cybertech.com.br';

export function LicenseBlockScreen({ licenseInfo, onRetry }: LicenseBlockScreenProps) {
  const { logout } = useAuth();

  const isOffline = licenseInfo.status === 'offline_blocked' || licenseInfo.status === 'offline_grace';
  const isSuspended = licenseInfo.status === 'suspended';
  const isPastDue = licenseInfo.status === 'past_due';

  const icon = isOffline
    ? <WifiOff className="w-16 h-16 text-amber-400" />
    : isSuspended
    ? <ShieldX className="w-16 h-16 text-rose-400" />
    : <Clock className="w-16 h-16 text-amber-400" />;

  const titleColor = isSuspended ? 'text-rose-400' : 'text-amber-400';
  const borderColor = isSuspended ? 'border-rose-500/30' : 'border-amber-500/30';
  const bgGlow = isSuspended
    ? 'shadow-[0_0_80px_rgba(244,63,94,0.15)]'
    : 'shadow-[0_0_80px_rgba(245,158,11,0.15)]';

  const title = isOffline
    ? (licenseInfo.status === 'offline_grace' ? 'Modo Offline Temporário' : 'Conexão Necessária')
    : isSuspended
    ? 'Acesso Suspenso'
    : 'Licença Vencida';

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Olá! Preciso regularizar a licença da empresa ${licenseInfo.tenantName || ''} no sistema CyberTech RH.`
  )}`;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0a0f1d]" style={{ pointerEvents: 'all' }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-20 ${isSuspended ? 'bg-rose-500' : 'bg-amber-500'}`} />
      </div>

      <div className={`relative w-full max-w-lg mx-4 rounded-3xl border ${borderColor} bg-white/[0.03] backdrop-blur-2xl p-10 text-center ${bgGlow}`}>
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img src="/logo-cybertech.png" alt="CyberTech RH" className="h-10 opacity-80" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>

        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className={`p-4 rounded-2xl ${isSuspended ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
            {icon}
          </div>
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-black tracking-tight mb-3 ${titleColor}`}>{title}</h1>

        {/* Main message */}
        <p className="text-[14px] text-white/70 leading-relaxed mb-6">
          {licenseInfo.blockedReason || 'Houve um problema com sua licença. Entre em contato com o suporte.'}
        </p>

        {/* License details card */}
        {(licenseInfo.expiryDate || licenseInfo.monthlyFee) && (
          <div className={`mb-6 p-4 rounded-2xl ${isSuspended ? 'bg-rose-500/5 border border-rose-500/10' : 'bg-amber-500/5 border border-amber-500/10'}`}>
            <div className="grid grid-cols-2 gap-3 text-left">
              {licenseInfo.tenantName && (
                <div className="col-span-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Empresa</p>
                  <p className="text-[13px] text-white font-semibold">{licenseInfo.tenantName}</p>
                </div>
              )}
              {licenseInfo.expiryDate && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Vencimento</p>
                  <p className="text-[13px] text-white font-semibold">
                    {new Date(licenseInfo.expiryDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              {licenseInfo.monthlyFee && licenseInfo.monthlyFee > 0 && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Mensalidade</p>
                  <p className="text-[13px] text-white font-semibold">
                    {licenseInfo.monthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Offline grace period notice */}
        {licenseInfo.status === 'offline_grace' && (
          <div className="mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-[12px] text-amber-300">
              Você está usando o período de tolerância offline (3 dias). Conecte-se à internet para validar sua licença.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {isOffline && onRetry && (
            <Button
              onClick={onRetry}
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Reconectar
            </Button>
          )}

          {!isOffline && (
            <>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2">
                  <Phone className="w-4 h-4" />
                  Contatar Suporte via WhatsApp
                </Button>
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Regularização de Licença - ${licenseInfo.tenantName || ''}`} className="block">
                <Button variant="outline" className="w-full h-11 border-white/10 text-white/70 hover:text-white font-bold gap-2">
                  <Mail className="w-4 h-4" />
                  Enviar E-mail ao Suporte
                </Button>
              </a>
            </>
          )}

          <Button
            variant="ghost"
            onClick={logout}
            className="w-full h-9 text-white/30 hover:text-white/60 text-[12px]"
          >
            Sair do sistema
          </Button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-[10px] text-white/20">
          CyberTech RH · Sistema de Gestão de Recursos Humanos
        </p>
      </div>
    </div>
  );
}
