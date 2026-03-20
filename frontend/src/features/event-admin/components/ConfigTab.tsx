import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, CheckCircle, Save, Share2 } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Switch } from '@/shared/components/Switch';
import { useEventAdmin, type AdminTab } from '../hooks/useEventAdmin';
import type { EventFeatures } from '@/shared/lib/api';
import { api } from '@/shared/lib/api';

interface ConfigTabProps {
  slug: string;
  currentTab: AdminTab;
}

export function ConfigTab({ slug }: ConfigTabProps) {
  const { event, refetchEvent } = useEventAdmin(slug);
  const [features, setFeatures] = useState<EventFeatures>({
    quiz: true,
    corkboard: true,
    secretBox: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (event?.features) {
      setFeatures(event.features as EventFeatures);
    }
  }, [event?.features]);

  const handleToggle = (key: keyof EventFeatures) => (checked: boolean) => {
    setFeatures((prev) => ({ ...prev, [key]: checked }));
    setSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.updateEventFeatures(slug, features);
      setSuccess(true);
      refetchEvent();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const eventUrl = `${window.location.origin}/e/${slug}`;
  const adminUrl = `${window.location.origin}/admin/${slug}`;

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display text-gray-800 mb-1">
          Configuración General
        </h2>
        <p className="text-sm text-gray-500">
          {event?.name || slug}
        </p>
      </div>

      {event?.description && (
        <div className="bg-pink-50/50 rounded-xl p-4 border border-pink-100">
          <p className="text-sm text-gray-600">{event.description}</p>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Características
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 bg-pink-50/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-800">Quiz</p>
              <p className="text-sm text-gray-500">Trivia sobre la cumpleañera</p>
            </div>
            <Switch
              checked={features.quiz}
              onChange={handleToggle('quiz')}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-800">Cartelera de Corcho</p>
              <p className="text-sm text-gray-500">Postales de invitados</p>
            </div>
            <Switch
              checked={features.corkboard}
              onChange={handleToggle('corkboard')}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-800">Caja Secreta</p>
              <p className="text-sm text-gray-500">Sorpresas de familiares</p>
            </div>
            <Switch
              checked={features.secretBox}
              onChange={handleToggle('secretBox')}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Enlaces
        </h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-pink-50 rounded-xl px-4 py-3 text-sm text-gray-600 truncate font-mono">
              {eventUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink(eventUrl)}
              icon={copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-purple-50 rounded-xl px-4 py-3 text-sm text-gray-600 truncate font-mono">
              {adminUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink(adminUrl)}
              icon={<Share2 className="w-4 h-4" />}
            >
              Compartir
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Cambios guardados correctamente
        </motion.div>
      )}

      <Button
        variant="primary"
        onClick={handleSave}
        isLoading={isSaving}
        fullWidth
        icon={<Save className="w-4 h-4" />}
        className="bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200"
      >
        Guardar Cambios
      </Button>
    </div>
  );
}
