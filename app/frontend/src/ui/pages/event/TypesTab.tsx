import { useState } from 'react';
import type { FormEvent } from 'react';
import { useT } from '../../../i18n';
import { api, errorMessage } from '../../../lib/api';
import { toast } from '../../../state/useToast';
import type { EventT, TicketTypeT } from '../../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { IconPlus } from '../../components/Icons';

export function TypesTab({ event, onChanged }: { event: EventT; onChanged: () => void }) {
  const t = useT();
  const [editing, setEditing] = useState<Partial<TicketTypeT> | null>(null);
  const types = event.ticket_types ?? [];

  const remove = async (ty: TicketTypeT) => {
    if (!window.confirm(t('types.deleteConfirm', { name: ty.name }))) return;
    try {
      await api.deleteTicketType(ty.id);
      toast(t('common.deleted'), 'ok');
      onChanged();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    }
  };

  return (
    <Card
      title={t('tab.types')}
      subtitle={t('types.subtitle')}
      actions={
        <Button size="sm" onClick={() => setEditing({ name: '', capacity: null })}>
          <IconPlus size={16} /> {t('types.add')}
        </Button>
      }
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-line">
        {types.map((ty) => (
          <li key={ty.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <div className="font-semibold">{ty.name}</div>
              <div className="text-xs text-soft">{ty.capacity ? t('types.limit', { n: ty.capacity }) : t('types.noLimit')}</div>
            </div>
            <div className="flex gap-3">
              <button type="button" className="text-sm font-semibold text-accent hover:underline" onClick={() => setEditing(ty)}>
                {t('common.edit')}
              </button>
              <button type="button" className="text-sm font-semibold text-danger hover:underline" onClick={() => remove(ty)}>
                {t('common.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editing && <TypeModal event={event} type={editing} onClose={() => setEditing(null)} onSaved={onChanged} />}
    </Card>
  );
}

function TypeModal({ event, type, onClose, onSaved }: { event: EventT; type: Partial<TicketTypeT>; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [name, setName] = useState(type.name ?? '');
  const [capacity, setCapacity] = useState(type.capacity ? String(type.capacity) : '');
  const [saving, setSaving] = useState(false);

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const payload = { event_id: event.id, name: name.trim(), kind: 'free', price: 0, capacity: capacity ? Number(capacity) : null };
    try {
      if (type.id) await api.updateTicketType(type.id, payload);
      else await api.createTicketType(payload);
      toast(t('common.saved'), 'ok');
      onSaved();
      onClose();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={type.id ? t('types.edit') : t('types.add')}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => save()} loading={saving} disabled={!name.trim()}>{t('common.save')}</Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <Input label={t('field.name')} value={name} maxLength={255} onChange={(e) => setName(e.target.value)} placeholder={t('types.namePlaceholder')} />
        <Input label={t('field.limitOptional')} type="number" min={0} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} hint={t('types.limitHint')} />
      </form>
    </Modal>
  );
}
