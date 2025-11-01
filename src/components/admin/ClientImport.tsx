import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ClientData {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: string;
  email: string;
  telefon: string;
  strasse: string;
  plz: string;
  ort: string;
  status: string;
  betreuer_firma: string;
}

export default function ClientImport() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const clients: ClientData[] = JSON.parse(text);

      const activeClients = clients.filter(client =>
        client.status && client.status.toLowerCase() === 'aktiv'
      );

      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        setResult({
          success: 0,
          errors: [`Fehler beim Löschen bestehender Klienten: ${deleteError.message}`]
        });
        return;
      }

      const errors: string[] = [];
      let successCount = 0;

      for (const client of activeClients) {
        try {
          const { error } = await supabase.from('clients').insert({
            id: client.id,
            vorname: client.vorname || '',
            nachname: client.nachname || '',
            geburtsdatum: client.geburtsdatum || '',
            geschlecht: client.geschlecht || '',
            email: client.email || '',
            telefon: client.telefon || '',
            strasse: client.strasse || '',
            plz: client.plz || '',
            ort: client.ort || '',
            status: client.status || 'aktiv',
            betreuer_firma: client.betreuer_firma || '',
            first_name: client.vorname || '',
            last_name: client.nachname || ''
          });

          if (error) {
            errors.push(`${client.vorname} ${client.nachname}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errors.push(`${client.vorname} ${client.nachname}: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
        }
      }

      setResult({ success: successCount, errors });
      window.location.reload();
    } catch (error) {
      setResult({
        success: 0,
        errors: [`Fehler beim Lesen der Datei: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`]
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Klienten importieren</h2>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Laden Sie eine clients.json Datei hoch, um Klienten zu importieren.
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
          <li>Alle bestehenden Klienten werden gelöscht</li>
          <li>Nur Klienten mit Status "aktiv" werden importiert</li>
          <li>Sensible Daten (SVNR, Pflegestufe, etc.) werden nicht gespeichert</li>
        </ul>
      </div>

      <div className="mb-4">
        <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
          <div className="flex flex-col items-center">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-600">
              {importing ? 'Importiere...' : 'clients.json hochladen'}
            </span>
          </div>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>

      {result && (
        <div className="mt-4">
          {result.success > 0 && (
            <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg mb-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900">
                  {result.success} Klient{result.success !== 1 ? 'en' : ''} erfolgreich importiert
                </p>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="flex items-start gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 mb-2">
                  {result.errors.length} Fehler:
                </p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {result.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li className="font-medium">
                      ... und {result.errors.length - 10} weitere
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
