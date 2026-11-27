import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../../i18n';
import { api, errorMessage } from '../../../lib/api';
import { toast } from '../../../state/useToast';
import { useCurrentEvent } from '../../../state/useCurrentEvent';
import type { EventT } from '../../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EventForm, toFormValues, toPayload } from '../../components/EventForm';
import type { EventFormValues } from '../../components/EventForm';
import { IconCopy } from '../../components/Icons';

export function SettingsTab({ event, onChanged }: { event: EventT; onChanged: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (v: EventFormValues) => {
    setSaving(true);
    try {
      await api.updateEvent(event.id, toPayload(v));
      toast(t('common.saved'), 'ok');
      onChanged();
      useCurrentEvent.getState().load(true);
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    setBusy(true);
    try {
      const copy = await api.duplicateEvent(event.id);
      toast(t('event.duplicated'), 'ok');
      useCurrentEvent.getState().load(true);
      navigate(`/events/${copy.id}?tab=settings`);
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t('event.deleteConfirm', { name: event.name }))) return;
    setBusy(true);
    try {
      await api.deleteEvent(event.id);
      toast(t('common.deleted'), 'ok');
      await useCurrentEvent.getState().load(true);
      navigate('/events');
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!event.public_link) return;
    try {
      await navigator.clipboard.writeText(event.public_link);
      toast(t('common.copied'), 'ok');
    } catch {
      window.prompt(t('event.publicLink'), event.public_link);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title={t('tab.settings')} className="lg:col-span-2">
        <EventForm
          key={event.id}
          formId="event-settings"
          initial={toFormValues(event)}
          onSubmit={save}
          footer={
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>{t('common.save')}</Button>
            </div>
          }
        />
      </Card>
      <div className="space-y-6">
        <Card title={t('event.publicLink')}>
          <p className="text-sm text-soft">{event.is_public ? t('event.publicOn') : t('event.publicOff')}</p>
          {event.public_link && (
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-surface2 px-2 py-1.5 text-xs">{event.public_link}</code>
              <Button size="sm" variant="secondary" onClick={copyLink} aria-label={t('common.copy')}>
                <IconCopy size={16} />
              </Button>
            </div>
          )}
        </Card>
        {event.requests_enabled && event.request_link && (
          <Card title={t('eticket.linkTitle')}>
            <p className="text-sm text-soft">{t('eticket.linkHint')}</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-surface2 px-2 py-1.5 text-xs">{event.request_link}</code>
              <Button
                size="sm"
                variant="secondary"
                aria-label={t('common.copy')}
                onClick={() => navigator.clipboard.writeText(event.request_link!).then(() => toast(t('common.copied'), 'ok'), () => window.prompt(t('eticket.linkTitle'), event.request_link))}
              >
                <IconCopy size={16} />
              </Button>
            </div>
          </Card>
        )}
        <Card title={t('event.duplicate')}>
          <p className="text-sm text-soft">{t('event.duplicateHint')}</p>
          <Button className="mt-3" variant="secondary" onClick={duplicate} loading={busy}>{t('event.duplicate')}</Button>
        </Card>
        <Card title={t('event.delete')}>
          <p className="text-sm text-soft">{t('event.deleteHint')}</p>
          <Button className="mt-3" variant="danger" onClick={remove} loading={busy}>{t('event.delete')}</Button>
        </Card>
      </div>
    </div>
  );
}
