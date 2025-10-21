import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { Users, Upload, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('last_name')
        .order('first_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      setErrorMessage('Fehler beim Laden der Klienten');
    } finally {
      setLoading(false);
    }
  };

  const parseHtmlFile = (htmlContent: string): { first_name: string; last_name: string }[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const clients: { first_name: string; last_name: string }[] = [];

    const rows = doc.querySelectorAll('table tr');

    rows.forEach((row, index) => {
      if (index === 0) return;

      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const lastName = cells[0]?.textContent?.trim() || '';
        const firstName = cells[1]?.textContent?.trim() || '';

        if (lastName && firstName) {
          clients.push({
            first_name: firstName,
            last_name: lastName,
          });
        }
      }
    });

    return clients;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setErrorMessage('Bitte laden Sie eine HTML-Datei hoch');
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const fileContent = await file.text();
      const parsedClients = parseHtmlFile(fileContent);

      if (parsedClients.length === 0) {
        setErrorMessage('Keine Klienten in der HTML-Datei gefunden. Bitte überprüfen Sie das Format.');
        setUploading(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('clients')
        .insert(parsedClients);

      if (insertError) throw insertError;

      setSuccessMessage(`${parsedClients.length} Klienten erfolgreich importiert`);
      loadClients();
    } catch (error) {
      console.error('Error uploading file:', error);
      setErrorMessage('Fehler beim Importieren der Klienten');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredClients = clients.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Klienten verwalten</h2>
          <p className="text-sm text-gray-600 mt-1">
            Importieren Sie eine HTML-Datei mit der Klientenliste
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-blue-400 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
        >
          <Upload className="w-5 h-5" />
          {uploading ? 'Importiere...' : 'HTML-Datei importieren'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Fehler</p>
            <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-800 font-medium">Erfolgreich</p>
            <p className="text-green-700 text-sm mt-1">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Klient suchen..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {filteredClients.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="font-medium mb-2">
              {searchTerm ? 'Keine Klienten gefunden' : 'Keine Klienten vorhanden'}
            </p>
            {!searchTerm && (
              <p className="text-sm">
                Laden Sie eine HTML-Datei hoch, um Klienten zu importieren
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Nachname
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Vorname
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {client.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {client.first_name}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {clients.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-sm text-gray-600">
            {filteredClients.length} von {clients.length} Klienten
          </div>
        )}
      </div>
    </div>
  );
}
