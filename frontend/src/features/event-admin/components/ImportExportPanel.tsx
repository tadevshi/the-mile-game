import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/shared';
import type { PreviewTheme } from '@/themes';

interface ImportResult {
  imported: number;
  warnings?: string[];
}

interface ImportExportPanelProps {
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<ImportResult>;
  isExporting?: boolean;
  isImporting?: boolean;
  questionCount: number;
  theme: PreviewTheme;
}

export function ImportExportPanel({
  onExport,
  onImport,
  isExporting = false,
  isImporting = false,
  questionCount,
  theme,
}: ImportExportPanelProps) {
  const isDarkTheme = theme.backgroundStyle === 'dark';
  const panelSurface = isDarkTheme ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.8)';
  const headingColor = theme.textColor;
  const mutedText = isDarkTheme ? 'rgba(226, 232, 240, 0.72)' : 'rgba(156, 163, 175, 1)';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await onImport(file);
      setImportResult(result);
      
      // Clear result after 5 seconds
      setTimeout(() => setImportResult(null), 5000);
    } catch {
      setImportResult({ imported: 0 });
      setTimeout(() => setImportResult(null), 5000);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="backdrop-blur-sm rounded-2xl border border-[var(--color-secondary)] p-4" style={{ backgroundColor: panelSurface }}>
      <h3 className="font-display mb-4" style={{ color: headingColor }}>Importar / Exportar</h3>

      <div className="flex flex-wrap gap-3">
        {/* Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting || questionCount === 0}
          icon={<Download size={16} />}
        >
          {isExporting ? 'Exportando...' : 'Exportar JSON'}
        </Button>

        {/* Import Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportClick}
          disabled={isImporting}
          icon={<Upload size={16} />}
        >
          {isImporting ? 'Importando...' : 'Importar JSON'}
        </Button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Import Result */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-4 p-3 rounded-xl flex items-start gap-2 ${
              importResult.imported > 0
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {importResult.imported > 0 ? (
              <Check size={18} className="text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle size={18} className="text-red-600 mt-0.5" />
            )}
            <div>
              {importResult.imported > 0 ? (
                <>
                  <p className="text-sm font-medium text-green-800">
                    {importResult.imported} pregunta(s) importadas
                  </p>
                  {importResult.warnings && importResult.warnings.length > 0 && (
                    <ul className="text-xs text-green-700 mt-1 list-disc list-inside">
                      {importResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm font-medium text-red-800">
                  Error al importar preguntas
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs mt-3" style={{ color: mutedText }}>
        Formato: JSON array de preguntas. Las preguntas existentes no se sobrescriben.
      </p>
    </div>
  );
}
