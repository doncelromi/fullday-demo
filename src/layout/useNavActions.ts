import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store';
import { tr, en } from '@/i18n';
import { ROLE_HOME } from '@/config/nav';
import type { Role } from '@/types';

/** Acciones de navegación compartidas: cambiar rol en vivo, ir por menú (cancela previsualización). */
export function useNavActions() {
  const navigate = useNavigate();
  const switchRole = useCallback(
    (r: Role) => {
      const s = useApp.getState();
      s.cancelarPreview();
      s.setRole(r);
      navigate(ROLE_HOME[r]);
      s.toast(tr('top.roleSwitched', s.lang, { role: en('role', r, s.lang) }), 'info');
    },
    [navigate],
  );
  const goMenu = useCallback(
    (path: string) => {
      useApp.getState().cancelarPreview();
      navigate(path);
    },
    [navigate],
  );
  return { switchRole, goMenu };
}

export function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return 'greet.morning';
  if (h < 20) return 'greet.afternoon';
  return 'greet.evening';
}
