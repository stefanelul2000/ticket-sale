import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n, useT } from '../../../i18n';
import { api, errorMessage } from '../../../lib/api';
import { fmtTime, fmtWeekdayDate } from '../../../lib/format';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Misc';
import { IconPlus } from '../../components/Icons';
import { PublicNotFound } from './PublicEventPage';
import type { PublicEvent } from './PublicEventPage';

export function PublicRequestPage() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const { slug } = useParams();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [missing, setMissing] = useState(false);
  const [names, setNames] = useState<string[]>(['']);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.publicEvent(slug).then(setEvent).catch(() => setMissing(true));
  }, [slug]);

  if (missing) return <PublicNotFound />;
  if (!event) return <Loading />;

  const max = event.request_max ?? 4;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.publicRequest(event.slug, {
        attendees: names.map((n) => n.trim()).filter(Boolean),
        email: email.trim(),
        phone: phone.trim() || null,
        message: message.trim() || null,
        consent,
        locale: lang,
        website,
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(errorMessage(err, t('common.error')));
    } finally {
      setSending(false);
    }
  };

  const header = (
    <div className="bg-navy px-6 py-7 text-white sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-sky">{t('req.kicker')}</p>
      <h1 className="mt-1 font-display text-3xl font-bold leading-tight">{event.name}</h1>
      {event.starts_at && (
        <p className="mt-2 text-white/85">
          {fmtWeekdayDate(event.starts_at)}, {fmtTime(event.starts_at)}
          {event.venue ? ` · ${event.venue}` : ''}
        </p>
      )}
    </div>
  );

  if (done) {
    return (
      <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {header}
        <div className="space-y-3 px-6 py-8 sm:px-8">
          <h2 className="text-2xl font-bold text-ok">{t('req.doneTitle')}</h2>
          <p>{t('req.doneText', { email: email.trim() })}</p>
          <p className="text-sm text-soft">{t('req.doneHint')}</p>
          <Link to={`/e/${event.slug}`} className="inline-block pt-2 font-semibold text-accent hover:underline">← {t('req.backToEvent')}</Link>
        </div>
      </article>
    );
  }

  if (!event.requests_open) {
    return (
      <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {header}
        <div className="px-6 py-8 sm:px-8">
          <h2 className="text-xl font-bold">{event.requests_enabled ? t('req.fullTitle') : t('req.closedTitle')}</h2>
          <p className="mt-2 text-soft">{t('req.fullText')}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      {header}
      <form onSubmit={submit} className="space-y-5 px-6 py-7 sm:px-8">
        <p className="text-soft">{t('req.intro', { max })}</p>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-semibold">{t('req.names')}</legend>
          {names.map((n, i) => (
            <div key={i} className="flex items-end gap-2">
              <Input
                wrapperClassName="flex-1"
                aria-label={t('req.personN', { n: i + 1 })}
                placeholder={t('req.personN', { n: i + 1 })}
                value={n}
                required
                maxLength={120}
                autoComplete={i === 0 ? 'name' : 'off'}
                onChange={(e) => setNames((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
              />
              {names.length > 1 && (
                <Button variant="ghost" onClick={() => setNames((list) => list.filter((_, j) => j !== i))} aria-label={t('common.delete')}>
                  ✕
                </Button>
              )}
            </div>
          ))}
          {names.length < max && (
            <Button variant="secondary" size="sm" onClick={() => setNames((list) => [...list, ''])}>
              <IconPlus size={16} /> {t('req.addPerson')}
            </Button>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('req.email')} type="email" required autoComplete="email" maxLength={190} value={email} onChange={(e) => setEmail(e.target.value)} hint={t('req.emailHint')} />
          <Input label={t('req.phone')} type="tel" autoComplete="tel" maxLength={25} value={phone} onChange={(e) => setPhone(e.target.value)} hint={t('req.phoneHint')} />
        </div>
        <Textarea label={t('req.message')} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[72px]" />

        {/* Honeypot: hidden from people, irresistible for bots. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--a-accent)]" />
          <span>{t('req.consent')}</span>
        </label>

        {error && <p className="rounded bg-dangerbg px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
        <Button type="submit" size="lg" loading={sending} className="w-full sm:w-auto">
          {t('req.submit')}
        </Button>
      </form>
    </article>
  );
}
