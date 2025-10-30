import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, X } from 'lucide-react';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface ClientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

export function ClientAutocomplete({ value, onChange, required = false, placeholder = 'Klient suchen...' }: ClientAutocompleteProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value.trim().length === 0) {
      setFilteredClients([]);
      setShowDropdown(false);
      return;
    }

    const searchTerm = value.toLowerCase();
    const filtered = clients.filter(client => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const reverseName = `${client.last_name} ${client.first_name}`.toLowerCase();
      return fullName.includes(searchTerm) ||
             reverseName.includes(searchTerm) ||
             client.first_name.toLowerCase().startsWith(searchTerm) ||
             client.last_name.toLowerCase().startsWith(searchTerm);
    });

    setFilteredClients(filtered.slice(0, 10));
    setShowDropdown(filtered.length > 0);
  }, [value, clients]);

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
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (client: Client) => {
    onChange(`${client.first_name} ${client.last_name}`);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange('');
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showDropdown && filteredClients.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => handleSelect(client)}
              className="w-full px-4 py-2 text-left hover:bg-primary-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">
                {client.last_name}, {client.first_name}
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );
}
