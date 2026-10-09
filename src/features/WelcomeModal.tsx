import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { Modal } from '@/components/ui';
import { LogoMark } from '@/components/Brand';
import { ss } from '@/lib/utils';

const KEY = 'fd_welcome_seen';

/** Aparece ~400ms después del login, una vez por sesión, sobre la Propuesta. NO dispara el tour. */
export function WelcomeModal() {
  const { pathname } = useLocation();
  const trailer = useApp((s) => s.trailer);
  const authed = useApp((s) => s.authed);
  const [open, setOpen] = useState(false);
  const { t } = useT();

  useEffect(() => {
    if (!authed || trailer || pathname !== '/propuesta') return;
    if (ss.get(KEY) === '1') return;
    const id = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(id);
  }, [authed, trailer, pathname]);

  const close = () => {
    ss.set(KEY, '1');
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={close} closeOnBackdrop={false} width={540}>
      <div className="px-1 pb-1 pt-2" data-welcome>
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <span className="text-[16px] font-extrabold tracking-tight text-accent">{t('wel.product')}</span>
        </div>
        <h2 className="mt-5 text-[24px] font-bold tracking-tight text-ink">{t('wel.hello')}</h2>
        <p className="mt-3 text-[15px] font-medium leading-relaxed text-ink">{t('wel.intro')}</p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink2">{t('wel.body')}</p>
        <p className="mt-4 text-[14px] italic text-ink2">{t('wel.cta')}</p>
        <button className="btn-primary mt-6 w-full sm:w-auto" onClick={close} autoFocus>
          {t('wel.button')}
          <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}
