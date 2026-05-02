import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export function BrandingStyles() {
  const { user } = useAuth();
  const isEnterprise = user?.plan === 'ENTERPRISE';
  const branding = isEnterprise ? user?.tenantBranding : undefined;

  useEffect(() => {
    if (branding?.primary_color) {
      const hexToHsl = (hex: string) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
          r = parseInt(hex[1] + hex[1], 16);
          g = parseInt(hex[2] + hex[2], 16);
          b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
          r = parseInt(hex.substring(1, 3), 16);
          g = parseInt(hex.substring(3, 5), 16);
          b = parseInt(hex.substring(5, 7), 16);
        }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        const hVal = Math.round(h * 360);
        const sVal = Math.round(s * 100);
        const lVal = Math.round(l * 100);
        return { 
          full: `${hVal} ${sVal}% ${lVal}%`,
          foreground: l > 0.6 ? '0 0% 0%' : '0 0% 100%',
          muted: `${hVal} ${sVal}% ${Math.max(10, lVal - 10)}%`,
          ring: `${hVal} ${sVal}% ${lVal}%`
        };
      };

      if (branding.primary_color.startsWith('#')) {
        const hsl = hexToHsl(branding.primary_color);
        document.documentElement.style.setProperty('--primary', hsl.full);
        document.documentElement.style.setProperty('--primary-foreground', hsl.foreground);
        document.documentElement.style.setProperty('--ring', hsl.ring);
      } else {
        document.documentElement.style.setProperty('--primary', branding.primary_color);
      }
    } else {
      // Default primary (blue-ish)
      document.documentElement.style.setProperty('--primary', '221 83% 53%');
      document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
      document.documentElement.style.setProperty('--ring', '221 83% 53%');
    }

    if (branding?.system_name) {
      document.title = branding.system_name;
    } else {
      document.title = 'CyberTech RH';
    }

    // Dynamic Favicon
    if (branding?.logo_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = branding.logo_url;
    }

    // Dynamic Background for the system
    if (branding?.background_url) {
      // Pre-load to avoid flash
      const img = new Image();
      img.src = branding.background_url;
      img.onload = () => {
        document.documentElement.style.setProperty('--tenant-bg', `url('${branding.background_url}')`);
      };
    } else {
      document.documentElement.style.removeProperty('--tenant-bg');
    }
  }, [branding]);

  return null;
}
