import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users } from 'lucide-react';
import ClientImport from './ClientImport';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  vorname?: string;
  nachname?: string;
  email?: string;
  telefon?: string;
  ort?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nachname')
        .order('vorname');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const fullName = `${client.vorname || client.first_name} ${client.nachname || client.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Klienten verwalten</h2>
        <p className="text-sm text-gray-600">
          Importieren Sie eine clients.json Datei mit der Klientenliste
        </p>
      </div>

      <ClientImport />

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
                Laden Sie eine JSON-Datei hoch, um Klienten zu importieren
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Ort
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Telefon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {client.nachname || client.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {client.vorname || client.first_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {client.ort || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {client.telefon || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {client.status || '-'}
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
